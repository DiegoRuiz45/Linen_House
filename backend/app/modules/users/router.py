from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import (
    get_current_user,
    require_admin,
    require_trusted_origin,
)
from app.modules.users.model import User
from app.modules.users.schemas import AdminCustomerResponse, UserResponse, UserUpdate
from app.modules.users.service import UserService


router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(require_trusted_origin)],
)

admin_router = APIRouter(
    prefix="/admin/customers",
    tags=["Admin - Customers"],
    dependencies=[Depends(require_trusted_origin)],
)


@router.patch("/me", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserService.update_profile(db, current_user, data)


@admin_router.get("", response_model=list[AdminCustomerResponse])
def list_customers(
    search: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=100, ge=1, le=250),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return UserService.list_customers(db, search, limit)
