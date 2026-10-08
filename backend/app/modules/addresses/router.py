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
from app.modules.addresses.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
)
from app.modules.addresses.service import AddressService
from app.modules.users.model import User


router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"],
    dependencies=[Depends(require_trusted_origin)],
)


# ==========================================================
# LISTAR DIRECCIONES
# ==========================================================

@router.get(
    "",
    response_model=list[AddressResponse],
)
def get_addresses(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return AddressService.get_user_addresses(
        db,
        current_user.id,
    )


# ==========================================================
# CREAR DIRECCIÓN
# ==========================================================

@router.post(
    "",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_address(
    data: AddressCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return AddressService.create_address(
        db,
        current_user.id,
        data,
    )


# ==========================================================
# ACTUALIZAR DIRECCIÓN
# ==========================================================

@router.put(
    "/{address_id}",
    response_model=AddressResponse,
)
def update_address(
    address_id: int,
    data: AddressUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    return AddressService.update_address(
        db,
        current_user.id,
        address_id,
        data,
    )


# ==========================================================
# ELIMINAR DIRECCIÓN
# ==========================================================

@router.delete(
    "/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_address(
    address_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    AddressService.delete_address(
        db,
        current_user.id,
        address_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
