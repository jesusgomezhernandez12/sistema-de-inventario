const App = {
    currentView: 'dashboard',
    sidebarOpen: false,
    data: {
        medicamentos: [],
        actividades: [],
        stats: {}
    },

    async init() {
        this.bindEvents();
        const authenticated = await this.checkAuth();
        window.addEventListener('hashchange', () => this.handleRoute());
        return authenticated;
    },

    async checkAuth() {
        const response = await fetch('php/api/auth.php?action=check', { credentials: 'same-origin' });
        const result = await response.json();
        if (result.authenticated) {
            this.currentUser = result.user;
            this.updateUserUI(result.user);
            return true;
        }
        if (!window.location.pathname.includes('login.html')) window.location.href = 'login.html';
        return false;
    },

    async login(email, password) {
        const response = await fetch('php/api/auth.php?action=login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesión');
        this.currentUser = result.user;
        return result.user;
    },

    async logout() {
        await fetch('php/api/auth.php?action=logout', { method: 'POST', credentials: 'same-origin' });
        this.currentUser = null;
        window.location.href = 'login.html';
    },

    updateUserUI(user) {
        const nameEl = document.querySelector('.user-name');
        const roleEl = document.querySelector('.user-role');
        const avatarEl = document.querySelector('.user-avatar');
        
        if (nameEl) nameEl.textContent = user.nombre;
        if (roleEl) roleEl.textContent = user.rol.charAt(0).toUpperCase() + user.rol.slice(1);
        if (avatarEl) {
            const initials = user.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            avatarEl.textContent = initials;
        }
    },

    bindEvents() {
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.navigateTo(view);
            });
        });

        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }

        document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target === el || el.classList.contains('modal-close')) {
                    this.closeModal(el.closest('.modal-overlay')?.id);
                }
            });
        });

        // Logout button
        const logoutBtn = document.querySelector('form[action*="logout"] button, .btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    this.closeModal(modal.id);
                });
            }
        });
    },

    async loadInitialData() {
        try {
            const cached = JSON.parse(localStorage.getItem('inventario_bootstrap') || 'null');
            const cacheIsFresh = cached?.cachedAt && Date.now() - cached.cachedAt < 5 * 60 * 1000;
            if (cacheIsFresh && this.data.medicamentos.length > 0) {
                this.loadActivitiesInBackground();
                this.refreshInitialDataInBackground();
                return;
            }

            const initialData = await this.apiRequest('index.php?action=bootstrap');
            this.data.medicamentos = (initialData.medicamentos || []).map(item => this.normalizeRecord(item));
            this.data.actividades = [];
            this.data.stats = initialData.stats || {};
            localStorage.setItem('inventario_bootstrap', JSON.stringify({ ...initialData, cachedAt: Date.now() }));
            this.updateExpiryBadge();
            this.renderCurrentView();

            this.loadActivitiesInBackground();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showAlert('Error al cargar los datos iniciales', 'danger');
        }
    },

    async refreshInitialDataInBackground() {
        try {
            const initialData = await this.apiRequest('index.php?action=bootstrap');
            this.data.medicamentos = (initialData.medicamentos || []).map(item => this.normalizeRecord(item));
            this.data.stats = initialData.stats || {};
            localStorage.setItem('inventario_bootstrap', JSON.stringify({ ...initialData, cachedAt: Date.now() }));
            this.updateExpiryBadge();
            this.renderCurrentView();
        } catch (error) {
            console.warn('No se pudo actualizar el inventario en segundo plano:', error);
        }
    },

    async loadActivitiesInBackground() {
        try {
            const actividades = await this.apiRequest('index.php?action=actividades');
            this.data.actividades = (actividades.data || []).map(item => this.normalizeRecord(item));
            this.renderCurrentView();
        } catch (error) {
            console.warn('No se pudo cargar el historial:', error);
        }
    },

    loadCachedData() {
        try {
            const cached = JSON.parse(localStorage.getItem('inventario_bootstrap') || 'null');
            if (!cached || !Array.isArray(cached.medicamentos)) return false;
            this.data.medicamentos = cached.medicamentos.map(item => this.normalizeRecord(item));
            this.data.stats = cached.stats || {};
            this.updateExpiryBadge();
            this.handleRoute();
            return true;
        } catch {
            localStorage.removeItem('inventario_bootstrap');
            return false;
        }
    },

    persistCachedData() {
        localStorage.setItem('inventario_bootstrap', JSON.stringify({
            medicamentos: this.data.medicamentos,
            stats: this.data.stats,
            cachedAt: Date.now()
        }));
    },

    updateExpiryBadge() {
        const badge = document.getElementById('badge-caducar');
        const count = Number(this.data.stats.proximosCaducar || 0);
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    },

    async apiRequest(endpoint, options = {}) {
        const isFormData = options.body instanceof FormData;
        const response = await fetch(`php/api/${endpoint}`, {
            credentials: 'same-origin',
            headers: isFormData ? { ...options.headers } : { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        const result = await response.json();
        if (response.status === 401) {
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }
        if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
        return result;
    },

    normalizeRecord(record) {
        return {
            ...record,
            fechaCaducidad: record.fecha_caducidad ?? record.fechaCaducidad,
            fechaIngreso: record.fecha_ingreso ?? record.fechaIngreso,
            requiereReceta: Number(record.requiere_receta ?? record.requiereReceta ?? 0),
            esControlado: Number(record.es_controlado ?? record.esControlado ?? 0),
            medicamentoId: record.medicamento_id ?? record.medicamentoId
        };
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.navigateTo(hash, false);
    },

    navigateTo(view, updateHash = true) {
        if (updateHash) {
            window.location.hash = view;
        }
        this.currentView = view;
        this.updateActiveNav(view);
        this.renderCurrentView();
        this.closeSidebar();
    },

    updateActiveNav(view) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        const titles = {
            dashboard: 'Dashboard',
            'nuevo-registro': 'Nuevo Registro',
            stock: 'Stock disponible',
            'registro-actividades': 'Registro de Actividades',
            'por-caducar': 'Medicamentos por Caducar'
        };
        const titleEl = document.querySelector('.page-title');
        if (titleEl) titleEl.textContent = titles[view] || 'Dashboard';
    },

    renderCurrentView() {
        const container = document.getElementById('view-container');
        if (!container) return;

        switch (this.currentView) {
            case 'dashboard':
                container.innerHTML = DashboardView.render(this.data);
                DashboardView.bindEvents(this);
                break;
            case 'nuevo-registro':
                container.innerHTML = NuevoRegistroView.render(this.data);
                NuevoRegistroView.bindEvents(this);
                break;
            case 'stock':
                container.innerHTML = StockView.render(this.data);
                StockView.bindEvents(this);
                break;
            case 'registro-actividades':
                container.innerHTML = RegistroActividadesView.render(this.data);
                RegistroActividadesView.bindEvents(this);
                break;
            case 'por-caducar':
                container.innerHTML = PorCaducarView.render(this.data);
                PorCaducarView.bindEvents(this);
                break;
            default:
                container.innerHTML = DashboardView.render(this.data);
                DashboardView.bindEvents(this);
        }
    },

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        document.querySelector('.sidebar').classList.toggle('open', this.sidebarOpen);
    },

    closeSidebar() {
        this.sidebarOpen = false;
        document.querySelector('.sidebar')?.classList.remove('open');
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            const firstInput = modal.querySelector('input, select, textarea');
            firstInput?.focus();
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    showAlert(message, type = 'info', container = '.alert-container') {
        const alertContainer = document.querySelector(container) || this.createAlertContainer();
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} fade-in`;
        alert.innerHTML = `
            <i class="alert-icon fas fa-${this.getAlertIcon(type)}"></i>
            <div class="alert-content">
                <div class="alert-message">${this.escapeHtml(message)}</div>
            </div>
        `;
        alertContainer.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    },

    createAlertContainer() {
        const container = document.createElement('div');
        container.className = 'alert-container';
        container.style.position = 'fixed';
        container.style.top = '1rem';
        container.style.right = '1rem';
        container.style.zIndex = '300';
        container.style.maxWidth = '400px';
        document.body.appendChild(container);
        return container;
    },

    getAlertIcon(type) {
        const icons = { success: 'check-circle', warning: 'exclamation-triangle', danger: 'times-circle', info: 'info-circle' };
        return icons[type] || 'info-circle';
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        })[character]);
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    daysUntilExpiry(expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    getExpiryStatus(days) {
        if (days < 0) return { class: 'critical', label: 'Caducado' };
        if (days <= 30) return { class: 'critical', label: `${days} días` };
        if (days <= 90) return { class: 'warning', label: `${days} días` };
        return { class: 'info', label: `${days} días` };
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async () => {
    App.loadCachedData();
    const authenticated = await App.init();
    if (authenticated) {
        await App.loadInitialData();
        App.handleRoute();
    }
});