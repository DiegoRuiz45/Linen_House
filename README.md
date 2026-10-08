# Linen House

Monorepo de la tienda Linen House. El frontend React/Vite y la API FastAPI viven en este mismo repositorio, conservando la estructura y el flujo de trabajo de los proyectos originales.

## Estructura

```text
Linen_House/
├── backend/    # FastAPI, SQLAlchemy, Alembic y archivos subidos
├── frontend/   # Tienda y aplicación administrativa React/Vite
└── package.json
```

## Requisitos

- Python 3.11 o superior
- Node.js 20 o superior
- MySQL

## Configurar el backend

Desde la raíz del proyecto:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Completa `backend/.env` con las credenciales de MySQL, el ID de Google y una clave de sesión privada. Después aplica las migraciones:

```powershell
python -m alembic upgrade head
```

## Configurar el frontend

```powershell
cd frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

El valor predeterminado de `VITE_API_URL` apunta a `http://localhost:8000/api/v1`.

## Ejecutar en desarrollo

Abre tres terminales en la raíz del repositorio.

Terminal del backend:

```powershell
npm run dev:backend
```

Terminal del frontend:

```powershell
npm run dev:frontend
```

Terminal del panel administrativo:

```powershell
npm run dev:admin
```

Servicios locales:

- Tienda: `http://localhost:5173`
- Administración: `http://localhost:5174`
- API: `http://localhost:8000`
- Documentación API: `http://localhost:8000/docs`

Antes de iniciar después de actualizar el repositorio, ejecuta `npm run migrate:backend`. Las sesiones anteriores se invalidan al migrar al almacenamiento de sesiones opacas.

## Verificaciones

```powershell
npm run lint:frontend
npm run build:frontend
npm run build:admin
npm run check:backend
npm run test:backend
```

El pipeline en `.github/workflows/ci.yml` valida los dos frontends y ejecuta compilación y pruebas de seguridad del backend.

## Seguridad

- Las cookies de sesión son `HttpOnly`, opacas, se guardan mediante hash y pueden revocarse.
- Cada ruta administrativa valida sesión, cuenta activa y rol en el backend.
- Las mutaciones con cookie validan el origen para prevenir CSRF.
- Las mutaciones administrativas generan registros de auditoría sin guardar cuerpos sensibles.
- CORS, hosts permitidos, cookies seguras, HSTS y documentación se endurecen en producción.
- El frontend no contiene secretos; las credenciales privadas pertenecen exclusivamente a `backend/.env`.

Las rutas y solicitudes HTTP siempre pueden observarse en las herramientas del navegador. La protección no depende de ocultarlas, sino de autenticación, autorización, validación y auditoría en el servidor.

Los archivos `.env`, los entornos virtuales, `node_modules` y las compilaciones quedan fuera de Git. Las carpetas originales se usan únicamente como fuente de lectura; el desarrollo continúa desde este repositorio.
