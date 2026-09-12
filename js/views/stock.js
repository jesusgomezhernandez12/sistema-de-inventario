const StockView = {
    filters: { busqueda: '', tipo: '', orden: 'nombre' },

    render(data) {
        const products = data.medicamentos
            .filter(item => Number(item.cantidad) > 0)
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
                            <div class="form-group">
                                <button class="btn btn-primary" type="submit"><i class="fas fa-filter"></i> Filtrar</button>
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
                    <h3>${item.nombre}</h3>
                    <p>${item.presentacion || 'Sin presentación'}${item.concentracion ? ` · ${item.concentracion}` : ''}</p>
                    <span class="stock-available">Stock disponible: <strong>${item.cantidad} ${item.unidad || 'unidades'}</strong></span>
                </div>
                <div class="stock-product-action">
                    <button class="btn btn-sm btn-danger" type="button" data-reduce-stock="${item.id}">
                        <i class="fas fa-arrow-down"></i> Reducir
                    </button>
                </div>
            </article>
        `;
    },

    matchesFilters(item) {
        const search = this.filters.busqueda.toLowerCase();
        const text = `${item.nombre} ${item.presentacion || ''} ${item.concentracion || ''}`.toLowerCase();
        return (!search || text.includes(search)) && (!this.filters.tipo || item.tipo === this.filters.tipo);
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
        const reduceForm = document.getElementById('reduce-stock-form');

        form?.addEventListener('submit', event => {
            event.preventDefault();
            this.filters = Object.fromEntries(new FormData(form).entries());
            app.renderCurrentView();
        });

        clear?.addEventListener('click', () => {
            this.filters = { busqueda: '', tipo: '', orden: 'nombre' };
            app.renderCurrentView();
        });

        document.querySelectorAll('[data-modal="modal-reducir-stock"]').forEach(button => {
            button.addEventListener('click', () => app.closeModal('modal-reducir-stock'));
        });

        document.querySelectorAll('[data-reduce-stock]').forEach(button => {
            button.addEventListener('click', () => this.openReduceForm(button.dataset.reduceStock, app));
        });

        reduceForm?.addEventListener('submit', event => this.submitReduction(event, app));
        modal?.addEventListener('click', event => {
            if (event.target === modal) app.closeModal('modal-reducir-stock');
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
