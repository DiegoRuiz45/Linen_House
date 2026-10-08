from fastapi import (
    APIRouter,
    Depends,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import (
    get_current_user,
    require_trusted_origin,
)
from app.modules.carts.schemas import (
    CartItemCreate,
    CartItemUpdate,
    CartResponse,
    CartSyncRequest,
    CartSyncResponse,
)
from app.modules.carts.service import (
    CartService,
)
from app.modules.users.model import User


router = APIRouter(
    prefix="/cart",
    tags=["Cart"],
    dependencies=[Depends(require_trusted_origin)],
)


# ==========================================================
# VER CARRITO
# ==========================================================

@router.get(
    "",
    response_model=CartResponse,
)
def get_cart(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return CartService.get_cart(
        db=db,
        user_id=current_user.id,
    )


# ==========================================================
# AGREGAR
# ==========================================================

@router.post(
    "/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {
            "description": (
                "Stock insuficiente o producto no disponible."
            )
        },
    },
)

def add_item(
    data: CartItemCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return CartService.add_item(
        db=db,
        user_id=current_user.id,
        data=data,
    )


# ==========================================================
# CAMBIAR CANTIDAD
# ==========================================================

@router.put(
    "/items/{item_id}",
    response_model=CartResponse,
)
def update_item(
    item_id: int,
    data: CartItemUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return CartService.update_item(
        db=db,
        user_id=current_user.id,
        item_id=item_id,
        data=data,
    )


# ==========================================================
# ELIMINAR ITEM
# ==========================================================

@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_item(
    item_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    CartService.delete_item(
        db=db,
        user_id=current_user.id,
        item_id=item_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


# ==========================================================
# VACIAR CARRITO
# ==========================================================

@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
)
def clear_cart(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    CartService.clear_cart(
        db=db,
        user_id=current_user.id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )

# ==========================================================
# SINCRONIZAR CARRITO DE INVITADO
# ==========================================================

@router.post(
    "/sync",
    response_model=CartSyncResponse,
)
def sync_guest_cart(
    data: CartSyncRequest,

    current_user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    return CartService.sync_guest_cart(
        db=db,
        user_id=current_user.id,
        data=data,
    )
