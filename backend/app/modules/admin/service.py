from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.modules.admin.schemas import DashboardResponse, SalesPoint
from app.modules.orders.model import Order
from app.modules.products.model import Product, ProductVariant
from app.modules.users.model import User
from app.shared.enums import OrderStatus, PaymentStatus, UserRole


class AdminService:
    @staticmethod
    def dashboard(db: Session) -> DashboardResponse:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = day_start.replace(day=1)

        revenue_today = db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.payment_status == PaymentStatus.PAID,
                Order.created_at >= day_start,
            )
        ) or Decimal("0")
        revenue_month = db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.payment_status == PaymentStatus.PAID,
                Order.created_at >= month_start,
            )
        ) or Decimal("0")
        orders_today = db.scalar(
            select(func.count(Order.id)).where(Order.created_at >= day_start)
        ) or 0
        pending_orders = db.scalar(
            select(func.count(Order.id)).where(
                Order.status.in_(
                    [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.PREPARING]
                )
            )
        ) or 0
        low_stock = db.scalar(
            select(func.count(ProductVariant.id)).where(
                ProductVariant.active.is_(True),
                ProductVariant.stock > 0,
                ProductVariant.stock <= ProductVariant.minimum_stock,
            )
        ) or 0
        out_of_stock = db.scalar(
            select(func.count(ProductVariant.id)).where(
                ProductVariant.active.is_(True), ProductVariant.stock == 0
            )
        ) or 0
        customers = db.scalar(
            select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
        ) or 0
        active_products = db.scalar(
            select(func.count(Product.id)).where(Product.active.is_(True))
        ) or 0

        return DashboardResponse(
            revenue_today=revenue_today,
            revenue_month=revenue_month,
            orders_today=orders_today,
            pending_orders=pending_orders,
            low_stock_variants=low_stock,
            out_of_stock_variants=out_of_stock,
            customers=customers,
            active_products=active_products,
        )

    @staticmethod
    def sales(db: Session, days: int) -> list[SalesPoint]:
        start = (
            datetime.now(timezone.utc).replace(tzinfo=None)
            - timedelta(days=days - 1)
        ).replace(hour=0, minute=0, second=0, microsecond=0)
        rows = db.execute(
            select(
                cast(Order.created_at, Date).label("date"),
                func.coalesce(func.sum(Order.total), 0),
                func.count(Order.id),
            )
            .where(
                Order.created_at >= start,
                Order.payment_status == PaymentStatus.PAID,
            )
            .group_by(cast(Order.created_at, Date))
            .order_by(cast(Order.created_at, Date))
        ).all()
        indexed = {
            str(date): (revenue, count)
            for date, revenue, count in rows
        }
        return [
            SalesPoint(
                date=str((start + timedelta(days=offset)).date()),
                revenue=indexed.get(
                    str((start + timedelta(days=offset)).date()),
                    (Decimal("0"), 0),
                )[0],
                orders=indexed.get(
                    str((start + timedelta(days=offset)).date()),
                    (Decimal("0"), 0),
                )[1],
            )
            for offset in range(days)
        ]
