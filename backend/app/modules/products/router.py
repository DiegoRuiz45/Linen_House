from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import (
    require_admin as get_admin_user,
    require_trusted_origin,
)
from app.modules.products.schemas import (
    ProductAdminListResponse,
    ProductBulkImportResponse,
    ProductCatalogResponse,
    ProductCreate,
    ProductDetailResponse,
    ProductImageResponse,
    ProductImageUpdate,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductVariantUpdate,
)
from app.modules.products.service import ProductService
from app.modules.users.model import User


# ==========================================================
# ROUTERS
# ==========================================================

public_router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


admin_router = APIRouter(
    prefix="/admin/products",
    tags=["Admin - Products"],
    dependencies=[Depends(require_trusted_origin)],
)
from app.modules.products.bulk_import import (
    BulkImportError,
    ProductBulkImporter,
)


# ==========================================================
# PÚBLICO - LISTAR PRODUCTOS
# ==========================================================

@public_router.get(
    "",
    response_model=list[
        ProductCatalogResponse
    ],
)
def get_products(
    db: Session = Depends(get_db),
):

    return (
        ProductService.get_active_products(
            db=db,
        )
    )


# ==========================================================
# PÚBLICO - DETALLE DEL PRODUCTO
# ==========================================================

@public_router.get(
    "/{slug}",
    response_model=ProductDetailResponse,
)
def get_product(
    slug: str,
    db: Session = Depends(get_db),
):

    return (
        ProductService.get_product_detail(
            db=db,
            slug=slug,
            public=True,
        )
    )


# ==========================================================
# ADMIN - LISTAR PRODUCTOS
# ==========================================================

@admin_router.get(
    "",
    response_model=list[
        ProductAdminListResponse
    ],
)
def admin_get_products(
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return (
        ProductService.get_all_products(
            db=db,
        )
    )


# ==========================================================
# ADMIN - CARGA MASIVA DE PRODUCTOS
# ==========================================================

@admin_router.post(
    "/bulk-upload",
    response_model=ProductBulkImportResponse,
)
async def bulk_upload_products(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    try:
        return ProductBulkImporter.import_file(
            db,
            content=content,
            filename=file.filename or "",
            user_id=current_admin.id,
        )
    except BulkImportError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error


# ==========================================================
# ADMIN - CREAR PRODUCTO
# ==========================================================

@admin_router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    data: ProductCreate,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    return (
        ProductService.create_product(
            db=db,
            data=data,
            user_id=current_admin.id,
        )
    )


# ==========================================================
# ADMIN - ACTUALIZAR PRODUCTO
# ==========================================================

@admin_router.put(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    data: ProductUpdate,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    return (
        ProductService.update_product(
            db=db,
            product_id=product_id,
            data=data,
        )
    )


# ==========================================================
# ADMIN - DESACTIVAR PRODUCTO
# ==========================================================

@admin_router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product(
    product_id: int,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    ProductService.deactivate_product(
        db=db,
        product_id=product_id,
    )


    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


# ==========================================================
# ADMIN - CREAR VARIANTE
# ==========================================================

@admin_router.post(
    "/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_variant(
    product_id: int,
    data: ProductVariantCreate,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    return (
        ProductService.create_variant(
            db=db,
            product_id=product_id,
            data=data,
            user_id=current_admin.id,
        )
    )


# ==========================================================
# ADMIN - ACTUALIZAR VARIANTE
# ==========================================================

@admin_router.put(
    "/{product_id}/variants/{variant_id}",
    response_model=ProductVariantResponse,
)
def update_variant(
    product_id: int,
    variant_id: int,
    data: ProductVariantUpdate,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    return (
        ProductService.update_variant(
            db=db,
            product_id=product_id,
            variant_id=variant_id,
            data=data,
        )
    )


# ==========================================================
# ADMIN - ELIMINAR VARIANTE
# ==========================================================

@admin_router.delete(
    "/{product_id}/variants/{variant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_variant(
    product_id: int,
    variant_id: int,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    ProductService.delete_variant(
        db=db,
        product_id=product_id,
        variant_id=variant_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


# ==========================================================
# ADMIN - SUBIR IMAGEN
# ==========================================================

@admin_router.post(
    "/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_product_image(
    product_id: int,

    file: UploadFile = File(...),

    alt_text: str | None = Form(
        default=None
    ),

    is_primary: bool = Form(
        default=False
    ),

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    return (
        await ProductService.upload_product_image(
            db=db,
            product_id=product_id,
            file=file,
            alt_text=alt_text,
            is_primary=is_primary,
        )
    )


# ==========================================================
# ADMIN - ELIMINAR IMAGEN
# ==========================================================

@admin_router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product_image(
    product_id: int,
    image_id: int,

    current_admin: User = Depends(
        get_admin_user
    ),

    db: Session = Depends(get_db),
):

    ProductService.delete_product_image(
        db=db,
        product_id=product_id,
        image_id=image_id,
    )


    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


@admin_router.patch(
    "/{product_id}/images/{image_id}",
    response_model=ProductImageResponse,
)
def update_product_image(
    product_id: int,
    image_id: int,
    data: ProductImageUpdate,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    return ProductService.update_product_image(
        db=db,
        product_id=product_id,
        image_id=image_id,
        data=data,
    )


@admin_router.get(
    "/{product_id}",
    response_model=ProductDetailResponse,
)
def admin_get_product(
    product_id: int,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    return ProductService.get_admin_product_detail(
        db=db,
        product_id=product_id,
    )
