const StockView = {
    filters: { busqueda: '', tipo: '', modo: 'disponibles' },

    render(data) {
        const products = data.medicamentos
            .filter(item => this.matchesFilters(item, data))
            .sort((first, second) => String(first.nombre).localeCompare(String(second.nombre), 'es'));

        const isTerminadosMode = this.filters.modo === 'terminados';

        return `
            <div class="fade-in stock-view">
                <div class="card stock-filters">
                    <div class="card-body">
                        <form id="stock-filters-form" class="stock-toolbar" style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                            <!-- Fila 1: Filtrar por tipo, Buscar producto y Botón Buscar -->
                            <div style="display: grid; grid-template-columns: minmax(160px, 1fr) minmax(200px, 2fr) auto; gap: 1rem; align-items: end; width: 100%;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" for="stock-tipo">Filtrar por tipo</label>
                                    <select class="form-input form-select" id="stock-tipo" name="tipo" style="width: 100%;">
                                        <option value="">Todos los tipos</option>
                                        <option value="medicamento" ${this.filters.tipo === 'medicamento' ? 'selected' : ''}>Medicamentos</option>
                                        <option value="vacuna" ${this.filters.tipo === 'vacuna' ? 'selected' : ''}>Vacunas</option>
                                    </select>
                                </div>

                                <div class="form-group" style="margin-bottom: 0;">
                                    <label class="form-label" for="stock-search">Buscar producto</label>
                                    <input type="search" class="form-input" id="stock-search" name="busqueda" placeholder="Escribe el nombre del producto..." value="${App.escapeHtml(this.filters.busqueda)}" style="width: 100%;">
                                </div>

                                <button class="btn btn-primary" type="submit" title="Buscar" style="height: 42px; margin-bottom: 0; padding: 0 1.5rem; justify-content: center;">
                                    <i class="fas fa-search"></i> Buscar
                                </button>
                            </div>

                            <!-- Fila 2: Botones Terminados, Reducir stock y Limpiar (Distribuidos abarcando todo el ancho) -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; width: 100%; padding-top: 0.75rem; border-top: 1px solid var(--gray-200);">
                                <button class="btn ${isTerminadosMode ? 'btn-danger' : 'btn-warning'}" type="button" id="btn-terminados" title="Ver productos agotados en la última semana" style="justify-content: center; width: 100%;">
                                    <i class="fas ${isTerminadosMode ? 'fa-box-open' : 'fa-check-circle'}"></i> ${isTerminadosMode ? 'Ver En Stock' : 'Terminados'}
                                </button>

                                <button class="btn btn-danger" type="button" id="btn-reducir-universal" style="justify-content: center; width: 100%;">
                                    <i class="fas fa-arrow-down"></i> Reducir stock
                                </button>

                                <button class="btn btn-secondary" type="button" id="btn-limpiar-stock" title="Limpiar todos los filtros" style="justify-content: center; width: 100%;">
                                    <i class="fas fa-undo"></i> Limpiar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                ${isTerminadosMode ? `
                    <div class="alert alert-warning" style="margin-bottom: 1rem;">
                        <i class="fas fa-info-circle"></i>
                        <span>Mostrando productos <strong>terminados/agotados</strong> en el lapso de la última semana.</span>
                    </div>
                ` : ''}

                ${products.length ? `<div class="stock-list">${products.map(item => this.renderProduct(item)).join('')}</div>` : `
                    <div class="card empty-state">
                        <i class="fas ${isTerminadosMode ? 'fa-check-circle' : 'fa-box-open'}"></i>
                        <h3>${isTerminadosMode ? 'No hay productos terminados recientemente' : 'No hay productos disponibles'}</h3>
                        <p>${isTerminadosMode ? 'No se registraron salidas totales ni agotamiento de stock en los últimos 7 días con los filtros aplicados.' : 'Prueba con otro nombre o registra un producto nuevo.'}</p>
                    </div>
                `}

                <div class="modal-overlay" id="modal-seleccionar-reduccion">
                    <div class="modal" style="max-width: 440px;">
                        <div class="modal-header">
                            <h3 class="modal-title">Seleccionar producto</h3>
                            <button class="modal-close" data-modal="modal-seleccionar-reduccion" aria-label="Cerrar"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="modal-body">
                            <p class="form-label">Selecciona el producto que quieres reducir</p>
                            <div class="stock-selection-grid">
                                ${data.medicamentos.filter(item => Number(item.cantidad) > 0).map(item => `
                                    <label class="stock-selection-option">
                                        <input type="radio" name="producto-reduccion" value="${item.id}">
                                        <span class="stock-selection-check"><i class="fas fa-check"></i></span>
                                        ${item.imagen_url ? `<img src="${App.escapeHtml(item.imagen_url)}" alt="">` : '<span class="stock-selection-placeholder"><i class="fas fa-box"></i></span>'}
                                        <span class="stock-selection-details">
                                            <strong>${App.escapeHtml(item.nombre)}</strong>
                                            <small>${App.escapeHtml(item.cantidad)} ${App.escapeHtml(item.unidad || 'unidades')} disponibles</small>
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                            <div class="form-error" id="producto-reduccion-error"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-modal="modal-seleccionar-reduccion">Cancelar</button>
                            <button type="button" class="btn btn-danger" id="continuar-reduccion">Continuar</button>
                        </div>
                    </div>
                </div>

                <div class="modal-overlay" id="modal-reducir-stock">
                    <div class="modal" style="max-width: 440px;">
                        <div class="modal-header">
                            <h3 class="modal-title"><i class="fas fa-minus-circle mr-2"></i>Reducir stock</h3>
                            <button class="modal-close" data-modal="modal-reducir-stock" aria-label="Cerrar"><i class="fas fa-times"></i></button>
                        </div>
                        <form id="reduce-stock-form">
                            <div class="modal-body">
                                <p id="reduce-stock-product" class="stock-modal-product"></p>
                                <div class="form-group">
                                    <label class="form-label" for="reduce-stock-quantity">Cantidad a restar</label>
                                    <input class="form-input" type="number" id="reduce-stock-quantity" min="1" required>
                                    <small id="reduce-stock-available" class="form-help"></small>
                                    <div class="form-error" id="reduce-stock-error"></div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-modal="modal-reducir-stock">Cancelar</button>
                                <button type="submit" class="btn btn-danger"><i class="fas fa-minus"></i> Reducir stock</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    renderProduct(item) {
        const isTerminado = Number(item.cantidad) <= 0;
        return `
            <article class="stock-product" style="${isTerminado ? 'border-left: 4px solid var(--danger); background: rgba(239, 68, 68, 0.02);' : ''}">
                <div class="stock-product-info">
                    ${item.imagen_url ? `<img class="stock-product-image" src="${App.escapeHtml(item.imagen_url)}" alt="Imagen de ${App.escapeHtml(item.nombre)}">` : '<div class="stock-product-image stock-product-image-placeholder" aria-hidden="true"><i class="fas fa-box"></i></div>'}
                    <h3>${App.escapeHtml(item.nombre)}</h3>
                    <span class="stock-product-type">${item.tipo === 'vacuna' ? 'Vacuna' : 'Medicamento'}</span>
                    <p>${App.escapeHtml(item.presentacion || 'Sin presentación')}${item.concentracion ? ` · ${App.escapeHtml(item.concentracion)}` : ''}</p>
                    <span class="stock-available">
                        ${isTerminado 
                            ? '<strong style="color: var(--danger);"><i class="fas fa-times-circle mr-1"></i>Terminado / Sin Stock</strong>' 
                            : `Stock disponible: <strong>${App.escapeHtml(item.cantidad)} ${App.escapeHtml(item.unidad || 'unidades')}</strong>`}
                    </span>
                </div>
            </article>
        `;
    },

    matchesFilters(item, data) {
        const search = (this.filters.busqueda || '').toLowerCase();
        if (search && !String(item.nombre || '').toLowerCase().includes(search)) {
            return false;
        }

        if (this.filters.tipo && item.tipo !== this.filters.tipo) {
            return false;
        }

        const cantidad = Number(item.cantidad || 0);

        if (this.filters.modo === 'terminados') {
            if (cantidad > 0) return false;

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const itemDate = item.updated_at ? new Date(item.updated_at) : (item.created_at ? new Date(item.created_at) : null);
            let recentInActivities = false;
            if (data?.actividades) {
                recentInActivities = data.actividades.some(act => {
                    const actDate = new Date(act.fecha);
                    const isThisProduct = (act.medicamentoId && act.medicamentoId == item.id) || 
                                          (act.medicamento && String(act.medicamento).toLowerCase() === String(item.nombre).toLowerCase());
                    return isThisProduct && actDate >= sevenDaysAgo;
                });
            }

            if (itemDate && itemDate >= sevenDaysAgo) return true;
            if (recentInActivities) return true;
            if (!itemDate && (!data?.actividades || !data.actividades.length)) return true;

            return false;
        } else {
            return cantidad > 0;
        }
    },

    bindEvents(app) {
        const form = document.getElementById('stock-filters-form');
        const modal = document.getElementById('modal-reducir-stock');
        const selectModal = document.getElementById('modal-seleccionar-reduccion');
        const reduceForm = document.getElementById('reduce-stock-form');
        const universalButton = document.getElementById('btn-reducir-universal');
        const continueButton = document.getElementById('continuar-reduccion');
        const btnTerminados = document.getElementById('btn-terminados');
        const btnLimpiar = document.getElementById('btn-limpiar-stock');
        const tipoSelect = document.getElementById('stock-tipo');

        form?.addEventListener('submit', event => {
            event.preventDefault();
            const formData = new FormData(form);
            this.filters.busqueda = formData.get('busqueda') || '';
            this.filters.tipo = formData.get('tipo') || '';
            app.renderCurrentView();
        });

        tipoSelect?.addEventListener('change', () => {
            this.filters.tipo = tipoSelect.value;
            app.renderCurrentView();
        });

        btnTerminados?.addEventListener('click', () => {
            this.filters.modo = this.filters.modo === 'terminados' ? 'disponibles' : 'terminados';
            app.renderCurrentView();
        });

        btnLimpiar?.addEventListener('click', () => {
            this.filters = { busqueda: '', tipo: '', modo: 'disponibles' };
            app.renderCurrentView();
        });

        universalButton?.addEventListener('click', () => {
            document.getElementById('producto-reduccion-error').textContent = '';
            document.querySelectorAll('input[name="producto-reduccion"]').forEach(input => { input.checked = false; });
            app.openModal('modal-seleccionar-reduccion');
        });

        continueButton?.addEventListener('click', () => {
            const selected = document.querySelector('input[name="producto-reduccion"]:checked');
            const productId = selected?.value;
            if (!productId) {
                document.getElementById('producto-reduccion-error').textContent = 'Selecciona un producto.';
                return;
            }
            app.closeModal('modal-seleccionar-reduccion');
            this.openReduceForm(productId, app);
        });

        document.querySelectorAll('[data-modal]').forEach(button => {
            button.addEventListener('click', () => app.closeModal(button.dataset.modal));
        });

        reduceForm?.addEventListener('submit', event => this.submitReduction(event, app));
        modal?.addEventListener('click', event => {
            if (event.target === modal) app.closeModal('modal-reducir-stock');
        });
        selectModal?.addEventListener('click', event => {
            if (event.target === selectModal) app.closeModal('modal-seleccionar-reduccion');
        });
    },

    openReduceForm(id, app) {
        const item = app.data.medicamentos.find(product => product.id == id);
        if (!item) return;
        document.getElementById('reduce-stock-form').dataset.productId = item.id;
        document.getElementById('reduce-stock-product').textContent = item.nombre;
        document.getElementById('reduce-stock-available').textContent = `Disponible: ${item.cantidad} ${item.unidad || 'unidades'}`;
        const input = document.getElementById('reduce-stock-quantity');
        input.value = '';
        input.max = item.cantidad;
        document.getElementById('reduce-stock-error').textContent = '';
        app.openModal('modal-reducir-stock');
    },

    async submitReduction(event, app) {
        event.preventDefault();
        const form = event.currentTarget;
        const item = app.data.medicamentos.find(product => product.id == form.dataset.productId);
        const input = document.getElementById('reduce-stock-quantity');
        const quantity = Number(input.value);
        const error = document.getElementById('reduce-stock-error');
        if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > Number(item.cantidad)) {
            error.textContent = 'Indica una cantidad válida dentro del stock disponible.';
            return;
        }

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
            const result = await app.apiRequest('/api/operacion', {
                method: 'POST',
                body: JSON.stringify({ tipo: 'salida', medicamento_id: item.id, cantidad: quantity })
            });
            const updated = app.normalizeRecord(result.medicamento);
            app.data.medicamentos = app.data.medicamentos.map(product => product.id == item.id ? updated : product);
            if (result.actividad) app.data.actividades.unshift(app.normalizeRecord(result.actividad));
            app.persistCachedData();
            app.showAlert(`Se redujeron ${quantity} unidades de ${item.nombre}`, 'success');
            app.closeModal('modal-reducir-stock');
            app.renderCurrentView();
        } catch (requestError) {
            error.textContent = requestError.message;
        } finally {
            button.disabled = false;
        }
    }
};
