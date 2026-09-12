const PorCaducarView = {
    currentPage: 1,
    itemsPerPage: 15,
    filters: { rango: '90', busqueda: '', estado: '' },

    render(data) {
        const { medicamentos } = data;
        const items = this.getExpiryItems(medicamentos);
        const filtered = this.filterItems(items);
        const paginated = this.paginate(filtered);
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);

        const stats = this.calculateStats(items);

        return `
            <div class="fade-in">
                <div class="stats-grid" style="margin-bottom: 1.5rem;">
                    <div class="stat-card">
                        <div class="stat-icon red"><i class="fas fa-times-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.caducados}</div>
                            <div class="stat-label">Caducados</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.criticos}</div>
                            <div class="stat-label">Críticos (≤30 días)</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon yellow"><i class="fas fa-clock"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.advertencia}</div>
                            <div class="stat-label">Advertencia (31-90 días)</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fas fa-info-circle"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${stats.vigentes}</div>
                            <div class="stat-label">Vigentes (>90 días)</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-filter mr-2"></i>Filtros</h3>
                    </div>
                    <div class="card-body">
                        <form id="filtros-caducar" class="form-row" style="gap: 1rem; align-items: end;">
                            <div class="form-group" style="flex: 1; min-width: 250px;">
                                <label class="form-label">Buscar</label>
                                <input type="text" class="form-input" name="busqueda" id="busqueda-caducar" placeholder="Buscar por nombre, presentación, concentración..." value="${this.filters.busqueda}">
                            </div>
                            <div class="form-group" style="min-width: 200px;">
                                <label class="form-label">Rango de Días</label>
                                <select class="form-input form-select" name="rango" id="filtro-rango">
                                    <option value="0" ${this.filters.rango === '0' ? 'selected' : ''}>Caducados (0 días)</option>
                                    <option value="30" ${this.filters.rango === '30' ? 'selected' : ''}>Próximos 30 días (Críticos)</option>
                                    <option value="90" ${this.filters.rango === '90' ? 'selected' : ''}>Próximos 90 días</option>
                                    <option value="180" ${this.filters.rango === '180' ? 'selected' : ''}>Próximos 180 días</option>
                                    <option value="all" ${this.filters.rango === 'all' ? 'selected' : ''}>Todos</option>
                                </select>
                            </div>
                            <div class="form-group" style="min-width: 180px;">
                                <label class="form-label">Estado</label>
                                <select class="form-input form-select" name="estado" id="filtro-estado">
                                    <option value="">Todos</option>
                                    <option value="caducado" ${this.filters.estado === 'caducado' ? 'selected' : ''}>Caducados</option>
                                    <option value="critico" ${this.filters.estado === 'critico' ? 'selected' : ''}>Críticos</option>
                                    <option value="advertencia" ${this.filters.estado === 'advertencia' ? 'selected' : ''}>Advertencia</option>
                                    <option value="vigente" ${this.filters.estado === 'vigente' ? 'selected' : ''}>Vigentes</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fas fa-search"></i> Filtrar</button>
                            </div>
                            <div class="form-group">
                                <button type="button" class="btn btn-secondary" id="btn-limpiar-caducar" style="width: 100%;"><i class="fas fa-times"></i> Limpiar</button>
                            </div>
                            <div class="form-group">
                                <button type="button" class="btn btn-success" id="btn-exportar-caducar" style="width: 100%;"><i class="fas fa-file-excel"></i> Exportar</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-pills mr-2"></i>Medicamentos por Caducar (${filtered.length} de ${items.length})</h3>
                    </div>
                    <div class="card-body p-0">
                        ${filtered.length > 0 ? `
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Medicamento</th>
                                            <th>Tipo</th>
                                            <th>Presentación</th>
                                            <th>Concentración</th>
                                            <th>Caducidad</th>
                                            <th>Días Restantes</th>
                                            <th>Stock</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${paginated.map(item => this.renderExpiryRow(item)).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${totalPages > 1 ? this.renderPagination(totalPages) : ''}
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-check-circle" style="color: var(--success);"></i>
                                <h3>No hay medicamentos en el rango seleccionado</h3>
                                <p>Intente cambiar los filtros de búsqueda</p>
                            </div>
                        `}
                    </div>
                </div>

                <div class="modal-overlay" id="modal-accion-caducar">
                    <div class="modal" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3 class="modal-title"><i class="fas fa-tasks mr-2"></i>Acciones para Caducidad</h3>
                            <button class="modal-close" data-modal="modal-accion-caducar"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="modal-body" id="modal-accion-content"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-modal="modal-accion-caducar">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getExpiryItems(medicamentos) {
        return medicamentos.map(m => {
            const days = App.daysUntilExpiry(m.fechaCaducidad);
            const status = App.getExpiryStatus(days);
            return { ...m, days, status };
        });
    },

    calculateStats(items) {
        return {
            caducados: items.filter(i => i.days < 0).length,
            criticos: items.filter(i => i.days >= 0 && i.days <= 30).length,
            advertencia: items.filter(i => i.days > 30 && i.days <= 90).length,
            vigentes: items.filter(i => i.days > 90).length
        };
    },

    filterItems(items) {
        return items.filter(item => {
            if (this.filters.rango !== 'all') {
                const rango = parseInt(this.filters.rango);
                if (rango === 0) {
                    if (item.days >= 0) return false;
                } else {
                    if (item.days < 0 || item.days > rango) return false;
                }
            }
            if (this.filters.estado) {
                if (this.filters.estado === 'caducado' && item.days >= 0) return false;
                if (this.filters.estado === 'critico' && (item.days < 0 || item.days > 30)) return false;
                if (this.filters.estado === 'advertencia' && (item.days <= 30 || item.days > 90)) return false;
                if (this.filters.estado === 'vigente' && item.days <= 90) return false;
            }
            if (this.filters.busqueda) {
                const search = this.filters.busqueda.toLowerCase();
                const match = item.nombre.toLowerCase().includes(search) ||
                             item.presentacion.toLowerCase().includes(search) ||
                             item.concentracion.toLowerCase().includes(search);
                if (!match) return false;
            }
            return true;
        });
    },

    paginate(items) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return items.slice(start, start + this.itemsPerPage);
    },

    renderPagination(totalPages) {
        let html = '<div class="pagination">';
        if (this.currentPage > 1) {
            html += `<button class="pagination-btn" data-page="${this.currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;
        }
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += `<span class="pagination-btn" style="pointer-events: none; opacity: 0.5;">...</span>`;
            }
        }
        if (this.currentPage < totalPages) {
            html += `<button class="pagination-btn" data-page="${this.currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;
        }
        html += '</div>';
        return html;
    },

    renderExpiryRow(item) {
        const tipoIcon = item.tipo === 'vacuna' ? 'fa-syringe' : 'fa-pills';
        const tipoLabel = item.tipo === 'vacuna' ? 'Vacuna' : 'Medicamento';
        const tipoClass = item.tipo === 'vacuna' ? 'badge-primary' : 'badge-info';

        return `
            <tr style="${item.days < 0 ? 'background: rgba(239, 68, 68, 0.03);' : ''}">
                <td>
                    <div style="font-weight: 500;">${item.nombre}</div>
                    <div style="font-size: 0.75rem; color: var(--gray-500);">${item.presentacion || ''} ${item.concentracion || ''}</div>
                </td>
                <td><span class="badge ${tipoClass}"><i class="fas ${tipoIcon} mr-1"></i>${tipoLabel}</span></td>
                <td>${item.presentacion || '-'}</td>
                <td>${item.concentracion || '-'}</td>
                <td>${App.formatDate(item.fechaCaducidad)}</td>
                <td>
                    <span class="expiry-days ${item.status.class}">${item.status.label}</span>
                </td>
                <td>${item.cantidad} ${item.unidad || 'frascos'}</td>
                <td>
                    <div class="expiry-actions">
                        <button class="btn btn-icon btn-secondary" data-action="acciones" data-id="${item.id}" title="Acciones">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    bindEvents(app) {
        const formFiltros = document.getElementById('filtros-caducar');
        const btnLimpiar = document.getElementById('btn-limpiar-caducar');
        const btnExportar = document.getElementById('btn-exportar-caducar');

        if (formFiltros) {
            formFiltros.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(formFiltros);
                this.filters = Object.fromEntries(formData.entries());
                this.currentPage = 1;
                app.renderCurrentView();
            });
        }

        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                this.filters = { rango: '90', busqueda: '', estado: '' };
                this.currentPage = 1;
                app.renderCurrentView();
            });
        }

        if (btnExportar) {
            btnExportar.addEventListener('click', () => this.exportToCSV(app));
        }

        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.modal;
                app.closeModal(modalId);
            });
        });

        document.querySelectorAll('[data-action="acciones"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.showAccionesModal(e.currentTarget.dataset.id, app));
        });

        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentPage = parseInt(e.currentTarget.dataset.page);
                app.renderCurrentView();
            });
        });
    },

    showAccionesModal(id, app) {
        const item = app.data.medicamentos.find(m => m.id == id);
        if (!item) return;

        const days = App.daysUntilExpiry(item.fechaCaducidad);
        const status = App.getExpiryStatus(days);

        const content = document.getElementById('modal-accion-content');
        if (content) {
            content.innerHTML = `
                <div style="padding: 0.5rem 0;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--gray-200);">
                        <div class="stat-icon ${status.class === 'critical' ? 'red' : status.class === 'warning' ? 'yellow' : 'blue'}" style="width: 48px; height: 48px;">
                            <i class="fas ${item.tipo === 'vacuna' ? 'fa-syringe' : 'fa-pills'}"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600;">${item.nombre}</div>
                            <div style="font-size: 0.875rem; color: var(--gray-500);">${item.presentacion} ${item.concentracion} | ${App.formatDate(item.fechaCaducidad)}</div>
                            <span class="expiry-days ${status.class}">${status.label}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn btn-danger" data-action="baja" data-id="${item.id}">
                            <i class="fas fa-trash"></i> Dar de Baja
                        </button>
                        <button class="btn btn-warning" data-action="alerta" data-id="${item.id}">
                            <i class="fas fa-bell"></i> Generar Alerta
                        </button>
                        <button class="btn btn-primary" data-action="salida" data-id="${item.id}">
                            <i class="fas fa-box-open"></i> Registrar Salida
                        </button>
                        <button class="btn btn-secondary" data-action="ajuste" data-id="${item.id}">
                            <i class="fas fa-edit"></i> Ajustar Stock
                        </button>
                    </div>
                </div>
            `;

            content.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleAccion(e.currentTarget.dataset.action, e.currentTarget.dataset.id, app));
            });
        }
        app.openModal('modal-accion-caducar');
    },

    async handleAccion(action, id, app) {
        const item = app.data.medicamentos.find(m => m.id == id);
        if (!item) return;

        const acciones = {
            baja: { tipo: 'baja', descripcion: `Baja por caducidad: ${item.nombre} (${item.presentacion} ${item.concentracion})` },
            alerta: { tipo: 'caducidad', descripcion: `Alerta de caducidad generada: ${item.nombre} (${item.presentacion} ${item.concentracion})` },
            salida: { tipo: 'salida', descripcion: `Salida por cercanía a caducidad: ${item.nombre} (${item.presentacion} ${item.concentracion})` },
            ajuste: { tipo: 'ajuste', descripcion: `Ajuste de stock por revisión de caducidad: ${item.nombre} (${item.presentacion} ${item.concentracion})` }
        };

        const accion = acciones[action];
        if (!accion) return;

        try {
            const fecha = new Date().toISOString().replace('T', ' ').slice(0, 19);
            
            await app.db.insert(
                `INSERT INTO actividades (tipo, medicamento_id, medicamento, lote, cantidad, descripcion, fecha, usuario, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
                [
                    accion.tipo,
                    item.id,
                    item.nombre,
                    '',
                    item.cantidad,
                    accion.descripcion,
                    fecha,
                    'Usuario Actual'
                ]
            );

            if (action === 'baja') {
                app.data.medicamentos = app.data.medicamentos.filter(m => m.id != id);
            }

            app.showAlert(`Acción "${action}" registrada correctamente`, 'success');
            app.closeModal('modal-accion-caducar');
            app.renderCurrentView();

        } catch (error) {
            console.error('Error al registrar acción:', error);
            app.showAlert('Error al registrar la acción: ' + error.message, 'danger');
        }
    },

    exportToCSV(app) {
        const { medicamentos } = app.data;
        const items = this.getExpiryItems(medicamentos);
        const filtered = this.filterItems(items);

        const headers = ['Nombre', 'Tipo', 'Presentación', 'Concentración', 'Fecha Caducidad', 'Días Restantes', 'Estado', 'Cantidad', 'Unidad', 'Requiere Receta', 'Controlado', 'Observaciones'];
        const rows = filtered.map(item => [
            item.nombre,
            item.tipo === 'vacuna' ? 'Vacuna' : 'Medicamento',
            item.presentacion || '',
            item.concentracion || '',
            App.formatDate(item.fechaCaducidad),
            item.days,
            item.status.label,
            item.cantidad,
            item.unidad || 'frascos',
            item.requiereReceta ? 'Sí' : 'No',
            item.esControlado ? 'Sí' : 'No',
            item.observaciones || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `medicamentos_por_caducar_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        app.showAlert('Archivo CSV exportado correctamente', 'success');
    }
};