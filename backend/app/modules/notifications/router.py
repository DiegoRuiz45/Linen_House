from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user, require_trusted_origin
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications.service import NotificationService
from app.modules.users.model import User


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=[Depends(require_trusted_origin)],
)


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService.list_for_user(db, current_user.id, limit)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return NotificationService.mark_read(db, current_user.id, notification_id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    NotificationService.mark_all_read(db, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
