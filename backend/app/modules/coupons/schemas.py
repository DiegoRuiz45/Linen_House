from datetime import datetime, timezone
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.shared.enums import CouponDiscountType


class CouponCreate(BaseModel):
    code: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    description: str | None = Field(default=None, max_length=255)
    discount_type: CouponDiscountType
    value: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    minimum_subtotal: Decimal = Field(default=0, ge=0, max_digits=12, decimal_places=2)
    maximum_discount: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    usage_limit: int | None = Field(default=None, gt=0)
    per_user_limit: int = Field(default=1, gt=0)
    active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("starts_at", "ends_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    @model_validator(mode="after")
    def validate_rules(self):
        if self.discount_type == CouponDiscountType.PERCENT and self.value > 100:
            raise ValueError("El porcentaje no puede superar 100.")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("La fecha final debe ser posterior a la inicial.")
        return self


class CouponUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=255)
    value: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    minimum_subtotal: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    maximum_discount: Decimal | None = Field(
        default=None, gt=0, max_digits=12, decimal_places=2
    )
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    usage_limit: int | None = Field(default=None, gt=0)
    per_user_limit: int | None = Field(default=None, gt=0)
    active: bool | None = None

    @field_validator("starts_at", "ends_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value


class CouponResponse(BaseModel):
    id: int
    code: str
    description: str | None
    discount_type: CouponDiscountType
    value: Decimal
    minimum_subtotal: Decimal
    maximum_discount: Decimal | None
    starts_at: datetime | None
    ends_at: datetime | None
    usage_limit: int | None
    per_user_limit: int
    used_count: int
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
