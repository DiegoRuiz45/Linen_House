from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.shared.enums import OrderStatus, PaymentStatus


class CheckoutRequest(BaseModel):
    idempotency_key: str = Field(min_length=16, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    department: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=3, max_length=255)
    address_extra: str | None = Field(default=None, max_length=255)
    postal_code: str | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)
    coupon_code: str | None = Field(default=None, max_length=50)

    @field_validator(
        "first_name", "last_name", "phone", "department", "city", "address",
        mode="after",
    )
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Este campo no puede estar vacío.")
        return cleaned

    @field_validator("address_extra", "postal_code", "notes", mode="after")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("coupon_code")
    @classmethod
    def normalize_coupon(cls, value: str | None) -> str | None:
        return value.strip().upper() if value and value.strip() else None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    variant_id: int
    product_name: str
    product_slug: str
    sku: str
    size: str
    color: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal
    model_config = ConfigDict(from_attributes=True)


class OrderHistoryResponse(BaseModel):
    id: int
    from_status: OrderStatus | None
    to_status: OrderStatus
    note: str | None
    changed_by_user_id: int | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    number: str
    user_id: int
    coupon_code: str | None
    status: OrderStatus
    payment_status: PaymentStatus
    currency: str
    subtotal: Decimal
    discount_total: Decimal
    shipping_total: Decimal
    total: Decimal
    customer_first_name: str
    customer_last_name: str
    customer_email: EmailStr
    customer_phone: str
    department: str
    city: str
    address: str
    address_extra: str | None
    postal_code: str | None
    customer_notes: str | None
    admin_notes: str | None
    shipping_carrier: str | None
    tracking_number: str | None
    reservation_expires_at: datetime | None
    paid_at: datetime | None
    shipped_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse]
    history: list[OrderHistoryResponse]
    model_config = ConfigDict(from_attributes=True)


class AdminOrderUpdate(BaseModel):
    status: OrderStatus
    shipping_carrier: str | None = Field(default=None, max_length=100)
    tracking_number: str | None = Field(default=None, max_length=150)
    note: str | None = Field(default=None, max_length=500)
    admin_notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_shipping(self):
        if self.status == OrderStatus.SHIPPED:
            if not self.shipping_carrier or not self.tracking_number:
                raise ValueError("Transportadora y guía son obligatorias al enviar.")
        if self.status in {
            OrderStatus.PAID,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
        } and not (self.note and self.note.strip()):
            raise ValueError("La nota de auditoría es obligatoria para este cambio.")
        return self
