# Linen House API

API de Linen House construida con FastAPI, SQLAlchemy, Alembic y MySQL.

La configuración general y los comandos del monorepo están documentados en el [`README.md`](../README.md) de la raíz.

Desde esta carpeta, el flujo habitual es:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

La documentación interactiva queda disponible en `http://localhost:8000/docs`.

En producción, la API exige cookies seguras, una clave de sesión fuerte y hosts explícitamente permitidos; además deshabilita OpenAPI, Swagger y ReDoc. Ejecuta siempre `python -m alembic upgrade head` antes de desplegar una versión nueva.
