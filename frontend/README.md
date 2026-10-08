# Linen House Storefront

Tienda de Linen House construida con React, Vite y Tailwind CSS.

La configuración general y los comandos del monorepo están documentados en el [`README.md`](../README.md) de la raíz.

Desde esta carpeta, el flujo habitual es:

```powershell
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

La variable `VITE_API_URL` conecta la tienda con la API y, en desarrollo, apunta a `http://localhost:8000/api/v1`.

El panel administrativo es una compilación Vite separada y se ejecuta con:

```powershell
npm run dev:admin
```

Queda disponible en `http://localhost:5174` y se compila en `dist-admin/` con `npm run build:admin`.
