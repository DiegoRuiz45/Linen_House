from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.model import AuthSession


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AuthSessionRepository:
    @staticmethod
    def create(
        db: Session,
        *,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
    ) -> AuthSession:
        session = AuthSession(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_active_by_hash(
        db: Session,
        token_hash: str,
    ) -> AuthSession | None:
        statement = select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utc_now_naive(),
        )
        return db.scalar(statement)

    @staticmethod
    def touch(
        db: Session,
        session: AuthSession,
        *,
        expires_at: datetime | None = None,
    ) -> None:
        now = utc_now_naive()
        should_touch = (
            session.last_seen_at is None
            or (now - session.last_seen_at).total_seconds() >= 300
        )
        should_extend = (
            expires_at is not None
            and session.expires_at < expires_at - timedelta(seconds=300)
        )

        if should_touch:
            session.last_seen_at = now

        if should_extend:
            session.expires_at = expires_at

        if should_touch or should_extend:
            db.add(session)
            db.commit()

    @staticmethod
    def revoke_by_hash(db: Session, token_hash: str) -> None:
        session = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == token_hash,
                AuthSession.revoked_at.is_(None),
            )
        )
        if session is not None:
            session.revoked_at = utc_now_naive()
            db.add(session)
            db.commit()
