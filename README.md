# Sistema de Inventario Digital de Medicamentos y Vacunas

Sistema web frontend para la gestión de inventario de medicamentos y vacunas, desarrollado con PHP, JavaScript y CSS.

## Características

- **Dashboard**: Vista general con estadísticas, actividad reciente y alertas de caducidad
- **Nuevo Registro**: Formulario completo para registrar medicamentos y vacunas
- **Registro de Actividades**: Historial de entradas, salidas, ajustes, caducidades y bajas con filtros y paginación
- **Medicamentos por Caducar**: Lista detallada con filtros por rango de días, exportación a CSV y acciones rápidas

## Tecnologías

- **Frontend**: HTML5, CSS3 (CSS Variables, Grid, Flexbox), JavaScript ES6+ (Módulos)
- **Backend**: PHP 8+ (API REST simple)
- **Base de Datos**: MySQL/MariaDB
- **Iconos**: Font Awesome 6
- **Fuente**: Inter (Google Fonts)

## Estructura del Proyecto

```
sistema-de-inventario/
├── index.php                 # Punto de entrada principal
├── css/
│   └── styles.css           # Estilos principales
├── js/
│   ├── app.js               # Aplicación principal (routing, estado, utilidades)
│   └── views/
│       ├── dashboard.js     # Vista Dashboard
│       ├── nuevo-registro.js # Vista Nuevo Registro
│       ├── registro-actividades.js # Vista Registro de Actividades
│       └── por-caducar.js   # Vista Medicamentos por Caducar
├── php/
│   ├── api/
│   │   └── index.php        # Endpoints API REST
│   ├── config/
│   │   └── database.php     # Configuración de base de datos
│   └── schema.sql           # Esquema de base de datos
└── assets/
    └── images/              # Imágenes y recursos estáticos
```

## Instalación

### Requisitos

- PHP 8.0+
- MySQL 5.7+ / MariaDB 10.3+
- Servidor web (Apache/Nginx) o PHP built-in server

### 1. Configurar Base de Datos

```bash
# Crear la base de datos y tablas
mysql -u root -p < php/schema.sql
```

### 2. Configurar Conexión

Edita `php/config/database.php` o crea un archivo `.env` en la raíz:

```env
DB_HOST=localhost
DB_NAME=inventario_medicamentos
DB_USER=tu_usuario
DB_PASS=tu_password
```

### 3. Iniciar Servidor

**Opción A: PHP Built-in Server (Desarrollo)**
```bash
php -S localhost:8000
```

**Opción B: Apache/Nginx**
Configura el DocumentRoot apuntando a la carpeta del proyecto.

### 4. Acceder

Abre `http://localhost:8000` en tu navegador.

## API Endpoints

### Medicamentos
- `GET /php/api/index.php?action=medicamentos` - Listar (con paginación, búsqueda, filtro por tipo)
- `GET /php/api/index.php?action=medicamentos&id=1` - Obtener uno
- `POST /php/api/index.php?action=medicamentos` - Crear
- `PUT /php/api/index.php?action=medicamentos&id=1` - Actualizar
- `DELETE /php/api/index.php?action=medicamentos&id=1` - Eliminar

### Actividades
- `GET /php/api/index.php?action=actividades` - Listar
- `GET /php/api/index.php?action=actividades&id=1` - Obtener una
- `POST /php/api/index.php?action=actividades` - Crear

### Estadísticas
- `GET /php/api/index.php?action=stats` - Obtener estadísticas del dashboard

## Funcionalidades Principales

### Dashboard
- 4 tarjetas de estadísticas: Total Medicamentos, Total Vacunas, Próximos a Caducar, Caducados
- Actividad reciente (últimas 5)
- Alertas de caducidad (próximos 90 días)

### Nuevo Registro
- Formulario validado (cliente y servidor)
- Campos: Nombre, Tipo (Medicamento/Vacuna), Lote, Laboratorio, Presentación, Concentración, Cantidad, Unidad, Fechas, Ubicación, Temperatura, Observaciones
- Checkboxes: Requiere receta, Medicamento controlado

### Registro de Actividades
- Tabla con paginación
- Filtros: Búsqueda texto, Tipo de actividad, Rango de fechas
- Modal para nueva actividad
- Modal de detalle

### Medicamentos por Caducar
- 4 tarjetas de resumen: Caducados, Críticos (≤30 días), Advertencia (31-90), Vigentes (>90)
- Tabla con paginación y ordenación por fecha
- Filtros: Búsqueda, Rango de días (0, 30, 90, 180, Todos), Estado
- Exportación a CSV
- Acciones por fila: Baja, Generar Alerta, Registrar Salida, Ajustar Stock

## Responsive

- Sidebar colapsable en móviles (< 1024px)
- Tablas con scroll horizontal
- Formularios adaptables
- Modales responsivos

## Licencia

MIT