const App = {
    currentView: 'dashboard',
    sidebarOpen: false,
    db: null,
    data: {
        medicamentos: [],
        actividades: [],
        stats: {}
    },

    init() {
        this.initDB();
        this.bindEvents();
        this.checkAuth();
        this.handleRoute();
        window.addEventListener('hashchange', () => this.handleRoute());
    },

    initDB() {
        // Configuración Turso desde variables de entorno o window.ENV
        const dbUrl = window.ENV?.TURSO_DATABASE_URL || 'libsql://tu-db-tu-org.turso.io';
        const authToken = window.ENV?.TURSO_AUTH_TOKEN || '';
        this.db = new TursoClient(dbUrl, authToken);
        this.db.setTimeout(15000);
    },

    async checkAuth() {
        // Verificar sesión en localStorage (simulación de auth stateless)
        const session = localStorage.getItem('inventario_session');
        if (session) {
            try {
                const user = JSON.parse(session);
                // Verificar expiración (2 horas)
                if (user.expires && Date.now() < user.expires) {
                    this.currentUser = user;
                    this.updateUserUI(user);
                    return true;
                } else {
                    localStorage.removeItem('inventario_session');
                }
            } catch {
                localStorage.removeItem('inventario_session');
            }
        }
        
        // Si estamos en login.html, no redirigir
        if (window.location.pathname.includes('login.html')) {
            return false;
        }
        
        // Redirigir a login
        window.location.href = 'login.html';
        return false;
    },

    async login(email, password) {
        try {
            const user = await this.db.fetch(
                'SELECT * FROM usuarios WHERE email = ? AND activo = 1', 
                [email.toLowerCase()]
            );
            
            if (!user) {
                throw new Error('Credenciales inválidas');
            }

            // Verificar password con bcrypt (necesitamos una librería)
            // Para simplicidad, usamos una verificación simple
            // En producción usar: await bcrypt.verify(password, user.password)
            const valid = await this.verifyPassword(password, user.password);
            if (!valid) {
                throw new Error('Credenciales inválidas');
            }

            // Actualizar último acceso
            await this.db.exec(
                'UPDATE usuarios SET ultimo_acceso = datetime("now") WHERE id = ?', 
                [user.id]
            );

            // Crear sesión (expira en 2 horas)
            const session = {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                expires: Date.now() + 2 * 60 * 60 * 1000
            };
            
            localStorage.setItem('inventario_session', JSON.stringify(session));
            this.currentUser = session;
            this.updateUserUI(session);
            
            return session;
        } catch (error) {
            throw error;
        }
    },

    async verifyPassword(password, hash) {
        // Usar bcrypt en el navegador via CDN
        if (typeof bcrypt !== 'undefined') {
            return await bcrypt.verify(password, hash);
        }
        
        // Fallback: cargar bcrypt dinámicamente
        await this.loadBcrypt();
        return await bcrypt.verify(password, hash);
    },

    async loadBcrypt() {
        if (typeof bcrypt !== 'undefined') return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js';
            script.onload = () => {
                window.bcrypt = bcrypt;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    logout() {
        localStorage.removeItem('inventario_session');
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
            const [medicamentos, actividades, stats] = await Promise.all([
                this.db.query('SELECT * FROM medicamentos ORDER BY fecha_caducidad ASC'),
                this.db.query('SELECT * FROM actividades ORDER BY fecha DESC LIMIT 50'),
                this.getStats()
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

    async getStats() {
        try {
            const [totalMedicamentos, totalVacunas, caducados, criticos, advertencia] = await Promise.all([
                this.db.fetch('SELECT COUNT(*) as total FROM medicamentos'),
                this.db.fetch("SELECT COUNT(*) as total FROM medicamentos WHERE tipo = 'vacuna'"),
                this.db.fetch("SELECT COUNT(*) as total FROM medicamentos WHERE date(fecha_caducidad) < date('now')"),
                this.db.fetch("SELECT COUNT(*) as total FROM medicamentos WHERE date(fecha_caducidad) BETWEEN date('now') AND date('now', '+30 days')"),
                this.db.fetch("SELECT COUNT(*) as total FROM medicamentos WHERE date(fecha_caducidad) BETWEEN date('now', '+31 days') AND date('now', '+90 days')")
            ]);

            return {
                totalMedicamentos: Number(totalMedicamentos?.total ?? 0),
                totalVacunas: Number(totalVacunas?.total ?? 0),
                caducados: Number(caducados?.total ?? 0),
                criticos: Number(criticos?.total ?? 0),
                advertencia: Number(advertencia?.total ?? 0),
                proximosCaducar: Number(criticos?.total ?? 0) + Number(advertencia?.total ?? 0)
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {};
        }
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

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar variables de entorno desde script inline o config
    window.ENV = window.ENV || {};
    
    await App.init();
    await App.loadInitialData();
});