from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import (
    require_admin as get_admin_user,
    require_trusted_origin,
)
from app.modules.inventory.schemas import (
    InventoryMovementResponse,
    InventoryVariantResponse,
    StockAdjustmentRequest,
    StockChangeRequest,
)
from app.modules.inventory.service import InventoryService
from app.modules.users.model import User


router = APIRouter(
    prefix="/admin/inventory",
    tags=["Admin - Inventory"],
    dependencies=[Depends(require_trusted_origin)],
)


# ==========================================================
# INVENTARIO ACTUAL
# ==========================================================

@router.get(
    "",
    response_model=list[
        InventoryVariantResponse
    ],
)
def get_inventory(
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return (
        InventoryService.get_inventory(
            db
        )
    )


# ==========================================================
# HISTORIAL
# ==========================================================

@router.get(
    "/{variant_id}/movements",
    response_model=list[
        InventoryMovementResponse
    ],
)
def get_movements(
    variant_id: int,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return (
        InventoryService.get_movements(
            db,
            variant_id,
        )
    )


# ==========================================================
# ENTRADA
# ==========================================================

@router.post(
    "/{variant_id}/stock-in",
    response_model=(
        InventoryMovementResponse
    ),
    status_code=status.HTTP_201_CREATED,
)
def stock_in(
    variant_id: int,
    data: StockChangeRequest,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return InventoryService.stock_in(
        db=db,
        variant_id=variant_id,
        data=data,
        user_id=current_admin.id,
    )


# ==========================================================
# SALIDA
# ==========================================================

@router.post(
    "/{variant_id}/stock-out",
    response_model=(
        InventoryMovementResponse
    ),
    status_code=status.HTTP_201_CREATED,
)
def stock_out(
    variant_id: int,
    data: StockChangeRequest,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return InventoryService.stock_out(
        db=db,
        variant_id=variant_id,
        data=data,
        user_id=current_admin.id,
    )


# ==========================================================
# AJUSTE
# ==========================================================

@router.post(
    "/{variant_id}/adjust",
    response_model=(
        InventoryMovementResponse
    ),
    status_code=status.HTTP_201_CREATED,
)
def adjust_stock(
    variant_id: int,
    data: StockAdjustmentRequest,
    current_admin: User = Depends(
        get_admin_user
    ),
    db: Session = Depends(get_db),
):

    return InventoryService.adjust_stock(
        db=db,
        variant_id=variant_id,
        data=data,
        user_id=current_admin.id,
    )
