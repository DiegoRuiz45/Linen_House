from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)

from app.shared.enums import InventoryMovementType


class StockChangeRequest(BaseModel):

    quantity: int = Field(
        gt=0
    )

    reason: str | None = Field(
        default=None,
        max_length=1000,
    )


class StockAdjustmentRequest(BaseModel):

    stock: int = Field(
        ge=0
    )

    reason: str = Field(
        min_length=3,
        max_length=1000,
    )


class InventoryMovementResponse(BaseModel):

    id: int
    variant_id: int

    movement_type: InventoryMovementType

    quantity_change: int

    stock_before: int
    stock_after: int

    reason: str | None

    reference_type: str | None
    reference_id: int | None

    created_by_user_id: int | None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class InventoryVariantResponse(BaseModel):

    variant_id: int
    product_id: int

    product_name: str

    sku: str
    size: str
    color: str

    stock: int
    minimum_stock: int

    low_stock: bool
    out_of_stock: bool

    active: bool