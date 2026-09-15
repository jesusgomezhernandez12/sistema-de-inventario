const NuevoRegistroView = {
    render(data) {
        return `
            <div class="fade-in">
                <div class="card" style="max-width: 800px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-plus-circle mr-2"></i>Nuevo Registro de Medicamento/Vacuna</h3>
                    </div>
                    <div class="card-body">
                        <form id="registro-form" novalidate>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nombre <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="nombre" id="nombre" placeholder="Ej: Paracetamol 500mg" required>
                                    <div class="form-error" id="nombre-error"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Tipo <span class="required">*</span></label>
                                    <select class="form-input form-select" name="tipo" id="tipo" required>
                                        <option value="">Seleccionar tipo</option>
                                        <option value="medicamento">Medicamento</option>
                                        <option value="vacuna">Vacuna</option>
                                    </select>
                                    <div class="form-error" id="tipo-error"></div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Lote <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="lote" id="lote" placeholder="Ej: LOT-2024-001" required>
                                    <div class="form-error" id="lote-error"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Laboratorio <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="laboratorio" id="laboratorio" placeholder="Ej: Laboratorios Pfizer" required>
                                    <div class="form-error" id="laboratorio-error"></div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Presentación</label>
                                    <input type="text" class="form-input" name="presentacion" id="presentacion" placeholder="Ej: Caja x 20 tabletas">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Concentración</label>
                                    <input type="text" class="form-input" name="concentracion" id="concentracion" placeholder="Ej: 500mg, 10ml, etc.">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Cantidad <span class="required">*</span></label>
                                    <input type="number" class="form-input" name="cantidad" id="cantidad" min="1" value="1" required>
                                    <div class="form-error" id="cantidad-error"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Unidad de Medida</label>
                                    <select class="form-input form-select" name="unidad" id="unidad">
                                        <option value="unidades">Unidades</option>
                                        <option value="cajas">Cajas</option>
                                        <option value="frascos">Frascos</option>
                                        <option value="ampollas">Ampollas</option>
                                        <option value="blister">Blister</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Fecha de Caducidad <span class="required">*</span></label>
                                    <input type="date" class="form-input" name="fechaCaducidad" id="fechaCaducidad" required>
                                    <div class="form-error" id="fechaCaducidad-error"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fecha de Ingreso</label>
                                    <input type="date" class="form-input" name="fechaIngreso" id="fechaIngreso" value="${this.getToday()}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Ubicación/Almacén</label>
                                    <input type="text" class="form-input" name="ubicacion" id="ubicacion" placeholder="Ej: Almacén A - Estante 3">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Temperatura de Almacenamiento</label>
                                    <input type="text" class="form-input" name="temperatura" id="temperatura" placeholder="Ej: 2-8°C, Ambiente">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Observaciones</label>
                                <textarea class="form-input form-textarea" name="observaciones" id="observaciones" placeholder="Información adicional..."></textarea>
                            </div>

                            <div class="form-check" style="margin-bottom: 1.5rem;">
                                <input type="checkbox" class="form-check-input" name="requiereReceta" id="requiereReceta">
                                <label class="form-check-label" for="requiereReceta">Requiere receta médica</label>
                            </div>

                            <div class="form-check" style="margin-bottom: 1.5rem;">
                                <input type="checkbox" class="form-check-input" name="esControlado" id="esControlado">
                                <label class="form-check-label" for="esControlado">Medicamento controlado</label>
                            </div>

                            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                                <button type="button" class="btn btn-secondary" id="btn-cancelar">Cancelar</button>
                                <button type="submit" class="btn btn-primary" id="btn-guardar">
                                    <i class="fas fa-save"></i> Guardar Registro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    bindEvents(app) {
        const form = document.getElementById('registro-form');
        const btnCancelar = document.getElementById('btn-cancelar');

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e, app));
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.resetForm(form));
        }

        const fechaCaducidad = document.getElementById('fechaCaducidad');
        if (fechaCaducidad) {
            fechaCaducidad.min = this.getToday();
        }
    },

    async handleSubmit(e, app) {
        e.preventDefault();
        const form = e.target;
        const btnGuardar = document.getElementById('btn-guardar');

        if (!this.validateForm(form)) {
            return;
        }

        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner"></span> Guardando...';

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.requiereReceta = formData.has('requiereReceta');
            data.esControlado = formData.has('esControlado');
            data.cantidad = parseInt(data.cantidad);

            const response = await app.fetchAPI(app.apiBase + '?action=medicamentos', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            app.showAlert('Registro guardado exitosamente', 'success');
            app.data.medicamentos.unshift(app.normalizeRecord(response));
            this.resetForm(form);
            app.renderCurrentView();

        } catch (error) {
            console.error('Error al guardar:', error);
            app.showAlert('Error al guardar el registro: ' + error.message, 'danger');
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Registro';
        }
    },

    validateForm(form) {
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

        const fechaCaducidad = document.getElementById('fechaCaducidad');
        if (fechaCaducidad && fechaCaducidad.value) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiry = new Date(fechaCaducidad.value);
            if (expiry < today) {
                fechaCaducidad.classList.add('error');
                const errorEl = document.getElementById('fechaCaducidad-error');
                if (errorEl) errorEl.textContent = 'La fecha de caducidad no puede ser anterior a hoy';
                isValid = false;
            }
        }

        return isValid;
    },

    resetForm(form) {
        if (form) {
            form.reset();
            form.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
            form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
            document.getElementById('fechaIngreso').value = this.getToday();
        }
    }
};