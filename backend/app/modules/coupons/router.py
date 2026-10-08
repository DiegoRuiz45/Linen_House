from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_admin, require_trusted_origin
from app.modules.coupons.schemas import CouponCreate, CouponResponse, CouponUpdate
from app.modules.coupons.service import CouponService
from app.modules.users.model import User


router = APIRouter(
    prefix="/admin/coupons",
    tags=["Admin - Coupons"],
    dependencies=[Depends(require_trusted_origin)],
)


@router.get("", response_model=list[CouponResponse])
def list_coupons(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return CouponService.list_all(db)


@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
def create_coupon(
    data: CouponCreate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return CouponService.create(db, data)


@router.patch("/{coupon_id}", response_model=CouponResponse)
def update_coupon(
    coupon_id: int,
    data: CouponUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return CouponService.update(db, coupon_id, data)
