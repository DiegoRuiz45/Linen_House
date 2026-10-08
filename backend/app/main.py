import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import (
    BASE_DIR,
    settings,
)
from app.core.middleware import (
    AdminAuditMiddleware,
    LoginRateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.db.session import SessionLocal
from app.modules.orders.service import OrderService

from app.modules.auth.router import (
    router as auth_router,
)

from app.modules.addresses.router import (
    router as addresses_router,
)

from app.modules.categories.router import (
    public_router as categories_router,
    admin_router as admin_categories_router,
)

from app.modules.products.router import (
    public_router as products_router,
    admin_router as admin_products_router,
)

from app.modules.inventory.router import (
    router as inventory_router,
)

from app.modules.carts.router import (
    router as cart_router,
)
from app.modules.coupons.router import router as coupons_router
from app.modules.orders.router import (
    customer_router as orders_router,
    admin_router as admin_orders_router,
)
from app.modules.users.router import (
    router as users_router,
    admin_router as admin_customers_router,
)
from app.modules.admin.router import router as admin_dashboard_router
from app.modules.notifications.router import router as notifications_router
from app.modules.reviews.router import (
    router as reviews_router,
    admin_router as admin_reviews_router,
)
from app.modules.audit.router import router as admin_audit_router
from app.modules.admin.reports import router as admin_reports_router


logger = logging.getLogger(__name__)


def release_expired_reservations() -> None:
    db = SessionLocal()
    try:
        OrderService.expire_pending_reservations(db)
    except Exception:
        logger.exception("No fue posible liberar las reservas vencidas.")
    finally:
        db.close()


async def reservation_sweeper() -> None:
    while True:
        await asyncio.sleep(settings.ORDER_RESERVATION_SWEEP_SECONDS)
        await asyncio.to_thread(release_expired_reservations)


@asynccontextmanager
async def lifespan(application: FastAPI):
    task = asyncio.create_task(reservation_sweeper())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


# ==========================================================
# APLICACIÓN
# ==========================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    debug=settings.DEBUG,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware, hsts=settings.is_production)
app.add_middleware(
    LoginRateLimitMiddleware,
    path=f"{settings.API_PREFIX}/auth/google",
    limit=settings.LOGIN_RATE_LIMIT,
    window_seconds=settings.LOGIN_RATE_WINDOW_SECONDS,
)
app.add_middleware(
    AdminAuditMiddleware,
    admin_path_prefix=f"{settings.API_PREFIX}/admin/",
)

if settings.trusted_hosts:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.trusted_hosts,
    )


# ==========================================================
# ARCHIVOS ESTÁTICOS
# ==========================================================

UPLOADS_DIR = (
    BASE_DIR
    / "uploads"
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


app.mount(
    "/uploads",
    StaticFiles(
        directory=UPLOADS_DIR
    ),
    name="uploads",
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=list(settings.allowed_origins),

    allow_credentials=True,

    allow_methods=[
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allow_headers=[
        "Accept",
        "Content-Type",
        "X-Requested-With",
    ],
)


# ==========================================================
# AUTH
# ==========================================================

app.include_router(
    auth_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# ADDRESSES
# ==========================================================

app.include_router(
    addresses_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# CATEGORIES - PUBLIC
# ==========================================================

app.include_router(
    categories_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# CATEGORIES - ADMIN
# ==========================================================

app.include_router(
    admin_categories_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# PRODUCTS - PUBLIC
# ==========================================================

app.include_router(
    products_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# PRODUCTS - ADMIN
# ==========================================================

app.include_router(
    admin_products_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# INVENTORY - ADMIN
# ==========================================================

app.include_router(
    inventory_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# CART
# ==========================================================

app.include_router(
    cart_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    orders_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    admin_orders_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    coupons_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    users_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    admin_customers_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    admin_dashboard_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    notifications_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    reviews_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    admin_reviews_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    admin_audit_router,
    prefix=settings.API_PREFIX,
)

app.include_router(
    admin_reports_router,
    prefix=settings.API_PREFIX,
)


# ==========================================================
# ROOT
# ==========================================================

@app.get(
    "/",
    tags=["Root"],
)
def root():

    if settings.is_production:
        return {"status": "ok"}

    return {
        "message": (
            f"{settings.APP_NAME} "
            "funcionando correctamente"
        ),
        "version": (
            settings.APP_VERSION
        ),
        "environment": (
            settings.APP_ENV
        ),
        "session_expire_minutes": settings.SESSION_EXPIRE_MINUTES,
        "test_order_mode": settings.test_order_mode_enabled,
    }
