const StockView = {
    filters: { busqueda: '' },

    render(data) {
        const products = data.medicamentos
            .filter(item => Number(item.cantidad) > 0)
            .filter(item => this.matchesFilters(item))
            .sort((first, second) => String(first.nombre).localeCompare(String(second.nombre), 'es'));

        return `
            <div class="fade-in stock-view">
                <div class="card stock-filters">
                    <div class="card-body">
                        <form id="stock-filters-form" class="stock-toolbar">
                            <div class="form-group">
                                <label class="form-label" for="stock-search">Buscar producto</label>
                                <input type="search" class="form-input" id="stock-search" name="busqueda" placeholder="Escribe el nombre del producto" value="${App.escapeHtml(this.filters.busqueda)}">
                            </div>
                            <button class="btn btn-primary" type="submit"><i class="fas fa-search"></i> Buscar</button>
                            <button class="btn btn-danger" type="button" id="btn-reducir-universal"><i class="fas fa-arrow-down"></i> Reducir stock</button>
                        </form>
                    </div>
                </div>

                    ${products.length ? `<div class="stock-list">${products.map(item => this.renderProduct(item)).join('')}</div>` : `
                    <div class="card empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>No hay productos disponibles</h3>
                        <p>Prueba con otro nombre o registra un producto nuevo.</p>
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
                    ${item.imagen_url ? `<img class="stock-product-image" src="${App.escapeHtml(item.imagen_url)}" alt="Imagen de ${App.escapeHtml(item.nombre)}">` : '<div class="stock-product-image stock-product-image-placeholder" aria-hidden="true"><i class="fas fa-box"></i></div>'}
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
        return !search || String(item.nombre || '').toLowerCase().includes(search);
    },

    bindEvents(app) {
        const form = document.getElementById('stock-filters-form');
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
