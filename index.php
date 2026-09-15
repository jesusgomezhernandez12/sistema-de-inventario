<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sistema de Inventario Digital de Medicamentos y Vacunas">
    <title>Sistema de Inventario - Medicamentos y Vacunas</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <i class="fas fa-prescription-bottle-alt"></i>
                    <span>InventarioMed</span>
                </div>
            </div>
            
            <nav class="sidebar-nav">
                <div class="nav-section">
                    <div class="nav-section-title">Principal</div>
                    <button class="nav-item active" data-view="dashboard">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Dashboard</span>
                    </button>
                    <button class="nav-item" data-view="nuevo-registro">
                        <i class="fas fa-plus-circle"></i>
                        <span>Nuevo Registro</span>
                    </button>
                </div>
                
                <div class="nav-section">
                    <div class="nav-section-title">Registros</div>
                    <button class="nav-item" data-view="registro-actividades">
                        <i class="fas fa-history"></i>
                        <span>Registro de Actividades</span>
                    </button>
                    <button class="nav-item" data-view="por-caducar">
                        <i class="fas fa-clock"></i>
                        <span>Por Caducar</span>
                        <span class="badge" id="badge-caducar">0</span>
                    </button>
                </div>
            </nav>

            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">FA</div>
                    <div class="user-details">
                        <div class="user-name">Farmacéutico Admin</div>
                        <div class="user-role">Administrador</div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content" id="main-content">
            <!-- Top Bar -->
            <header class="top-bar">
                <div class="top-bar-left">
                    <button class="menu-toggle" id="menu-toggle" aria-label="Abrir menú">
                        <i class="fas fa-bars"></i>
                    </button>
                    <h1 class="page-title">Dashboard</h1>
                </div>
                <div class="top-bar-right">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Buscar medicamentos, lotes..." id="global-search">
                    </div>
                    <button class="notifications" id="notifications-btn" aria-label="Notificaciones">
                        <i class="fas fa-bell"></i>
                        <span class="badge">3</span>
                    </button>
                </div>
            </header>

            <!-- Page Content -->
            <div class="page-content">
                <div id="view-container">
                    <!-- Views will be rendered here by JavaScript -->
                </div>
            </div>
        </main>
    </div>

    <!-- Scripts -->
    <script src="js/app.js"></script>
    <script src="js/views/dashboard.js"></script>
    <script src="js/views/nuevo-registro.js"></script>
    <script src="js/views/registro-actividades.js"></script>
    <script src="js/views/por-caducar.js"></script>
    
    <script>
        // Initialize badge count for por-caducar
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const response = await fetch('/php/api/index.php?action=stats');
                const stats = await response.json();
                const badge = document.getElementById('badge-caducar');
                if (badge && stats.proximosCaducar !== undefined) {
                    badge.textContent = stats.proximosCaducar;
                    badge.style.display = stats.proximosCaducar > 0 ? 'inline-flex' : 'none';
                }
            } catch (error) {
                console.warn('No se pudo cargar el contador de caducidad');
            }
        });
    </script>
</body>
</html>