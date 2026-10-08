from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user, require_admin, require_trusted_origin
from app.modules.reviews.schemas import ReviewCreate, ReviewModerate, ReviewResponse
from app.modules.reviews.service import ReviewService
from app.modules.users.model import User
from app.shared.enums import ReviewStatus


router = APIRouter(
    prefix="/products",
    tags=["Reviews"],
    dependencies=[Depends(require_trusted_origin)],
)
admin_router = APIRouter(
    prefix="/admin/reviews",
    tags=["Admin - Reviews"],
    dependencies=[Depends(require_trusted_origin)],
)


@router.get("/{product_id}/reviews", response_model=list[ReviewResponse])
def list_reviews(product_id: int, db: Session = Depends(get_db)):
    return ReviewService.list_public(db, product_id)


@router.post(
    "/{product_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_review(
    product_id: int,
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReviewService.create(db, current_user.id, product_id, data)


@admin_router.get("", response_model=list[ReviewResponse])
def admin_list_reviews(
    review_status: ReviewStatus | None = Query(default=None, alias="status"),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return ReviewService.list_admin(db, review_status)


@admin_router.patch("/{review_id}", response_model=ReviewResponse)
def moderate_review(
    review_id: int,
    data: ReviewModerate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return ReviewService.moderate(db, review_id, data.status, current_admin.id)
