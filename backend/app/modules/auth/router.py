from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.schemas import (
    GoogleLoginRequest,
    GoogleLoginResponse,
)
from app.modules.auth.service import AuthService
from app.modules.auth.dependencies import (
    get_current_user as require_current_user,
    require_trusted_origin,
    set_session_cookie,
)
from app.modules.users.model import User
from app.modules.users.schemas import UserResponse


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    dependencies=[Depends(require_trusted_origin)],
)


# ==========================================================
# GOOGLE LOGIN
# ==========================================================

@router.post(
    "/google",
    response_model=GoogleLoginResponse,
)
def google_login(
    data: GoogleLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):

    user = AuthService.login_with_google(
        db,
        data.credential,
    )


    session_token = AuthService.create_session(
        db,
        user
    )


    set_session_cookie(response, session_token)


    return {
        "user": user
    }


# ==========================================================
# USUARIO ACTUAL
# ==========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user(
    current_user: User = Depends(require_current_user),
):
    return current_user


# ==========================================================
# LOGOUT
# ==========================================================

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
def logout(
    response: Response,
    session_token: str | None = Cookie(
        default=None,
        alias=settings.SESSION_COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
):
    AuthService.revoke_session(db, session_token)

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        domain=settings.SESSION_COOKIE_DOMAIN,
        secure=settings.SESSION_COOKIE_SECURE,
        httponly=True,
        samesite=settings.SESSION_COOKIE_SAMESITE,
    )
