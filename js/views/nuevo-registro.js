const NuevoRegistroView = {
    render(data) {
        return `
            <div class="fade-in">
                <div class="card" style="max-width: 800px;">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-plus-circle mr-2"></i>Nuevo Registro de Medicamento/Vacuna para Ganado</h3>
                    </div>
                    <div class="card-body">
                        <form id="registro-form" novalidate>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nombre <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="nombre" id="nombre" placeholder="Ej: Ivermectina 1%, Vacuna Aftosa" required>
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

                            <div class="form-group">
                                <label class="form-label" for="imagen">Imagen del producto</label>
                                <input type="file" class="form-input" name="imagen" id="imagen" accept="image/jpeg,image/png,image/webp">
                                <small class="form-help">JPG, PNG o WebP. Máximo 5 MB.</small>
                                <div class="form-error" id="imagen-error"></div>
                                <img id="imagen-preview" class="medicine-image-preview" alt="Vista previa de la imagen" hidden>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Presentación</label>
                                    <input type="text" class="form-input" name="presentacion" id="presentacion" placeholder="Ej: Frasco 100ml, Caja x 50ml">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Concentración</label>
                                    <input type="text" class="form-input" name="concentracion" id="concentracion" placeholder="Ej: 1%, 10%, 50mg/ml">
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
                                        <option value="frascos">Frascos</option>
                                        <option value="frascos_100ml">Frascos 100ml</option>
                                        <option value="frascos_500ml">Frascos 500ml</option>
                                        <option value="frascos_1l">Frascos 1L</option>
                                        <option value="dosis">Dosis</option>
                                        <option value="cajas">Cajas</option>
                                        <option value="ampollas">Ampollas</option>
                                        <option value="bolsas">Bolsas</option>
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

                            <div class="form-group">
                                <label class="form-label">Observaciones</label>
                                <textarea class="form-input form-textarea" name="observaciones" id="observaciones" placeholder="Información adicional: vía de administración, especies, tiempo de retiro..."></textarea>
                            </div>

                            <div class="form-check" style="margin-bottom: 1.5rem;">
                                <input type="checkbox" class="form-check-input" name="requiereReceta" id="requiereReceta">
                                <label class="form-check-label" for="requiereReceta">Requiere receta veterinaria</label>
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

        document.getElementById('imagen')?.addEventListener('change', event => {
            const file = event.target.files[0];
            const preview = document.getElementById('imagen-preview');
            if (!file || !preview) return;
            preview.src = URL.createObjectURL(file);
            preview.hidden = false;
        });
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
            data.requiereReceta = formData.has('requiereReceta') ? 1 : 0;
            data.esControlado = formData.has('esControlado') ? 1 : 0;
            data.cantidad = parseInt(data.cantidad);
            formData.set('requiere_receta', data.requiereReceta);
            formData.set('es_controlado', data.esControlado);
            formData.set('cantidad', data.cantidad);
            formData.set('fecha_caducidad', data.fechaCaducidad);
            formData.set('fecha_ingreso', data.fechaIngreso);
            formData.delete('fechaCaducidad');
            formData.delete('fechaIngreso');
            formData.delete('requiereReceta');
            formData.delete('esControlado');

            const nuevo = await app.apiRequest('/api/index?action=medicamentos', {
                method: 'POST',
                body: formData
            });

            app.showAlert('Registro guardado exitosamente', 'success');
            app.data.medicamentos.unshift(app.normalizeRecord(nuevo));
            app.persistCachedData();
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