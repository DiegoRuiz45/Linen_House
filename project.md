# Linen House — memoria del proyecto

> Documento vivo para retomar el desarrollo sin reconstruir el contexto desde cero.
> Última revisión: 7 de octubre de 2026.

## Resumen ejecutivo

Linen House es un comercio electrónico de lencería para el hogar construido como
un monorepo. Incluye una tienda pública, una aplicación administrativa separada y
una API con persistencia en MySQL.

El proyecto se encuentra en una etapa de MVP avanzado: el catálogo, usuarios,
carritos, inventario, pedidos, cupones, reseñas, notificaciones y administración
ya tienen implementación en código. La venta todavía no está lista para operar en
producción porque falta integrar una pasarela de pagos y validar su webhook. En el
entorno local está habilitado temporalmente un modo de pedidos de prueba: no cobra,
crea pedidos pendientes y sigue bloqueado cuando `APP_ENV=production`.

También falta cerrar la infraestructura de producción y volver a validar el
backend en el entorno local actual.

## Estado comprobado

| Área | Estado | Observaciones |
| --- | --- | --- |
| Tienda React | Implementada | Inicio, catálogo, detalle, carrito, cuenta, pedidos y checkout visual. |
| Panel administrativo | Implementado | Dashboard, pedidos, productos, inventario, categorías, clientes, cupones, reseñas, reportes y auditoría. |
| API FastAPI | Implementada | API modular bajo `/api/v1`, archivos subidos bajo `/uploads`. |
| Base de datos | Modelada | Hay 10 migraciones Alembic encadenadas para el esquema actual. |
| Autenticación | Implementada | Google Identity y sesiones opacas en cookie `HttpOnly`; duración local de 7 días con renovación por actividad. Requiere credenciales reales. |
| Pago | Prueba local | No hay proveedor ni webhook firmado; el entorno local puede crear pedidos pendientes sin cobro. Producción permanece bloqueada. |
| Envíos | Parcial | Dirección, preferencia de entrega y seguimiento manual; sin transportadora integrada. |
| Notificaciones | Parcial | Notificaciones internas disponibles; sin correo, SMS o WhatsApp transaccional. |
| Producción | Pendiente | Faltan hosting, MySQL administrado, almacenamiento persistente, backups y monitoreo. |
| Historial Git | Pendiente | La rama `main` todavía no tiene commits y todo el proyecto aparece sin seguimiento. |

## Cambios recientes — 7 de octubre de 2026

- La sesión dejó de vencer a los 5 minutos: en desarrollo dura 7 días y el
  backend renueva su expiración cuando el usuario continúa activo.
- El checkout local permite crear pedidos de prueba sin una pasarela real y ahora
  muestra el detalle útil de los errores de validación `422`.
- En modo de prueba, el administrador puede pasar un pedido de
  `Pendiente de pago` a `Aprobado`.
- `Entregado` quedó definido como estado terminal tanto en la API como en el
  panel; ya no se ofrece `Reembolsado` después de una entrega.
- Un reembolso permitido desde `Aprobado`, antes de preparar o despachar el
  pedido, restituye las unidades y registra un movimiento de devolución.
- Al recibir el pedido, el cliente encuentra en `/mis-pedidos` una invitación
  para reseñar cada producto; la API solo acepta reseñas de compras entregadas.
- Tienda, panel y API respondieron correctamente en los puertos 5173, 5174 y
  8000 durante la última verificación.

## Arquitectura actual

```text
Tienda React/Vite :5173 ─┐
                         ├── FastAPI :8000 ── SQLAlchemy/Alembic ── MySQL
Admin React/Vite :5174 ──┘         │
                                   ├── backend/uploads (imágenes WebP)
Google Identity ── token ID ───────└── sesión opaca en cookie HttpOnly
```

- `frontend/` contiene dos entradas Vite que comparten dependencias: la tienda y
  el panel administrativo.
- `backend/` sigue una organización modular por dominio. Los routers delegan en
  servicios y repositorios, y los modelos SQLAlchemy representan la persistencia.
- La API sirve imágenes desde `backend/uploads`. Esto funciona localmente, pero
  requiere almacenamiento persistente u objeto externo al desplegar.
- La tienda y el administrador consumen la misma API mediante
  `VITE_API_URL`, cuyo valor local predeterminado es
  `http://localhost:8000/api/v1`.

## Tecnologías

### Frontend

- React 19 y React DOM 19.
- React Router 7.
- Vite 8.
- Tailwind CSS 4.
- Lucide React para iconografía.
- SweetAlert2 para confirmaciones y resultados de acciones administrativas.
- Oxlint para análisis estático.

### Backend

- Python y FastAPI.
- Pydantic Settings para configuración.
- SQLAlchemy 2 y PyMySQL.
- Alembic para migraciones.
- Google Auth para validar el inicio de sesión.
- Pillow para normalizar imágenes a WebP.
- Uvicorn como servidor de desarrollo.

### Automatización

- Scripts coordinados desde el `package.json` de la raíz.
- GitHub Actions configurado para Python 3.13 y Node.js 22.

## Estructura relevante

```text
Linen_House/
├── .github/workflows/ci.yml       # CI de backend y frontends
├── backend/
│   ├── app/
│   │   ├── core/                  # Configuración, seguridad y middlewares
│   │   ├── db/                    # Sesión y base declarativa
│   │   ├── integrations/google/   # Validación con Google
│   │   ├── modules/               # Dominios de negocio
│   │   ├── storage/               # Procesamiento de imágenes
│   │   └── main.py                # Aplicación y registro de routers
│   ├── migrations/versions/       # 10 revisiones Alembic
│   ├── tests/                     # Seguridad, validación y servicio de usuarios
│   └── uploads/                   # Imágenes generadas/subidas
├── frontend/
│   ├── admin/                     # Entrada y componentes del administrador
│   ├── public/                    # Fotografías públicas del catálogo
│   └── src/                       # Tienda pública
├── package.json                   # Comandos del monorepo
├── README.md                      # Instalación y operación general
└── project.md                     # Esta memoria
```

## Funcionalidad implementada

### Tienda

- Inicio con hero, categorías y secciones comerciales.
- Catálogo conectado a la API con búsqueda, filtros, ordenamiento y
  disponibilidad.
- Detalle de producto con galería, variantes de talla/color, precio y stock. El
  precio cambia al seleccionar la talla; el color identifica SKU e inventario y
  no altera el valor.
- Reseñas públicas y envío de reseñas por compradores elegibles; los pedidos entregados muestran una invitación directa para calificar cada producto.
- Carrito de invitado en `localStorage`.
- Carrito persistente para usuarios autenticados.
- Sincronización del carrito local después del inicio de sesión.
- Cuenta con edición de datos, resumen de pedidos y notificaciones internas.
- Historial y detalle de pedidos.
- Checkout visual en tres pasos: datos, disponibilidad de entrega y pago.

Rutas de la tienda:

- `/`
- `/productos`
- `/productos/:slug`
- `/checkout`
- `/cuenta`
- `/mis-pedidos`
- `/cubrelechos`, que redirige a `/productos`.

### Panel administrativo

- Acceso exclusivo para usuarios con rol `admin`.
- Resumen operativo y ventas.
- Consulta y transición controlada de estados de pedidos; `Entregado` es terminal y
  los reembolsos previos al despacho restituyen inventario. En modo local de
  pruebas, el administrador puede aprobar manualmente un pedido pendiente.
- Campana de pedidos con actualización automática cada 30 segundos y contador de
  novedades por administrador.
- Gestión de productos, variantes e imágenes.
- Carga masiva de productos desde XLSX o CSV, con plantilla descargable,
  variantes, inventario, precios por talla e imágenes mediante URLs públicas.
- Validación de un único precio actual/anterior por talla para todos sus colores;
  al editar el precio de una variante se sincroniza con las variantes hermanas.
- Eliminación segura de variantes sin pedidos asociados; las variantes con
  historial comercial solo pueden desactivarse.
- Movimientos y ajustes de inventario.
- Gestión de categorías, clientes y cupones.
- Moderación de reseñas.
- Exportación CSV de ventas e inventario.
- Consulta de registros de auditoría.
- Alertas SweetAlert2 para operaciones administrativas `POST`, `PUT`, `PATCH` y
  `DELETE`.
- Paginación reutilizable en todas las tablas administrativas, con 10 registros
  por defecto y opciones limitadas a 10, 50 o 100 por página.

### Backend por dominio

- `auth`: inicio con Google, sesión actual y cierre de sesión.
- `users`: perfil del cliente y listado administrativo.
- `addresses`: CRUD de direcciones y dirección predeterminada.
- `categories`: catálogo público y mantenimiento administrativo.
- `products`: productos, variantes, imágenes y catálogo público.
- `carts`: carrito autenticado y sincronización desde invitado.
- `inventory`: existencias, entradas, salidas, ajustes e historial.
- `orders`: checkout, consulta del cliente y operación administrativa.
- `coupons`: descuentos y límites globales o por cliente.
- `reviews`: reseñas verificadas y moderación.
- `notifications`: bandeja interna y marcado como leído.
- `admin`: dashboard y reportes CSV.
- `audit`: trazabilidad de mutaciones administrativas.

## Flujo de pedidos ya diseñado

Aunque el pago aún no está conectado, la lógica transaccional del pedido está
implementada detrás de la bandera de pago:

1. El cliente autenticado envía una clave de idempotencia.
2. El backend recupera el carrito y bloquea las variantes para actualización.
3. Vuelve a validar productos, precios y stock.
4. Calcula el cupón y los totales.
5. Crea el pedido y sus líneas como instantáneas históricas.
6. Reserva inventario y registra los movimientos.
7. Registra el estado inicial, el uso del cupón y una notificación.
8. Vacía el carrito y confirma la transacción.
9. Un proceso periódico libera reservas vencidas; la cancelación y el reembolso
   permitido antes del despacho restituyen existencias. Una vez entregado, el
   pedido queda en estado terminal.

Transiciones administrativas vigentes:

| Estado actual | Siguientes estados permitidos |
| --- | --- |
| Pendiente de pago | Aprobado —solo en modo local de prueba— o Cancelado |
| Aprobado | Preparando, Cancelado o Reembolsado |
| Preparando | Enviado o Cancelado |
| Enviado | Entregado |
| Entregado | Ninguno |
| Cancelado | Ninguno |
| Reembolsado | Ninguno |

`backend/.env` tiene `TEST_ORDER_MODE_ENABLED=true` para pruebas locales. El
servicio ignora este modo en producción; un cobro real seguirá requiriendo activar
la pasarela, crear la intención de pago, gestionar el retorno al cliente y validar
un webhook firmado e idempotente.

## Seguridad implementada

- Cookies de sesión `HttpOnly` con configuración de `Secure`, `SameSite` y
  dominio por ambiente.
- Tokens de sesión aleatorios; el servidor almacena su hash y permite revocarlos.
- La sesión local dura 10.080 minutos —7 días— y su vencimiento se extiende por
  actividad, con escritura limitada para no actualizar la base en cada solicitud.
- Autorización administrativa centralizada por rol y cuenta activa.
- Validación de origen para mutaciones autenticadas con cookie.
- CORS restringido a la tienda y al panel configurados.
- Hosts permitidos y encabezados de seguridad; HSTS en producción.
- Límite de intentos sobre el endpoint de login.
- Auditoría de mutaciones administrativas sin almacenar cuerpos sensibles.
- Documentación OpenAPI desactivada en producción.
- Validaciones de configuración que impiden cookies inseguras o secretos débiles
  en producción.

## Datos y migraciones

Las migraciones crean, en orden, usuarios, direcciones, categorías, productos e
imágenes/variantes, movimientos de inventario, carritos, sesiones, pedidos y
cupones, reseñas/notificaciones y auditoría administrativa.

La fuente de verdad del esquema debe seguir siendo Alembic. Antes de ejecutar una
versión nueva del backend:

```powershell
npm run migrate:backend
```

## Configuración local

Requisitos documentados:

- Python 3.11 o superior; CI usa Python 3.13.
- Node.js 20 o superior; CI usa Node.js 22.
- MySQL.

Variables principales del backend:

- Aplicación: `APP_ENV`, `API_PREFIX`, `DEBUG`.
- Base de datos: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Identidad: `GOOGLE_CLIENT_ID`.
- Sesión: `SESSION_SECRET_KEY`, expiración y opciones de cookie.
- Pedidos: tiempos de reserva, `TEST_ORDER_MODE_ENABLED` y
  `PAYMENT_GATEWAY_ENABLED`.
- Orígenes: `STOREFRONT_URL`, `ADMIN_URL`, `API_URL`, `TRUSTED_HOSTS`.

Variables principales del frontend:

- `VITE_GOOGLE_CLIENT_ID`.
- `VITE_API_URL`.
- `VITE_ADMIN_URL`.

Los valores privados viven en archivos `.env` excluidos de Git. Los archivos
`.env.example` documentan las claves sin contener secretos.

## Ejecución

Después de instalar dependencias y completar los `.env`, abrir tres terminales en
la raíz:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

```powershell
npm run dev:admin
```

Servicios locales:

- Tienda: `http://localhost:5173`.
- Administración: `http://localhost:5174`.
- API: `http://localhost:8000`.
- Swagger en desarrollo: `http://localhost:8000/docs`.

## Verificación del 7 de octubre de 2026

Resultados ejecutados sobre el árbol de trabajo actual:

- `npm run lint:frontend`: correcto.
- `npm run build:frontend`: correcto.
- `npm run build:admin`: correcto.
- Tienda, panel y `/openapi.json` de la API: respuesta HTTP 200.
- La API recargó correctamente después de los cambios de pedidos y sesiones.
- `npm run check:backend`: no ejecutado; el `.venv` existente referencia un
  Python 3.14 que no está disponible en este equipo/sesión.
- `npm run test:backend`: bloqueado por el mismo entorno virtual.

Existen 12 pruebas unitarias centradas en sesiones, protección de rutas,
validaciones, estados terminales de pedidos, aprobación local y construcción de
la respuesta administrativa de clientes, pero no quedaron ejecutadas en esta
revisión. El pipeline de CI está configurado para
compilar y ejecutar esas pruebas cuando el repositorio tenga commits y se envíe a
GitHub.

Para recuperar la validación del backend, instalar una versión compatible de
Python, recrear `backend/.venv`, instalar `backend/requirements.txt` y volver a
ejecutar:

```powershell
npm run check:backend
npm run test:backend
npm run migrate:backend
```

## Pendientes priorizados

### P0 — recuperar una base verificable

1. Recrear el entorno virtual del backend y ejecutar compilación, pruebas y
   migraciones contra una base local limpia.
2. Revisar que los `.env` locales tengan valores válidos sin exponer secretos.
3. Crear el commit inicial para obtener historial, revisión de cambios y CI real.

### P1 — habilitar ventas reales

1. Elegir la pasarela de pagos.
2. Implementar intención/preferencia de pago y persistencia de su referencia.
3. Implementar webhook firmado, idempotente y tolerante a reintentos.
4. Vincular aprobación, rechazo y expiración del pago con estados del pedido e
   inventario.
5. Reemplazar el marcador de posición del checkout y probar el flujo completo.

### P2 — preparar producción

1. Definir hosting de los dos frontends y de la API.
2. Provisionar MySQL administrado, backups y restauración probada.
3. Mover imágenes a almacenamiento persistente si el host de la API es efímero.
4. Configurar HTTPS, cookies seguras, hosts y orígenes definitivos.
5. Añadir observabilidad: logs centralizados, métricas, alertas y seguimiento de
   errores.
6. Ejecutar una prueba completa de autenticación, carrito, pago, inventario,
   pedido y operación administrativa.

### P3 — integraciones y calidad posterior

- Integrar transportadora si se necesita cotización o creación automática de
  guías.
- Añadir correo, SMS o WhatsApp transaccional.
- Ampliar pruebas de servicios, base de datos, API y navegador.
- Optimizar fotografías, fuentes y carga inicial del frontend.
- Definir analítica, SEO, términos, privacidad y tratamiento de datos.

## Riesgos conocidos

- Sin un commit inicial no existe una línea base recuperable del trabajo actual.
- La API recargó y respondió correctamente, pero la compilación y las pruebas automatizadas del backend siguen pendientes por el entorno de Python roto.
- La cobertura automática actual es pequeña para la amplitud del dominio.
- Activar el checkout sin webhook firmado puede producir inconsistencias de pago,
  pedido e inventario.
- Guardar archivos únicamente en el disco de la API puede perder imágenes en un
  despliegue efímero.
- La configuración de producción debe probarse con `APP_ENV=production`; sus
  validaciones son deliberadamente más estrictas.

## Decisiones que conviene conservar

- Mantener tienda, administrador y backend en el mismo monorepo.
- Mantener el administrador como entrada separada de la tienda.
- Tratar precios, descuentos, stock, roles y estados como autoridad exclusiva del
  backend.
- Conservar idempotencia y transacciones en checkout y webhooks.
- Registrar toda mutación administrativa relevante.
- No colocar secretos ni decisiones de autorización en el frontend.
- Evolucionar el esquema solamente mediante migraciones Alembic.

## Punto recomendado para retomar

La siguiente sesión debería comenzar recuperando el entorno Python y creando una
línea base Git. Después, el trabajo de mayor valor es diseñar la pasarela de pago y
su máquina de estados antes de modificar el checkout o activar la bandera del
backend.
