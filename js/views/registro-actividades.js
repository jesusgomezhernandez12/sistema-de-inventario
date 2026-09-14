const RegistroActividadesView = {
    currentPage: 1,
    itemsPerPage: 10,
    filters: { tipo: '', fechaInicio: '', fechaFin: '', busqueda: '' },

    render(data) {
        const { actividades } = data;
        const filtered = this.filterActivities(actividades);
        const paginated = this.paginate(filtered);
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);

        return `
            <div class="fade-in">
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-filter mr-2"></i>Filtros</h3>
                    </div>
                    <div class="card-body">
                        <form id="filtros-form" class="form-row" style="gap: 1rem; align-items: end;">
                            <div class="form-group" style="flex: 1; min-width: 200px;">
                                <label class="form-label">Buscar</label>
                                <input type="text" class="form-input" name="busqueda" id="busqueda" placeholder="Buscar por descripción, usuario, medicamento..." value="${this.filters.busqueda}">
                            </div>
                            <div class="form-group" style="min-width: 180px;">
                                <label class="form-label">Tipo de Actividad</label>
                                <select class="form-input form-select" name="tipo" id="filtro-tipo">
                                    <option value="">Todos</option>
                                    <option value="entrada" ${this.filters.tipo === 'entrada' ? 'selected' : ''}>Entrada</option>
                                    <option value="salida" ${this.filters.tipo === 'salida' ? 'selected' : ''}>Salida</option>
                                    <option value="ajuste" ${this.filters.tipo === 'ajuste' ? 'selected' : ''}>Ajuste</option>
                                    <option value="caducidad" ${this.filters.tipo === 'caducidad' ? 'selected' : ''}>Caducidad</option>
                                    <option value="baja" ${this.filters.tipo === 'baja' ? 'selected' : ''}>Baja</option>
                                </select>
                            </div>
                            <div class="form-group" style="min-width: 180px;">
                                <label class="form-label">Fecha Inicio</label>
                                <input type="date" class="form-input" name="fechaInicio" id="fechaInicio" value="${this.filters.fechaInicio}">
                            </div>
                            <div class="form-group" style="min-width: 180px;">
                                <label class="form-label">Fecha Fin</label>
                                <input type="date" class="form-input" name="fechaFin" id="fechaFin" value="${this.filters.fechaFin}">
                            </div>
                            <div class="form-group">
                                <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fas fa-search"></i> Filtrar</button>
                            </div>
                            <div class="form-group">
                                <button type="button" class="btn btn-secondary" id="btn-limpiar" style="width: 100%;"><i class="fas fa-times"></i> Limpiar</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-list mr-2"></i>Registro de Actividades (${filtered.length} registros)</h3>
                    </div>
                    <div class="card-body p-0">
                        ${filtered.length > 0 ? `
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Descripción</th>
                                            <th>Medicamento</th>
                                            <th>Cantidad</th>
                                            <th>Usuario</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${paginated.map(act => this.renderActivityRow(act)).join('')}
                                    </tbody>
                                </table>
                            </div>
                            ${totalPages > 1 ? this.renderPagination(totalPages) : ''}
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-history"></i>
                                <h3>No hay actividades registradas</h3>
                                <p>No se encontraron actividades con los filtros actuales</p>
                            </div>
                        `}
                    </div>
                </div>

                <div class="modal-overlay" id="modal-detalle-actividad">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title"><i class="fas fa-info-circle mr-2"></i>Detalle de Actividad</h3>
                            <button class="modal-close" data-modal="modal-detalle-actividad"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="modal-body" id="detalle-actividad-content"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-modal="modal-detalle-actividad">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    filterActivities(actividades) {
        return actividades.filter(act => {
            if (this.filters.tipo && act.tipo !== this.filters.tipo) return false;
            if (this.filters.busqueda) {
                const search = this.filters.busqueda.toLowerCase();
                const match = act.descripcion.toLowerCase().includes(search) ||
                             act.usuario.toLowerCase().includes(search) ||
                             (act.medicamento?.toLowerCase().includes(search));
                if (!match) return false;
            }
            if (this.filters.fechaInicio) {
                const actDate = new Date(act.fecha).toISOString().split('T')[0];
                if (actDate < this.filters.fechaInicio) return false;
            }
            if (this.filters.fechaFin) {
                const actDate = new Date(act.fecha).toISOString().split('T')[0];
                if (actDate > this.filters.fechaFin) return false;
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

    renderActivityRow(act) {
        const tipoLabels = {
            entrada: { label: 'Entrada', class: 'badge-primary', icon: 'fa-plus' },
            salida: { label: 'Salida', class: 'badge-success', icon: 'fa-minus' },
            ajuste: { label: 'Ajuste', class: 'badge-warning', icon: 'fa-edit' },
            caducidad: { label: 'Caducidad', class: 'badge-danger', icon: 'fa-clock' },
            baja: { label: 'Baja', class: 'badge-danger', icon: 'fa-trash' }
        };
        const tipo = tipoLabels[act.tipo] || { label: act.tipo, class: 'badge-gray', icon: 'fa-info' };

        return `
            <tr>
                <td>${App.formatDateTime(act.fecha)}</td>
                <td><span class="badge ${tipo.class}"><i class="fas ${tipo.icon} mr-1"></i>${tipo.label}</span></td>
                <td>${App.escapeHtml(act.descripcion)}</td>
                <td>${App.escapeHtml(act.medicamento || '-')}</td>
                <td>${App.escapeHtml(act.cantidad || '-')}</td>
                <td>${App.escapeHtml(act.usuario || '-')}</td>
                <td>
                    <button class="btn btn-icon btn-secondary" data-action="ver" data-id="${act.id}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    bindEvents(app) {
        const formFiltros = document.getElementById('filtros-form');
        const btnLimpiar = document.getElementById('btn-limpiar');
        const formActividad = document.getElementById('actividad-form');

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
                this.filters = { tipo: '', fechaInicio: '', fechaFin: '', busqueda: '' };
                this.currentPage = 1;
                app.renderCurrentView();
            });
        }

        const openModal = () => {
            const fechaInput = document.getElementById('actividad-fecha');
            if (fechaInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                fechaInput.value = now.toISOString().slice(0, 16);
            }
            app.openModal('modal-nueva-actividad');
        };

        if (formActividad) {
            formActividad.addEventListener('submit', (e) => this.handleActividadSubmit(e, app));
        }

        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.modal;
                app.closeModal(modalId);
            });
        });

        document.querySelectorAll('[data-action="ver"]').forEach(btn => {
            btn.addEventListener('click', (e) => this.showDetalle(e.currentTarget.dataset.id, app));
        });

        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentPage = parseInt(e.currentTarget.dataset.page);
                app.renderCurrentView();
            });
        });
    },

    async handleActividadSubmit(e, app) {
        e.preventDefault();
        const form = e.target;
        const btnGuardar = form.querySelector('button[type="submit"]');

        if (!this.validateActividadForm(form)) return;

        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner"></span> Guardando...';

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.cantidad = parseInt(data.cantidad) || null;

            const medicamento = app.data.medicamentos.find(m => m.id == data.medicamentoId);
            if (medicamento) {
                data.medicamento = medicamento.nombre;
                data.lote = '';
            }
            data.fecha = new Date(data.fecha).toISOString().replace('T', ' ').slice(0, 19);

            const nueva = await app.apiRequest('/api/index?action=actividades', {
                method: 'POST',
                body: JSON.stringify({
                    tipo: data.tipo,
                    medicamento_id: data.medicamentoId || null,
                    medicamento: data.medicamento ?? '',
                    lote: data.lote ?? '',
                    cantidad: data.cantidad,
                    descripcion: data.descripcion,
                    fecha: data.fecha
                })
            });

            app.showAlert('Actividad registrada exitosamente', 'success');
            app.data.actividades.unshift(app.normalizeRecord(nueva));
            app.closeModal('modal-nueva-actividad');
            this.currentPage = 1;
            app.renderCurrentView();

        } catch (error) {
            console.error('Error al guardar actividad:', error);
            app.showAlert('Error al registrar la actividad: ' + error.message, 'danger');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    },

    validateActividadForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            const errorEl = document.getElementById(`${field.id}-error`);
            if (!field.value.trim()) {
                field.classList.add('error');
                if (errorEl) errorEl.textContent = 'Este campo es obligatorio';
                isValid = false;
            } else {
                field.classList.remove('error');
                if (errorEl) errorEl.textContent = '';
            }
        });

        return isValid;
    },

    showDetalle(id, app) {
        const act = app.data.actividades.find(a => a.id == id);
        if (!act) return;

        const content = document.getElementById('detalle-actividad-content');
        if (content) {
            content.innerHTML = `
                <dl style="display: grid; grid-template-columns: auto 1fr; gap: 0.75rem 1.5rem; font-size: 0.875rem;">
                    <dt class="font-medium text-gray-600">Fecha:</dt>
                    <dd class="text-gray-900">${App.formatDateTime(act.fecha)}</dd>
                    <dt class="font-medium text-gray-600">Tipo:</dt>
                    <dd class="text-gray-900"><span class="badge badge-${this.getTipoBadgeClass(act.tipo)}">${act.tipo}</span></dd>
                    <dt class="font-medium text-gray-600">Descripción:</dt>
                    <dd class="text-gray-900">${App.escapeHtml(act.descripcion)}</dd>
                    <dt class="font-medium text-gray-600">Medicamento:</dt>
                    <dd class="text-gray-900">${App.escapeHtml(act.medicamento || '-')}</dd>
                    <dt class="font-medium text-gray-600">Cantidad:</dt>
                    <dd class="text-gray-900">${App.escapeHtml(act.cantidad || '-')}</dd>
                    <dt class="font-medium text-gray-600">Usuario:</dt>
                    <dd class="text-gray-900">${App.escapeHtml(act.usuario || '-')}</dd>
                </dl>
            `;
        }
        app.openModal('modal-detalle-actividad');
    },

    getTipoBadgeClass(tipo) {
        const classes = { entrada: 'primary', salida: 'success', ajuste: 'warning', caducidad: 'danger', baja: 'danger' };
        return classes[tipo] || 'gray';
    }
};