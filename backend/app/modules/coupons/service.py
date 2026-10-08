from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.coupons.model import Coupon
from app.modules.coupons.schemas import CouponCreate, CouponUpdate
from app.shared.enums import CouponDiscountType


class CouponService:
    @staticmethod
    def list_all(db: Session) -> list[Coupon]:
        return list(db.scalars(select(Coupon).order_by(Coupon.created_at.desc())).all())

    @staticmethod
    def create(db: Session, data: CouponCreate) -> Coupon:
        coupon = Coupon(**data.model_dump())
        db.add(coupon)
        try:
            db.commit()
            db.refresh(coupon)
            return coupon
        except IntegrityError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un cupón con ese código.",
            ) from error

    @staticmethod
    def update(db: Session, coupon_id: int, data: CouponUpdate) -> Coupon:
        coupon = db.get(Coupon, coupon_id)
        if coupon is None:
            raise HTTPException(status_code=404, detail="Cupón no encontrado.")

        changes = data.model_dump(exclude_unset=True)
        for field, value in changes.items():
            setattr(coupon, field, value)

        if coupon.discount_type == CouponDiscountType.PERCENT and coupon.value > 100:
            raise HTTPException(status_code=422, detail="El porcentaje no puede superar 100.")
        if coupon.starts_at and coupon.ends_at and coupon.ends_at <= coupon.starts_at:
            raise HTTPException(
                status_code=422,
                detail="La fecha final debe ser posterior a la inicial.",
            )
        if coupon.usage_limit is not None and coupon.usage_limit < coupon.used_count:
            raise HTTPException(
                status_code=422,
                detail="El límite no puede ser menor a los usos existentes.",
            )

        db.add(coupon)
        db.commit()
        db.refresh(coupon)
        return coupon
