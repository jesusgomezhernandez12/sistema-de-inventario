const StockView = {
    filters: { busqueda: '', tipo: '', estado: '', orden: 'nombre' },

    render(data) {
        const products = data.medicamentos
            .filter(item => this.filters.estado === 'acabados' ? this.isRecentlyFinished(item) : Number(item.cantidad) > 0)
            .filter(item => this.matchesFilters(item))
            .sort((first, second) => this.compareProducts(first, second));

        return `
            <div class="fade-in stock-view">
                <div class="stock-summary">
                    <div>
                        <span class="eyebrow">Inventario disponible</span>
                        <h2>Stock actual</h2>
                        <p>${products.length} productos coinciden con los filtros</p>
                    </div>
                    <div class="stock-total">
                        <strong>${products.reduce((total, item) => total + Number(item.cantidad), 0)}</strong>
                        <span>unidades disponibles</span>
                    </div>
                </div>

                <div class="card stock-filters">
                    <div class="card-body">
                        <form id="stock-filters-form" class="form-row" style="gap: 1rem; align-items: end;">
                            <div class="form-group" style="flex: 1; min-width: 240px;">
                                <label class="form-label" for="stock-search">Buscar producto</label>
                                <input type="search" class="form-input" id="stock-search" name="busqueda" placeholder="Nombre, presentación o concentración" value="${this.filters.busqueda}">
                            </div>
                            <div class="form-group" style="min-width: 180px;">
                                <label class="form-label" for="stock-type">Tipo</label>
                                <select class="form-input form-select" id="stock-type" name="tipo">
                                    <option value="">Todos</option>
                                    <option value="medicamento" ${this.filters.tipo === 'medicamento' ? 'selected' : ''}>Medicamentos</option>
                                    <option value="vacuna" ${this.filters.tipo === 'vacuna' ? 'selected' : ''}>Vacunas</option>
                                </select>
                            </div>
                            <div class="form-group" style="min-width: 180px;">
                                <label class="form-label" for="stock-order">Ordenar</label>
                                <select class="form-input form-select" id="stock-order" name="orden">
                                    <option value="nombre" ${this.filters.orden === 'nombre' ? 'selected' : ''}>Nombre</option>
                                    <option value="cantidad-desc" ${this.filters.orden === 'cantidad-desc' ? 'selected' : ''}>Mayor stock</option>
                                    <option value="cantidad-asc" ${this.filters.orden === 'cantidad-asc' ? 'selected' : ''}>Menor stock</option>
                                    <option value="caducidad" ${this.filters.orden === 'caducidad' ? 'selected' : ''}>Caducidad próxima</option>
                                </select>
                            </div>
                            <div class="form-group" style="min-width: 150px;">
                                <label class="form-label" for="stock-status">Estado</label>
                                <select class="form-input form-select" id="stock-status" name="estado">
                                    <option value="" ${this.filters.estado === '' ? 'selected' : ''}>Disponibles</option>
                                    <option value="acabados" ${this.filters.estado === 'acabados' ? 'selected' : ''}>Acabados</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <button class="btn btn-primary" type="submit"><i class="fas fa-filter"></i> Filtrar</button>
                            </div>
                            <div class="form-group">
                                <button class="btn btn-danger" type="button" id="btn-reducir-universal"><i class="fas fa-arrow-down"></i> Reducir stock</button>
                            </div>
                            <div class="form-group">
                                <button class="btn btn-secondary" type="button" id="stock-clear"><i class="fas fa-times"></i> Limpiar</button>
                            </div>
                        </form>
                    </div>
                </div>

                    ${products.length ? `<div class="stock-list">${products.map(item => this.renderProduct(item)).join('')}</div>` : `
                    <div class="card empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>No hay productos disponibles</h3>
                        <p>Prueba con otros filtros o registra un producto nuevo.</p>
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
        return `
            <article class="stock-product">
                <div class="stock-product-info">
                    ${item.imagen_url ? `<img class="stock-product-image" src="${App.escapeHtml(item.imagen_url)}" alt="Imagen de ${App.escapeHtml(item.nombre)}">` : ''}
                    <h3>${App.escapeHtml(item.nombre)}</h3>
                    <span class="stock-product-type">${item.tipo === 'vacuna' ? 'Vacuna' : 'Medicamento'}</span>
                    <p>${App.escapeHtml(item.presentacion || 'Sin presentación')}${item.concentracion ? ` · ${App.escapeHtml(item.concentracion)}` : ''}</p>
                    <span class="stock-available">Stock disponible: <strong>${App.escapeHtml(item.cantidad)} ${App.escapeHtml(item.unidad || 'unidades')}</strong></span>
                </div>
            </article>
        `;
    },

    matchesFilters(item) {
        const search = this.filters.busqueda.toLowerCase();
        const text = `${item.nombre} ${item.presentacion || ''} ${item.concentracion || ''}`.toLowerCase();
        return (!search || text.includes(search)) && (!this.filters.tipo || item.tipo === this.filters.tipo);
    },

    isRecentlyFinished(item) {
        if (Number(item.cantidad) !== 0 || !item.updated_at) return false;
        const updatedAt = new Date(String(item.updated_at).replace(' ', 'T'));
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
        return !Number.isNaN(updatedAt.getTime()) && updatedAt.getTime() >= threeDaysAgo;
    },

    compareProducts(first, second) {
        if (this.filters.orden === 'cantidad-desc') return Number(second.cantidad) - Number(first.cantidad);
        if (this.filters.orden === 'cantidad-asc') return Number(first.cantidad) - Number(second.cantidad);
        if (this.filters.orden === 'caducidad') return String(first.fechaCaducidad).localeCompare(String(second.fechaCaducidad));
        return String(first.nombre).localeCompare(String(second.nombre), 'es');
    },

    bindEvents(app) {
        const form = document.getElementById('stock-filters-form');
        const clear = document.getElementById('stock-clear');
        const modal = document.getElementById('modal-reducir-stock');
        const selectModal = document.getElementById('modal-seleccionar-reduccion');
        const reduceForm = document.getElementById('reduce-stock-form');
        const universalButton = document.getElementById('btn-reducir-universal');
        const continueButton = document.getElementById('continuar-reduccion');

        form?.addEventListener('submit', event => {
            event.preventDefault();
            this.filters = Object.fromEntries(new FormData(form).entries());
            app.renderCurrentView();
        });

        clear?.addEventListener('click', () => {
            this.filters = { busqueda: '', tipo: '', estado: '', orden: 'nombre' };
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
            const result = await app.apiRequest('index.php?action=operacion', {
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
