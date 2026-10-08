from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import (
    get_current_user,
    require_admin,
    require_trusted_origin,
)
from app.modules.orders.schemas import AdminOrderUpdate, CheckoutRequest, OrderResponse
from app.modules.orders.service import OrderService
from app.modules.users.model import User
from app.shared.enums import OrderStatus


customer_router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
    dependencies=[Depends(require_trusted_origin)],
)
admin_router = APIRouter(
    prefix="/admin/orders",
    tags=["Admin - Orders"],
    dependencies=[Depends(require_trusted_origin)],
)


@customer_router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.checkout(db, current_user.id, data)


@customer_router.get("", response_model=list[OrderResponse])
def list_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.list_for_user(db, current_user.id)


@customer_router.get("/{order_number}", response_model=OrderResponse)
def get_order(
    order_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return OrderService.get_for_user(db, current_user.id, order_number)


@admin_router.get("", response_model=list[OrderResponse])
def admin_list_orders(
    order_status: OrderStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=250),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return OrderService.list_admin(db, order_status, limit)


@admin_router.get("/{order_id}", response_model=OrderResponse)
def admin_get_order(
    order_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return OrderService.get_admin(db, order_id)


@admin_router.patch("/{order_id}", response_model=OrderResponse)
def admin_update_order(
    order_id: int,
    data: AdminOrderUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return OrderService.update_admin(db, order_id, data, current_admin.id)
