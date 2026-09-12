const App = {
    currentView: 'dashboard',
    sidebarOpen: false,
    data: {
        medicamentos: [],
        actividades: [],
        stats: {}
    },

    init() {
        this.bindEvents();
        this.loadInitialData();
        this.handleRoute();
        window.addEventListener('hashchange', () => this.handleRoute());
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
            const [medicamentos, actividades, stats] = await Promise.all([
                this.fetchAPI('/api/medicamentos'),
                this.fetchAPI('/api/actividades'),
                this.fetchAPI('/api/stats')
            ]);
            this.data.medicamentos = medicamentos || [];
            this.data.actividades = actividades || [];
            this.data.stats = stats || {};
            this.renderCurrentView();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showAlert('Error al cargar los datos iniciales', 'danger');
        }
    },

    async fetchAPI(endpoint, options = {}) {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
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
            'registro-actividades': 'Registro de Actividades',
            'por-caducar': 'Medicamentos por Caducar'
        };
        document.querySelector('.page-title').textContent = titles[view] || 'Dashboard';
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
                <div class="alert-message">${message}</div>
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

document.addEventListener('DOMContentLoaded', () => App.init());