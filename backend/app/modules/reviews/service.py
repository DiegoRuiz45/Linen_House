from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.orders.model import Order, OrderItem
from app.modules.reviews.model import Review
from app.modules.reviews.schemas import ReviewCreate, ReviewResponse
from app.modules.users.model import User
from app.shared.enums import OrderStatus, ReviewStatus


class ReviewService:
    @staticmethod
    def _response(review: Review, user: User) -> ReviewResponse:
        return ReviewResponse(
            id=review.id,
            product_id=review.product_id,
            user_id=review.user_id,
            customer_name=f"{user.first_name} {user.last_name or ''}".strip(),
            rating=review.rating,
            title=review.title,
            body=review.body,
            status=review.status,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )

    @staticmethod
    def list_public(db: Session, product_id: int) -> list[ReviewResponse]:
        rows = db.execute(
            select(Review, User)
            .join(User, User.id == Review.user_id)
            .where(Review.product_id == product_id, Review.status == ReviewStatus.APPROVED)
            .order_by(Review.created_at.desc())
        ).all()
        return [ReviewService._response(review, user) for review, user in rows]

    @staticmethod
    def create(db: Session, user_id: int, product_id: int, data: ReviewCreate) -> ReviewResponse:
        purchase = db.execute(
            select(OrderItem, User)
            .join(Order, Order.id == OrderItem.order_id)
            .join(User, User.id == Order.user_id)
            .where(
                Order.user_id == user_id,
                Order.status == OrderStatus.DELIVERED,
                OrderItem.product_id == product_id,
            )
            .order_by(Order.created_at.desc())
            .limit(1)
        ).first()
        if purchase is None:
            raise HTTPException(
                status_code=403,
                detail="Solo puedes reseñar productos de pedidos entregados.",
            )
        order_item, user = purchase
        review = Review(
            user_id=user_id,
            product_id=product_id,
            order_item_id=order_item.id,
            rating=data.rating,
            title=data.title or None,
            body=data.body,
            status=ReviewStatus.PENDING,
        )
        db.add(review)
        try:
            db.commit()
            db.refresh(review)
        except IntegrityError as error:
            db.rollback()
            raise HTTPException(status_code=409, detail="Ya reseñaste este producto.") from error
        return ReviewService._response(review, user)

    @staticmethod
    def list_admin(db: Session, review_status: ReviewStatus | None) -> list[ReviewResponse]:
        statement = (
            select(Review, User)
            .join(User, User.id == Review.user_id)
            .order_by(Review.created_at.desc())
        )
        if review_status is not None:
            statement = statement.where(Review.status == review_status)
        return [
            ReviewService._response(review, user)
            for review, user in db.execute(statement).all()
        ]

    @staticmethod
    def moderate(
        db: Session,
        review_id: int,
        review_status: ReviewStatus,
        admin_id: int,
    ) -> ReviewResponse:
        row = db.execute(
            select(Review, User)
            .join(User, User.id == Review.user_id)
            .where(Review.id == review_id)
        ).first()
        if row is None:
            raise HTTPException(status_code=404, detail="Reseña no encontrada.")
        review, user = row
        review.status = review_status
        review.moderated_by_user_id = admin_id
        review.moderated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(review)
        db.commit()
        db.refresh(review)
        return ReviewService._response(review, user)
