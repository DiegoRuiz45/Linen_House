from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.db.base import Base
from app.db.session import DATABASE_URL


# Importar modelos para que Alembic los registre
from app.modules.users.model import User  # noqa: F401
from app.modules.addresses.model import Address # noqa: F401
from app.modules.categories.model import Category  # noqa: F401
from app.modules.products.model import (
    Product,
    ProductImage,
    ProductVariant,
)  # noqa: F401
from app.modules.inventory.model import InventoryMovement  # noqa: F401
from app.modules.carts.model import Cart, CartItem  # noqa: F401
from app.modules.auth.model import AuthSession  # noqa: F401
from app.modules.coupons.model import Coupon, CouponUsage  # noqa: F401
from app.modules.orders.model import (  # noqa: F401
    Order,
    OrderItem,
    OrderStatusHistory,
    PaymentTransaction,
)
from app.modules.notifications.model import Notification  # noqa: F401
from app.modules.reviews.model import Review  # noqa: F401
from app.modules.audit.model import AdminAuditLog  # noqa: F401










# ==========================================================
# ALEMBIC CONFIG
# ==========================================================

config = context.config


if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ==========================================================
# SQLALCHEMY METADATA
# ==========================================================

target_metadata = Base.metadata


# ==========================================================
# DATABASE URL
# ==========================================================

def get_database_url() -> str:

    return DATABASE_URL.render_as_string(
        hide_password=False
    )


# ==========================================================
# OFFLINE MIGRATIONS
# ==========================================================

def run_migrations_offline() -> None:

    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named"
        },
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ==========================================================
# ONLINE MIGRATIONS
# ==========================================================

def run_migrations_online() -> None:

    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# ==========================================================
# EXECUTION
# ==========================================================

if context.is_offline_mode():

    run_migrations_offline()

else:

    run_migrations_online()
