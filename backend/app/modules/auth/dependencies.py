from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.service import AuthService
from app.modules.users.model import User
from app.shared.enums import UserRole


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        domain=settings.SESSION_COOKIE_DOMAIN,
        path="/",
    )


def require_trusted_origin(request: Request) -> None:
    """Protege operaciones con cookie frente a CSRF y orígenes no autorizados."""

    if request.method.upper() in SAFE_METHODS:
        return

    origin = request.headers.get("origin")
    normalized_origin = origin.rstrip("/") if origin else None

    if request.url.path.startswith(f"{settings.API_PREFIX}/admin/"):
        allowed_origins = set(settings.allowed_admin_origins)
    else:
        allowed_origins = set(settings.allowed_origins)

    if normalized_origin not in allowed_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origen de la solicitud no autorizado.",
        )


def get_current_user(
    response: Response,
    session_token: str | None = Cookie(
        default=None,
        alias=settings.SESSION_COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
) -> User:
    if session_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No existe una sesión activa.",
        )

    user = AuthService.get_authenticated_user(
        db,
        session_token,
    )
    set_session_cookie(response, session_token)
    return user


def require_admin(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador.",
        )

    request.state.admin_user_id = current_user.id
    return current_user
