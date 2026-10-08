from decimal import Decimal

from pydantic import (
    BaseModel,
    Field,
)


class CartItemCreate(BaseModel):

    variant_id: int = Field(
        gt=0
    )

    quantity: int = Field(
        default=1,
        gt=0,
        le=100,
    )


class CartItemUpdate(BaseModel):

    quantity: int = Field(
        gt=0,
        le=100,
    )


class CartItemResponse(BaseModel):

    id: int

    variant_id: int

    product_id: int
    product_name: str
    product_slug: str

    size: str
    color: str
    sku: str

    unit_price: Decimal

    quantity: int
    subtotal: Decimal

    stock_available: int

    available: bool

    image_url: str | None


class CartResponse(BaseModel):

    id: int

    items: list[CartItemResponse]

    total_items: int

    subtotal: Decimal

class CartSyncItem(BaseModel):

    product_slug: str = Field(
        min_length=1,
        max_length=180,
    )

    size: str = Field(
        min_length=1,
        max_length=50,
    )

    color: str = Field(
        min_length=1,
        max_length=80,
    )

    quantity: int = Field(
        gt=0,
        le=100,
    )


class CartSyncRequest(BaseModel):

    items: list[CartSyncItem] = Field(
        default_factory=list,
        max_length=100,
    )


class CartSyncIssue(BaseModel):

    product_slug: str
    size: str
    color: str
    quantity: int

    detail: str


class CartSyncResponse(BaseModel):

    cart: CartResponse

    synced_items: int

    issues: list[CartSyncIssue] = Field(
        default_factory=list
    )
