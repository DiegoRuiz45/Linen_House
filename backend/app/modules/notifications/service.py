from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.notifications.model import Notification


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class NotificationService:
    @staticmethod
    def list_for_user(db: Session, user_id: int, limit: int = 50) -> list[Notification]:
        return list(
            db.scalars(
                select(Notification)
                .where(Notification.user_id == user_id)
                .order_by(Notification.created_at.desc())
                .limit(limit)
            ).all()
        )

    @staticmethod
    def mark_read(db: Session, user_id: int, notification_id: int) -> Notification:
        notification = db.scalar(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        if notification is None:
            raise HTTPException(status_code=404, detail="Notificación no encontrada.")
        if notification.read_at is None:
            notification.read_at = utc_now_naive()
            db.add(notification)
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_read(db: Session, user_id: int) -> None:
        db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=utc_now_naive())
        )
        db.commit()
