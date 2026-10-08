from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from google.auth.exceptions import GoogleAuthError
from sqlalchemy.orm import Session

from app.integrations.google.client import GoogleClient
from app.modules.users.model import User
from app.modules.users.schemas import UserGoogleCreate
from app.modules.users.service import UserService

from app.core.security import (
    create_session_token,
    hash_session_token,
)
from app.core.config import settings
from app.modules.auth.repository import AuthSessionRepository

class AuthService:

    
    @staticmethod
    def login_with_google(
        db: Session,
        credential: str,
    ) -> User:

        try:

            google_data = GoogleClient.verify_token(
                credential
            )

        except (ValueError, GoogleAuthError):

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de Google inválido.",
            )


        google_id = google_data.get("sub")
        email = google_data.get("email")

        if not google_id or not email:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google no proporcionó los datos necesarios.",
            )


        email_verified = bool(
            google_data.get(
                "email_verified",
                False,
            )
        )


        if not email_verified:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="El correo de Google no está verificado.",
            )


        user_data = UserGoogleCreate(
            google_id=google_id,
            email=email,
            first_name=google_data.get(
                "given_name",
                google_data.get(
                    "name",
                    "Usuario",
                ),
            ),
            last_name=google_data.get(
                "family_name"
            ),
            avatar_url=google_data.get(
                "picture"
            ),
            email_verified=email_verified,
        )


        user = UserService.get_or_create_google_user(
            db,
            user_data,
        )


        if not user.is_active:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta se encuentra deshabilitada.",
            )


        return user
    @staticmethod
    def create_session(
        db: Session,
        user: User,
    ) -> str:
        token = create_session_token()
        expiration = datetime.now(timezone.utc) + timedelta(
            minutes=settings.SESSION_EXPIRE_MINUTES
        )

        AuthSessionRepository.create(
            db,
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=expiration.replace(tzinfo=None),
        )

        return token

    @staticmethod
    def get_authenticated_user(
        db: Session,
        token: str,
    ) -> User:

        session = AuthSessionRepository.get_active_by_hash(
            db,
            hash_session_token(token),
        )

        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión inválida o expirada.",
            )

        user = UserService.get_user_by_id(
            db,
            session.user_id,
        )


        if user is None:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado.",
            )


        if not user.is_active:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="La cuenta se encuentra deshabilitada.",
            )

        renewed_expiration = datetime.now(timezone.utc) + timedelta(
            minutes=settings.SESSION_EXPIRE_MINUTES
        )
        AuthSessionRepository.touch(
            db,
            session,
            expires_at=renewed_expiration.replace(tzinfo=None),
        )

        return user

    @staticmethod
    def revoke_session(db: Session, token: str | None) -> None:
        if token:
            AuthSessionRepository.revoke_by_hash(
                db,
                hash_session_token(token),
            )
