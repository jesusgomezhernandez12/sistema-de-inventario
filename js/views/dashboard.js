const DashboardView = {
    render(data) {
        const { stats, medicamentos, actividades } = data;
        const totalMedicamentos = stats.totalMedicamentos || medicamentos.length;
        const totalVacunas = stats.totalVacunas || medicamentos.filter(m => m.tipo === 'vacuna').length;
        const proximosCaducar = stats.proximosCaducar || medicamentos.filter(m => {
            const days = App.daysUntilExpiry(m.fechaCaducidad);
            return days <= 90 && days >= 0;
        }).length;
        const caducados = stats.caducados || medicamentos.filter(m => App.daysUntilExpiry(m.fechaCaducidad) < 0).length;
        const recentActivities = (actividades || []).slice(0, 5);

        return `
            <div class="fade-in">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-pills"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${totalMedicamentos}</div>
                            <div class="stat-label">Total Medicamentos</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon purple"><i class="fas fa-syringe"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${totalVacunas}</div>
                            <div class="stat-label">Total Vacunas</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${proximosCaducar}</div>
                            <div class="stat-label">Próximos a Caducar (90 días)</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${caducados}</div>
                            <div class="stat-label">Caducados</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-history mr-2"></i>Actividad Reciente</h3>
                        <a href="#registro-actividades" class="btn btn-sm btn-outline">Ver todo</a>
                    </div>
                    <div class="card-body p-0">
                        ${recentActivities.length > 0 ? `
                            <div class="activity-feed">
                                ${recentActivities.map(act => this.renderActivityItem(act)).join('')}
                            </div>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-history"></i>
                                <h3>No hay actividad reciente</h3>
                                <p>Las actividades aparecerán aquí cuando se realicen acciones</p>
                            </div>
                        `}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-exclamation-triangle mr-2"></i>Alertas de Caducidad</h3>
                        <a href="#por-caducar" class="btn btn-sm btn-outline">Ver todo</a>
                    </div>
                    <div class="card-body p-0">
                        ${this.renderExpiryAlerts(medicamentos)}
                    </div>
                </div>
            </div>
        `;
    },

    renderActivityItem(act) {
        const iconClass = this.getActivityIconClass(act.tipo);
        const icon = this.getActivityIcon(act.tipo);
        return `
            <div class="activity-item">
                <div class="activity-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                <div class="activity-content">
                    <div class="activity-title">${act.descripcion}</div>
                    <div class="activity-meta">${App.formatDateTime(act.fecha)} - ${act.usuario}</div>
                </div>
            </div>
        `;
    },

    getActivityIconClass(tipo) {
        const classes = {
            entrada: 'blue',
            salida: 'green',
            ajuste: 'yellow',
            caducidad: 'red',
            baja: 'red'
        };
        return classes[tipo] || 'blue';
    },

    getActivityIcon(tipo) {
        const icons = {
            entrada: 'fa-plus',
            salida: 'fa-minus',
            ajuste: 'fa-edit',
            caducidad: 'fa-clock',
            baja: 'fa-trash'
        };
        return icons[tipo] || 'fa-info';
    },

    renderExpiryAlerts(medicamentos) {
        const alerts = medicamentos
            .map(m => ({ ...m, days: App.daysUntilExpiry(m.fechaCaducidad) }))
            .filter(m => m.days <= 90)
            .sort((a, b) => a.days - b.days)
            .slice(0, 5);

        if (alerts.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    <h3>Sin alertas de caducidad</h3>
                    <p>Todos los medicamentos tienen fecha de caducidad lejana</p>
                </div>
            `;
        }

        return `
            <div class="activity-feed">
                ${alerts.map(item => {
                    const status = App.getExpiryStatus(item.days);
                    return `
                        <div class="activity-item">
                            <div class="activity-icon ${status.class === 'critical' ? 'red' : status.class === 'warning' ? 'yellow' : 'blue'}">
                                <i class="fas fa-pills"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-title">${item.nombre} (${item.lote})</div>
                                <div class="activity-meta">
                                    Caduca: ${App.formatDate(item.fechaCaducidad)} 
                                    <span class="badge badge-${status.class}">${status.label}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    bindEvents(app) {
    }
};