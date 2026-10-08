from fastapi import (
    APIRouter,
    Depends,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import (
    require_admin as get_admin_user,
    require_trusted_origin,
)
from app.modules.categories.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.modules.categories.service import CategoryService
from app.modules.users.model import User


# ==========================================================
# PUBLIC ROUTER
# ==========================================================

public_router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


# ==========================================================
# ADMIN ROUTER
# ==========================================================

admin_router = APIRouter(
    prefix="/admin/categories",
    tags=["Admin - Categories"],
    dependencies=[Depends(require_trusted_origin)],
)


# ==========================================================
# PÚBLICO - LISTAR CATEGORÍAS ACTIVAS
# ==========================================================

@public_router.get(
    "",
    response_model=list[CategoryResponse],
)
def get_categories(
    db: Session = Depends(get_db),
):

    return CategoryService.get_active_categories(
        db
    )


# ==========================================================
# ADMIN - LISTAR TODAS
# ==========================================================

@admin_router.get(
    "",
    response_model=list[CategoryResponse],
)
def admin_get_categories(
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return CategoryService.get_all_categories(
        db
    )


# ==========================================================
# ADMIN - CREAR
# ==========================================================

@admin_router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    data: CategoryCreate,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return CategoryService.create_category(
        db,
        data,
    )


# ==========================================================
# ADMIN - ACTUALIZAR
# ==========================================================

@admin_router.put(
    "/{category_id}",
    response_model=CategoryResponse,
)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return CategoryService.update_category(
        db,
        category_id,
        data,
    )


# ==========================================================
# ADMIN - ELIMINAR LÓGICAMENTE
# ==========================================================

@admin_router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_category(
    category_id: int,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    CategoryService.delete_category(
        db,
        category_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
