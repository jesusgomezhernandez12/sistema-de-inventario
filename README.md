# Inventario Ganadero - Medicamentos y Vacunas

Sistema de gestión de inventario veterinario **deployado en Vercel + Turso (libSQL)**.

## 🏗️ Arquitectura

| Capa | Tecnología |
|------|------------|
| **Frontend** | HTML5, CSS3 (Variables, Grid, Flexbox), JS ES6+ (Módulos) |
| **Backend API** | **Vercel Serverless Functions** (Node.js/TypeScript-like ES Modules) |
| **Auth** | JWT stateless (jose) + bcryptjs |
| **Base de Datos** | **Turso (libSQL/SQLite via HTTP)** |
| **Despliegue** | **Vercel** (frontend + API en un solo deploy) |
| **Iconos/Fuentes** | Font Awesome 6, Inter (Google Fonts) |

## 📁 Estructura para Vercel

```
sistema-de-inventario/
├── index.html                 # App principal (SPA)
├── login.html                 # Login JWT
├── recuperar.html             # Solicitar reset password
├── restablecer.html           # Formulario reset password
├── vercel.json                # Configuración Vercel
├── package.json               # Dependencias Node.js
├── .env.example               # Variables de entorno
├── css/
│   └── styles.css
├── js/
│   ├── app.js                 # Core: JWT auth, routing, API client
│   └── views/                 # dashboard, nuevo-registro, stock, registro-actividades, por-caducar
├── api/                       # 🔥 Vercel Serverless Functions
│   ├── _lib/
│   │   └── db.js              # Turso client + JWT + helpers
│   ├── auth/
│   │   ├── check.js           # GET /api/auth/check
│   │   ├── login.js           # POST /api/auth/login
│   │   ├── logout.js          # POST /api/auth/logout
│   │   ├── request-reset.js   # POST /api/auth/request-reset
│   │   └── reset-password.js  # POST /api/auth/reset-password
│   ├── index.js               # GET/POST /api/index?action=...
│   └── health.js              # GET /api/health
└── php/                       # 📦 LEGACY (solo schema.sql para init)
    └── schema.sql
```

---

## 🚀 Despliegue en Vercel (3 pasos)

### 1. Preparar base de datos en Turso
```bash
# Instalar CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login y crear DB
turso auth login
turso db create inventario-ganadero

# Obtener credenciales
turso db show inventario-ganadero --url
turso db tokens create inventario-ganadero

# Inicializar schema
turso db shell inventario-ganadero < php/schema.sql
```

### 2. Push a GitHub
```bash
git add .
git commit -m "Vercel + Turso deploy"
git push origin main
```

### 3. Importar en Vercel
1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project**
2. Importar repo de GitHub
3. **Configuración**:
   - Framework: **Other**
   - Build Command: *(vacío)*
   - Output Directory: **.** (root)
   - Install Command: *(vacío)*
4. **Variables de entorno** (Settings → Environment Variables):
   ```
   TURSO_DATABASE_URL=libsql://tu-db-tu-org.turso.io
   TURSO_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   JWT_SECRET=tu-jwt-secret-generado-con-openssl-rand-base64-32
   APP_URL=https://tu-proyecto.vercel.app
   ```
5. **Deploy** 🎉

---

## 🔑 Generar JWT_SECRET
```bash
openssl rand -base64 32
# Ejemplo: K7gNU7s8mV9zL2pQ4wR6tY8uI1oP3aS5dF7hJ9kL1mN=
```

---

## 🛠️ Desarrollo Local

### Opción A: `vercel dev` (recomendado, usa las mismas functions)
```bash
npm install -g vercel
vercel dev
# → http://localhost:3000
```

### Opción B: Servidor estático simple (solo frontend, API mock)
```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# PHP (legacy)
php -S localhost:8000
```

> **Nota**: Con servidor estático simple, las APIs `/api/*` no funcionarán. Usa `vercel dev` para desarrollo completo.

---

## 📡 API Endpoints (Vercel Functions)

| Método | Ruta | Descripción |
|--------|------|-------------|
| **Auth** |
| POST | `/api/auth/login` | Login → retorna JWT |
| GET | `/api/auth/check` | Verificar token (header `Authorization: Bearer <token>`) |
| POST | `/api/auth/logout` | Logout (stateless, solo client-side) |
| POST | `/api/auth/request-reset` | Solicitar reset password |
| POST | `/api/auth/reset-password` | Confirmar reset con token |
| **Inventario** |
| GET | `/api/index?action=bootstrap` | Medicamentos + stats (carga inicial) |
| GET | `/api/index?action=stats` | Stats dashboard |
| GET | `/api/index?action=medicamentos` | Listar medicamentos |
| POST | `/api/index?action=medicamentos` | Crear medicamento |
| GET | `/api/index?action=actividades` | Historial actividades |
| POST | `/api/index?action=actividades` | Registrar actividad |
| POST | `/api/index?action=operacion` | Baja/Salida/Ajuste stock |
| **Health** |
| GET | `/api/health` | Health check |

---

## 🔐 Autenticación JWT

```javascript
// Login
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await res.json();
localStorage.setItem('inventario_token', token);

// Requests autenticadas
const res = await fetch('/api/index?action=medicamentos', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Token**: HS256, expiración 2h, guardado en `localStorage`.

---

## 🗄️ Base de Datos (Turso)

### Schema principal
```sql
-- Medicamentos
CREATE TABLE medicamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('medicamento','vacuna')) DEFAULT 'medicamento',
  presentacion TEXT, concentracion TEXT,
  cantidad INTEGER DEFAULT 1, unidad TEXT DEFAULT 'frascos',
  fecha_caducidad DATE NOT NULL, fecha_ingreso DATE DEFAULT (date('now')),
  observaciones TEXT, imagen_url TEXT,
  requiere_receta INTEGER DEFAULT 0, es_controlado INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Actividades
CREATE TABLE actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT CHECK (tipo IN ('entrada','salida','ajuste','caducidad','baja')),
  medicamento_id INTEGER REFERENCES medicamentos(id),
  medicamento TEXT, lote TEXT, cantidad INTEGER,
  descripcion TEXT NOT NULL, fecha DATETIME NOT NULL,
  usuario TEXT DEFAULT 'Sistema', created_at DATETIME DEFAULT (datetime('now'))
);

-- Usuarios
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT, email TEXT UNIQUE, password TEXT,
  rol TEXT CHECK (rol IN ('admin','veterinario','tecnico','visualizador')),
  activo INTEGER DEFAULT 1, ultimo_acceso DATETIME,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES usuarios(id),
  token_hash TEXT UNIQUE, expires_at DATETIME, used_at DATETIME
);
```

### Datos demo incluidos
- 10 medicamentos/vacunas veterinarios
- 3 usuarios: admin, veterinario, tecnico (pass: admin123, vet123, tecnico123)

---

## 📱 Funcionalidades

- **Login/Logout** JWT + recuperación de contraseña
- **Dashboard**: Stats, actividad reciente, alertas caducidad
- **Nuevo Registro**: Medicamentos/vacunas con imagen
- **Stock**: Listado con filtros, búsqueda, paginación
- **Registro Actividades**: Historial CRUD con modales
- **Por Caducar**: Filtros por rango (0/30/90/180 días), export CSV, acciones rápidas
- **Responsive**: Mobile-first, sidebar colapsable, tablas scrollables

---

## 🔧 Comandos Útiles

```bash
# Desarrollo local con Vercel
vercel dev

# Deploy a preview
vercel

# Deploy a producción
vercel --prod

# Ver logs de funciones
vercel logs

# Ejecutar schema en Turso (si no usaste CLI)
turso db shell inventario-ganadero < php/schema.sql
```

---

## 📄 Licencia

MIT