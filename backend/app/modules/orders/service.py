from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from secrets import token_hex

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.modules.carts.model import Cart, CartItem
from app.modules.coupons.model import Coupon, CouponUsage
from app.modules.inventory.model import InventoryMovement
from app.modules.notifications.model import Notification
from app.modules.orders.model import Order, OrderItem, OrderStatusHistory
from app.modules.orders.schemas import AdminOrderUpdate, CheckoutRequest
from app.modules.products.model import Product, ProductVariant
from app.shared.enums import (
    CouponDiscountType,
    InventoryMovementType,
    OrderStatus,
    PaymentStatus,
)


MONEY = Decimal("0.01")

ORDER_NOTIFICATION_TITLES = {
    OrderStatus.PAID: "pagado",
    OrderStatus.PREPARING: "en preparación",
    OrderStatus.SHIPPED: "enviado",
    OrderStatus.DELIVERED: "entregado",
    OrderStatus.CANCELLED: "cancelado",
    OrderStatus.REFUNDED: "reembolsado",
}

ORDER_NOTIFICATION_MESSAGES = {
    OrderStatus.PAID: "pagado",
    OrderStatus.PREPARING: "en preparación",
    OrderStatus.SHIPPED: "en camino",
    OrderStatus.DELIVERED: "entregado",
    OrderStatus.CANCELLED: "cancelado",
    OrderStatus.REFUNDED: "reembolsado",
}


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class OrderService:
    TRANSITIONS = {
        OrderStatus.PENDING_PAYMENT: {OrderStatus.PAID, OrderStatus.CANCELLED},
        OrderStatus.PAID: {OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.REFUNDED},
        OrderStatus.PREPARING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
        OrderStatus.DELIVERED: set(),
        OrderStatus.CANCELLED: set(),
        OrderStatus.REFUNDED: set(),
    }
    ADMIN_TRANSITIONS = {
        **TRANSITIONS,
        OrderStatus.PENDING_PAYMENT: {OrderStatus.CANCELLED},
    }

    @staticmethod
    def admin_transitions(status_value: OrderStatus) -> set[OrderStatus]:
        allowed = set(OrderService.ADMIN_TRANSITIONS[status_value])
        if (
            status_value == OrderStatus.PENDING_PAYMENT
            and settings.test_order_mode_enabled
        ):
            allowed.add(OrderStatus.PAID)
        return allowed

    @staticmethod
    def _order_query():
        return select(Order).options(
            selectinload(Order.items),
            selectinload(Order.history),
        )

    @staticmethod
    def _get_detailed(db: Session, order_id: int) -> Order:
        order = db.scalar(OrderService._order_query().where(Order.id == order_id))
        if order is None:
            raise HTTPException(status_code=404, detail="Pedido no encontrado.")
        return order

    @staticmethod
    def _calculate_discount(
        db: Session,
        *,
        code: str | None,
        subtotal: Decimal,
        user_id: int,
    ) -> tuple[Coupon | None, Decimal]:
        if not code:
            return None, Decimal("0.00")

        coupon = db.scalar(
            select(Coupon).where(Coupon.code == code).with_for_update()
        )
        now = utc_now_naive()
        invalid = (
            coupon is None
            or not coupon.active
            or (coupon.starts_at is not None and coupon.starts_at > now)
            or (coupon.ends_at is not None and coupon.ends_at < now)
        )
        if invalid:
            raise HTTPException(status_code=422, detail="El cupón no es válido o está vencido.")

        if subtotal < coupon.minimum_subtotal:
            raise HTTPException(
                status_code=422,
                detail="El pedido no alcanza el mínimo requerido por el cupón.",
            )
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            raise HTTPException(status_code=422, detail="El cupón agotó sus usos.")

        user_uses = db.scalar(
            select(func.count(CouponUsage.id)).where(
                CouponUsage.coupon_id == coupon.id,
                CouponUsage.user_id == user_id,
            )
        ) or 0
        if user_uses >= coupon.per_user_limit:
            raise HTTPException(status_code=422, detail="Ya utilizaste este cupón.")

        if coupon.discount_type == CouponDiscountType.PERCENT:
            discount = subtotal * (coupon.value / Decimal("100"))
        else:
            discount = coupon.value

        if coupon.maximum_discount is not None:
            discount = min(discount, coupon.maximum_discount)
        return coupon, min(discount, subtotal).quantize(MONEY, rounding=ROUND_HALF_UP)

    @staticmethod
    def checkout(db: Session, user_id: int, data: CheckoutRequest) -> Order:
        if not settings.test_order_mode_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "La creación de pedidos de prueba solo está "
                    "habilitada en el entorno local."
                ),
            )

        existing = db.scalar(
            OrderService._order_query().where(
                Order.user_id == user_id,
                Order.idempotency_key == data.idempotency_key,
            )
        )
        if existing is not None:
            return existing

        try:
            cart = db.scalar(select(Cart).where(Cart.user_id == user_id))
            if cart is None:
                raise HTTPException(status_code=409, detail="El carrito está vacío.")

            cart_items = list(
                db.scalars(
                    select(CartItem)
                    .where(CartItem.cart_id == cart.id)
                    .order_by(CartItem.variant_id)
                ).all()
            )
            if not cart_items:
                raise HTTPException(status_code=409, detail="El carrito está vacío.")

            variant_ids = [item.variant_id for item in cart_items]
            variants = {
                variant.id: variant
                for variant in db.scalars(
                    select(ProductVariant)
                    .where(ProductVariant.id.in_(variant_ids))
                    .order_by(ProductVariant.id)
                    .with_for_update()
                ).all()
            }
            product_ids = {variant.product_id for variant in variants.values()}
            products = {
                product.id: product
                for product in db.scalars(
                    select(Product).where(Product.id.in_(product_ids))
                ).all()
            }

            snapshots: list[tuple[CartItem, ProductVariant, Product, Decimal]] = []
            subtotal = Decimal("0.00")
            for item in cart_items:
                variant = variants.get(item.variant_id)
                product = products.get(variant.product_id) if variant else None
                if (
                    variant is None
                    or product is None
                    or not variant.active
                    or not product.active
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="Uno de los productos ya no está disponible.",
                    )
                if item.quantity > variant.stock:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Stock insuficiente para {product.name} ({variant.size}, {variant.color}).",
                    )
                unit_price = variant.price if variant.price is not None else product.base_price
                line_total = (unit_price * item.quantity).quantize(MONEY)
                subtotal += line_total
                snapshots.append((item, variant, product, unit_price))

            coupon, discount = OrderService._calculate_discount(
                db,
                code=data.coupon_code,
                subtotal=subtotal,
                user_id=user_id,
            )
            shipping_total = Decimal("0.00")
            total = (subtotal - discount + shipping_total).quantize(MONEY)
            order = Order(
                number=f"LH-{datetime.now():%Y%m%d}-{token_hex(4).upper()}",
                user_id=user_id,
                idempotency_key=data.idempotency_key,
                coupon_id=coupon.id if coupon else None,
                coupon_code=coupon.code if coupon else None,
                status=OrderStatus.PENDING_PAYMENT,
                payment_status=PaymentStatus.PENDING,
                subtotal=subtotal,
                discount_total=discount,
                shipping_total=shipping_total,
                total=total,
                customer_first_name=data.first_name,
                customer_last_name=data.last_name,
                customer_email=str(data.email).lower(),
                customer_phone=data.phone,
                department=data.department,
                city=data.city,
                address=data.address,
                address_extra=data.address_extra,
                postal_code=data.postal_code,
                customer_notes=data.notes,
                reservation_expires_at=(
                    utc_now_naive()
                    + timedelta(minutes=settings.ORDER_RESERVATION_MINUTES)
                ),
            )
            db.add(order)
            db.flush()

            for item, variant, product, unit_price in snapshots:
                line_total = (unit_price * item.quantity).quantize(MONEY)
                db.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        variant_id=variant.id,
                        product_name=product.name,
                        product_slug=product.slug,
                        sku=variant.sku,
                        size=variant.size,
                        color=variant.color,
                        unit_price=unit_price,
                        quantity=item.quantity,
                        subtotal=line_total,
                    )
                )
                stock_before = variant.stock
                variant.stock -= item.quantity
                db.add(
                    InventoryMovement(
                        variant_id=variant.id,
                        movement_type=InventoryMovementType.SALE,
                        quantity_change=-item.quantity,
                        stock_before=stock_before,
                        stock_after=variant.stock,
                        reason=f"Reserva de inventario para pedido {order.number}",
                        reference_type="order",
                        reference_id=order.id,
                        created_by_user_id=user_id,
                    )
                )

            db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=None,
                    to_status=OrderStatus.PENDING_PAYMENT,
                    note="Pedido creado; inventario reservado.",
                    changed_by_user_id=user_id,
                )
            )
            db.add(
                Notification(
                    user_id=user_id,
                    notification_type="order_created",
                    title="Pago pendiente",
                    message=f"El pago del pedido {order.number} está pendiente.",
                    reference_type="order",
                    reference_id=order.id,
                )
            )
            if coupon:
                coupon.used_count += 1
                db.add(
                    CouponUsage(
                        coupon_id=coupon.id,
                        order_id=order.id,
                        user_id=user_id,
                    )
                )

            db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
            db.commit()
            return OrderService._get_detailed(db, order.id)
        except HTTPException:
            db.rollback()
            raise
        except IntegrityError as error:
            db.rollback()
            existing = db.scalar(
                OrderService._order_query().where(
                    Order.user_id == user_id,
                    Order.idempotency_key == data.idempotency_key,
                )
            )
            if existing is not None:
                return existing
            raise HTTPException(status_code=409, detail="No fue posible crear el pedido.") from error
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="No fue posible crear el pedido.",
            ) from error

    @staticmethod
    def list_for_user(db: Session, user_id: int) -> list[Order]:
        return list(
            db.scalars(
                OrderService._order_query()
                .where(Order.user_id == user_id)
                .order_by(Order.created_at.desc())
            ).unique().all()
        )

    @staticmethod
    def get_for_user(db: Session, user_id: int, number: str) -> Order:
        order = db.scalar(
            OrderService._order_query().where(
                Order.user_id == user_id,
                Order.number == number,
            )
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Pedido no encontrado.")
        return order

    @staticmethod
    def list_admin(
        db: Session,
        order_status: OrderStatus | None = None,
        limit: int = 100,
    ) -> list[Order]:
        statement = OrderService._order_query().order_by(Order.created_at.desc()).limit(limit)
        if order_status is not None:
            statement = statement.where(Order.status == order_status)
        return list(db.scalars(statement).unique().all())

    @staticmethod
    def get_admin(db: Session, order_id: int) -> Order:
        return OrderService._get_detailed(db, order_id)

    @staticmethod
    def update_admin(
        db: Session,
        order_id: int,
        data: AdminOrderUpdate,
        admin_id: int,
    ) -> Order:
        try:
            order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
            if order is None:
                raise HTTPException(status_code=404, detail="Pedido no encontrado.")
            if data.status not in OrderService.admin_transitions(order.status):
                raise HTTPException(
                    status_code=409,
                    detail=f"No se permite cambiar de {order.status.value} a {data.status.value}.",
                )

            old_status = order.status
            now = utc_now_naive()
            if data.status == OrderStatus.PAID:
                order.payment_status = PaymentStatus.PAID
                order.paid_at = now
                order.reservation_expires_at = None
            elif data.status == OrderStatus.CANCELLED:
                OrderService._restore_inventory(db, order, admin_id)
                order.cancelled_at = now
                order.reservation_expires_at = None
                if order.payment_status == PaymentStatus.PENDING:
                    order.payment_status = PaymentStatus.FAILED
                if order.coupon_id is not None:
                    coupon = db.scalar(
                        select(Coupon).where(Coupon.id == order.coupon_id).with_for_update()
                    )
                    if coupon is not None and coupon.used_count > 0:
                        coupon.used_count -= 1
                    db.execute(
                        delete(CouponUsage).where(CouponUsage.order_id == order.id)
                    )
            elif data.status == OrderStatus.SHIPPED:
                order.shipping_carrier = data.shipping_carrier.strip()
                order.tracking_number = data.tracking_number.strip()
                order.shipped_at = now
            elif data.status == OrderStatus.DELIVERED:
                order.delivered_at = now
            elif data.status == OrderStatus.REFUNDED:
                OrderService._restore_inventory(
                    db,
                    order,
                    admin_id,
                    movement_type=InventoryMovementType.RETURN,
                    reason_prefix="Reembolso",
                )
                order.payment_status = PaymentStatus.REFUNDED
                order.reservation_expires_at = None

            order.status = data.status
            if data.admin_notes is not None:
                order.admin_notes = data.admin_notes.strip() or None
            db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=old_status,
                    to_status=data.status,
                    note=data.note.strip() if data.note else None,
                    changed_by_user_id=admin_id,
                )
            )
            db.add(
                Notification(
                    user_id=order.user_id,
                    notification_type="order_status",
                    title=f"Pedido {ORDER_NOTIFICATION_TITLES[data.status]}",
                    message=(
                        f"Tu pedido {order.number} ahora está "
                        f"{ORDER_NOTIFICATION_MESSAGES[data.status]}."
                    ),
                    reference_type="order",
                    reference_id=order.id,
                )
            )
            db.commit()
            return OrderService._get_detailed(db, order.id)
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(status_code=500, detail="No fue posible actualizar el pedido.") from error

    @staticmethod
    def expire_pending_reservations(db: Session, limit: int = 100) -> int:
        try:
            now = utc_now_naive()
            orders = list(
                db.scalars(
                    select(Order)
                    .where(
                        Order.status == OrderStatus.PENDING_PAYMENT,
                        Order.reservation_expires_at.is_not(None),
                        Order.reservation_expires_at <= now,
                    )
                    .order_by(Order.id)
                    .limit(limit)
                    .with_for_update()
                ).all()
            )
            for order in orders:
                OrderService._restore_inventory(db, order, None)
                order.status = OrderStatus.CANCELLED
                order.payment_status = PaymentStatus.FAILED
                order.cancelled_at = now
                order.reservation_expires_at = None

                if order.coupon_id is not None:
                    coupon = db.scalar(
                        select(Coupon)
                        .where(Coupon.id == order.coupon_id)
                        .with_for_update()
                    )
                    if coupon is not None and coupon.used_count > 0:
                        coupon.used_count -= 1
                    db.execute(
                        delete(CouponUsage).where(CouponUsage.order_id == order.id)
                    )

                db.add(
                    OrderStatusHistory(
                        order_id=order.id,
                        from_status=OrderStatus.PENDING_PAYMENT,
                        to_status=OrderStatus.CANCELLED,
                        note="Reserva vencida sin confirmación de pago.",
                        changed_by_user_id=None,
                    )
                )
                db.add(
                    Notification(
                        user_id=order.user_id,
                        notification_type="order_expired",
                        title="Reserva vencida",
                        message=f"La reserva del pedido {order.number} venció sin pago.",
                        reference_type="order",
                        reference_id=order.id,
                    )
                )

            db.commit()
            return len(orders)
        except (HTTPException, SQLAlchemyError):
            db.rollback()
            raise

    @staticmethod
    def _restore_inventory(
        db: Session,
        order: Order,
        admin_id: int | None,
        *,
        movement_type: InventoryMovementType = InventoryMovementType.CANCELLATION,
        reason_prefix: str = "Cancelación",
    ) -> None:
        items = list(db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all())
        variant_ids = sorted({item.variant_id for item in items})
        variants = {
            variant.id: variant
            for variant in db.scalars(
                select(ProductVariant)
                .where(ProductVariant.id.in_(variant_ids))
                .order_by(ProductVariant.id)
                .with_for_update()
            ).all()
        }
        for item in items:
            variant = variants.get(item.variant_id)
            if variant is None:
                raise HTTPException(status_code=409, detail="No se pudo restituir el inventario.")
            stock_before = variant.stock
            variant.stock += item.quantity
            db.add(
                InventoryMovement(
                    variant_id=variant.id,
                    movement_type=movement_type,
                    quantity_change=item.quantity,
                    stock_before=stock_before,
                    stock_after=variant.stock,
                    reason=f"{reason_prefix} del pedido {order.number}",
                    reference_type="order",
                    reference_id=order.id,
                    created_by_user_id=admin_id,
                )
            )
