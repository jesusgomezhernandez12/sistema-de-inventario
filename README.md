# Inventario de medicamentos y vacunas

Aplicación web de inventario desplegable en Vercel, con Supabase como base de datos y una API Node protegida por token.

## Configuración de Supabase

1. Abre el **SQL Editor** de tu proyecto Supabase.
2. Copia y ejecuta completo el archivo [`supabase/schema.sql`](supabase/schema.sql).
3. El script crea las tablas, índices, una operación atómica para reducir stock y tres usuarios de demostración:

   - `admin@ganadero.com` / `admin123`
   - `vet@ganadero.com` / `vet123`
   - `tecnico@ganadero.com` / `tecnico123`

   Cambia esas contraseñas antes de usar la aplicación en producción.

## Variables de entorno

Copia `.env.example` como `.env` y completa estas variables:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
JWT_SECRET=un-secreto-largo-y-aleatorio
```

`SUPABASE_SECRET_KEY` solamente se usa dentro de la función del servidor. Nunca la expongas en archivos JavaScript, en el navegador o en Git.

## Desplegar en Vercel

1. Sube este repositorio a GitHub y crea/importa el proyecto en Vercel.
2. En **Settings → Environment Variables**, agrega `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y, de forma recomendada, `JWT_SECRET` para Production, Preview y Development.
3. Despliega. Vercel detecta `api/index.js` como función Node y `vercel.json` redirige las solicitudes `/api` a esa función.

No hay paso de build obligatorio.

## Rutas internas

- `POST /api?action=login`
- `GET /api?action=check`
- `GET|POST /api?action=medicamentos`
- `GET|POST /api?action=actividades`
- `GET /api?action=stats`
- `POST /api?action=operacion`

La aplicación usa la función `operar_inventario` de PostgreSQL para evitar que dos reducciones simultáneas dejen el stock en negativo.
