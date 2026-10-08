from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ==========================================================
# VARIANTES
# ==========================================================

class ProductVariantCreate(BaseModel):

    size: str = Field(
        min_length=1,
        max_length=50,
    )

    color: str = Field(
        min_length=1,
        max_length=80,
    )

    sku: str = Field(
        min_length=2,
        max_length=100,
    )

    price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    previous_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    stock: int = Field(
        default=0,
        ge=0,
    )

    minimum_stock: int = Field(
        default=0,
        ge=0,
    )

    active: bool = True

    # ======================================================
    # LIMPIEZA DE TEXTO
    # ======================================================

    @field_validator(
        "size",
        "color",
        "sku",
    )
    @classmethod
    def clean_text(
        cls,
        value: str,
    ) -> str:

        return value.strip()


# ==========================================================
# ACTUALIZAR VARIANTE
# ==========================================================

class ProductVariantUpdate(BaseModel):

    size: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    color: str | None = Field(
        default=None,
        min_length=1,
        max_length=80,
    )

    sku: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    previous_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    minimum_stock: int | None = Field(
        default=None,
        ge=0,
    )

    active: bool | None = None

    # IMPORTANTE:
    # No incluimos "stock" aquí.
    #
    # El stock únicamente se modifica desde
    # el módulo de inventario para conservar
    # el historial de movimientos.

    @field_validator(
        "size",
        "color",
        "sku",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        return value.strip()


# ==========================================================
# RESPUESTA DE VARIANTE
# ==========================================================

class ProductVariantResponse(BaseModel):

    id: int
    product_id: int

    size: str
    color: str
    sku: str

    price: Decimal | None
    previous_price: Decimal | None

    stock: int
    minimum_stock: int

    active: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# IMÁGENES
# ==========================================================

class ProductImageResponse(BaseModel):

    id: int
    product_id: int

    file_name: str
    image_url: str

    alt_text: str | None

    position: int
    is_primary: bool

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ProductImageUpdate(BaseModel):

    alt_text: str | None = Field(
        default=None,
        max_length=255,
    )

    position: int | None = Field(
        default=None,
        ge=0,
    )

    is_primary: bool | None = None

    @field_validator("alt_text")
    @classmethod
    def clean_optional_alt_text(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip()
        return value or None


# ==========================================================
# CREAR PRODUCTO
# ==========================================================

class ProductCreate(BaseModel):

    category_id: int = Field(
        gt=0
    )

    name: str = Field(
        min_length=2,
        max_length=150,
    )

    description: str | None = None

    base_price: Decimal = Field(
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    previous_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    featured: bool = False

    active: bool = True

    variants: list[ProductVariantCreate] = Field(
        default_factory=list,
        max_length=100,
    )

    # ======================================================
    # LIMPIEZA
    # ======================================================

    @field_validator(
        "name"
    )
    @classmethod
    def clean_name(
        cls,
        value: str,
    ) -> str:

        return value.strip()


    @field_validator(
        "description"
    )
    @classmethod
    def clean_description(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip()

        return value or None


# ==========================================================
# CARGA MASIVA
# ==========================================================

class ProductBulkImportItem(BaseModel):
    product_key: str
    name: str | None = None
    created: bool
    product_id: int | None = None
    message: str


class ProductBulkImportResponse(BaseModel):
    processed_products: int
    created_products: int
    failed_products: int
    skipped_rows: int
    results: list[ProductBulkImportItem]


# ==========================================================
# ACTUALIZAR PRODUCTO
# ==========================================================

class ProductUpdate(BaseModel):

    category_id: int | None = Field(
        default=None,
        gt=0,
    )

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    description: str | None = None

    base_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    previous_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    active: bool | None = None

    featured: bool | None = None

    # ======================================================
    # LIMPIEZA
    # ======================================================

    @field_validator(
        "name"
    )
    @classmethod
    def clean_optional_name(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        return value.strip()


    @field_validator(
        "description"
    )
    @classmethod
    def clean_optional_description(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip()

        return value or None


# ==========================================================
# RESPUESTA BASE DEL PRODUCTO
# ==========================================================

class ProductResponse(BaseModel):

    id: int

    category_id: int

    name: str
    slug: str

    description: str | None

    base_price: Decimal
    previous_price: Decimal | None

    active: bool
    featured: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ProductAdminListResponse(ProductResponse):

    category_name: str
    primary_image_url: str | None
    variants_count: int = Field(ge=0)
    stock_total: int = Field(ge=0)


# ==========================================================
# DETALLE DEL PRODUCTO
# ==========================================================

class ProductDetailResponse(
    ProductResponse
):

    category_name: str
    category_slug: str

    images: list[
        ProductImageResponse
    ] = Field(
        default_factory=list
    )

    variants: list[
        ProductVariantResponse
    ] = Field(
        default_factory=list
    )


# ==========================================================
# PRODUCTO PARA CATÁLOGO PÚBLICO
# ==========================================================

class ProductCatalogResponse(
    ProductResponse
):

    category_name: str
    category_slug: str

    primary_image_url: str | None

    sizes: list[str] = Field(
        default_factory=list
    )

    colors: list[str] = Field(
        default_factory=list
    )

    stock_total: int = Field(
        ge=0
    )

    in_stock: bool
