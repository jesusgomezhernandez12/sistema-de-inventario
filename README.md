# Inventario Ganadero - Medicamentos y Vacunas

Sistema web **100% estático** (HTML/CSS/JS) para gestión de inventario veterinario.
**Backend: Turso (libSQL) directo desde el navegador** — sin PHP, sin servidor backend.

## ✨ Características

- **Login**: Autenticación con roles (Admin, Veterinario, Técnico) + bcrypt en cliente
- **Dashboard**: Stats en tiempo real, actividad reciente, alertas de caducidad
- **Nuevo Registro**: Formulario validado para medicamentos/vacunas veterinarios
- **Registro de Actividades**: Historial con filtros, paginación, modales CRUD
- **Medicamentos por Caducar**: Filtros por rango, exportación CSV, acciones rápidas

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | HTML5, CSS3 (Variables, Grid, Flexbox), JS ES6+ (Módulos) |
| **Base de Datos** | **Turso (libSQL/SQLite vía HTTP)** — conexión directa navegador→DB |
| **Auth** | bcryptjs (CDN) + localStorage (JWT-like session) |
| **Despliegue** | **Vercel/Netlify/GitHub Pages/Cloudflare Pages** (static hosting) |
| **Iconos/Fuentes** | Font Awesome 6, Inter (Google Fonts) |

## 📁 Estructura del Proyecto

```
sistema-de-inventario/
├── index.html                 # App principal (requiere login)
├── login.html                 # Página de login
├── start.sh                   # 🚀 Lanzador (Python/Node/PHP server)
├── css/
│   └── styles.css            # Estilos principales
├── js/
│   ├── app.js                # Core: routing, estado, Turso client
│   ├── lib/
│   │   └── turso-client.js   # 🔑 Cliente HTTP para Turso (libSQL)
│   └── views/
│       ├── dashboard.js
│       ├── nuevo-registro.js
│       ├── registro-actividades.js
│       └── por-caducar.js
├── php/                       # 📦 LEGACY (solo para schema.sql)
│   └── schema.sql            # Esquema SQLite + datos demo
├── .env.example              # Config template Turso
├── .env                      # Tu config local (gitignored)
└── README.md
```

---

## 🚀 Inicio Rápido

### 1. Crear base de datos en Turso
```bash
# Instalar CLI Turso
curl -sSfL https://get.tur.so/install.sh | bash

# Login y crear DB
turso auth login
turso db create inventario-ganadero

# Obtener credenciales
turso db show inventario-ganadero --url
turso db tokens create inventario-ganadero
```

### 2. Configurar proyecto
```bash
cd sistema-de-inventario
chmod +x start.sh
cp .env.example .env
```

Edita `.env` con tus credenciales:
```env
TURSO_DATABASE_URL=libsql://inventario-ganadero-tu-org.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_PORT=8000
```

### 3. Inicializar schema y arrancar
```bash
# Requiere Node.js para --init-db
./start.sh --init-db

# Arrancar servidor estático (usa Python3, Node o PHP automáticamente)
./start.sh
# → http://localhost:8000 (redirige a login.html)
```

### 4. Credenciales demo
| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@ganadero.com | admin123 |
| Veterinario | vet@ganadero.com | vet123 |
| Técnico | tecnico@ganadero.com | tecnico123 |

---

## ☁️ Despliegue en Producción (Vercel/Netlify/GitHub Pages)

### Opción A: Vercel (Recomendado)
```bash
# 1. Push a GitHub
git add . && git commit -m "deploy" && git push

# 2. Importar en Vercel
# - Framework: Other
# - Build Command: (vacío)
# - Output Directory: (vacío)
# - Install Command: (vacío)

# 3. Variables de entorno en Vercel Dashboard:
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

### Opción B: Netlify
```bash
# Conectar repo en Netlify
# Build command: (vacío)
# Publish directory: .
# Environment variables: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
```

### Opción C: GitHub Pages
```bash
# Settings > Pages > Deploy from branch > main > / (root)
# Agregar variables en Settings > Secrets > Actions (para workflow)
```

> **Nota**: Al ser 100% estático, funciona en **cualquier hosting estático** (S3, Cloudflare Pages, Firebase Hosting, Surge, etc.)

---

## 🔧 Comandos del Lanzador

```bash
./start.sh           # Servidor estático auto-detectado (Python/Node/PHP)
./start.sh --init-db # Inicializar schema en Turso (requiere Node.js)
./start.sh --stop    # Detener servidor
./start.sh --logs    # Ver logs
./start.sh --status  # Estado del servidor
```

### Servidores soportados (auto-detectados por prioridad):
1. **Python 3** (`python3 -m http.server`) — incluido en Linux/macOS
2. **Node.js + serve** (`npx serve`) — `npm install -g serve` o `npx`
3. **PHP** (`php -S`) — fallback

---

## 📡 Uso del TursoClient (js/lib/turso-client.js)

```javascript
const db = new TursoClient(
    'libsql://tu-db-tu-org.turso.io',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

// Query simple
const vacunas = await db.query(
    "SELECT * FROM medicamentos WHERE tipo = ?", 
    ['vacuna']
);

// Fetch one
const med = await db.fetch(
    "SELECT * FROM medicamentos WHERE id = ?", 
    [1]
);

// Insert con last_insert_rowid
const id = await db.insert(
    "INSERT INTO medicamentos (nombre, tipo) VALUES (?, ?)", 
    ['Nuevo', 'medicamento']
);

// Transacción atómica
await db.transaction([
    { sql: 'INSERT INTO actividades ...', args: [...] },
    { sql: 'UPDATE medicamentos SET cantidad = cantidad - ? WHERE id = ?', args: [5, 1] }
]);

// Pipeline (batch HTTP único)
const results = await db.batch([
    { sql: 'SELECT * FROM medicamentos', args: [] },
    { sql: 'SELECT * FROM actividades', args: [] }
]);

// Prepared statements (PDO-like)
const stmt = db.prepare('SELECT * FROM medicamentos WHERE tipo = ?');
await stmt.execute(['vacuna']);
const vacunas = await stmt.fetchAll();
```

---

## 🗄️ Schema SQLite (Turso) - php/schema.sql

```sql
-- Diferencias clave MySQL → SQLite:
-- AUTO_INCREMENT → INTEGER PRIMARY KEY AUTOINCREMENT
-- ENUM → CHECK (col IN (...))
-- NOW() → datetime('now')
-- ON UPDATE CURRENT_TIMESTAMP → Trigger AFTER UPDATE
-- date_sub/now → date('now', '-30 days')
```

Ver `php/schema.sql` para esquema completo con:
- Tabla `medicamentos` (10 productos veterinarios demo)
- Tabla `actividades` (historial)
- Tabla `usuarios` (3 usuarios demo con bcrypt)
- Vista `vista_medicamentos_caducidad`
- Triggers para `updated_at`

---

## 🔐 Seguridad

- ✅ Passwords: `bcryptjs` (cost 12) en navegador via CDN
- ✅ Sesiones: localStorage con expiración (2h) + verificación client-side
- ✅ Turso: HTTPS/TLS nativo + Auth Token en header
- ✅ Prepared statements vía batch HTTP (previene inyección)
- ✅ CORS: Configurado en Turso Dashboard
- ✅ Sanitización: `textContent` / template literals escapados

---

## 📱 Responsive

- Sidebar colapsable (< 1024px)
- Tablas con scroll horizontal
- Formularios adaptables
- Modales responsivos
- Login centrado mobile-first

---

## 🗺️ Roadmap / Próximos Pasos

- [ ] **PWA** (Service Worker, offline, installable)
- [ ] **Notificaciones push** (caducidad próxima via Web Push API)
- [ ] **Sync offline** (IndexedDB + background sync)
- [ ] **Reportes PDF** (jsPDF / pdfmake)
- [ ] **Multi-tenancy** (varias fincas/establecimientos)
- [ ] **Tests E2E** (Playwright/Cypress)
- [ ] **Storybook** para componentes UI

---

## 📄 Licencia

MIT