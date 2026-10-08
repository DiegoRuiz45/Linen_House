from hashlib import sha256
from secrets import token_urlsafe

from app.core.config import settings


def create_session_token() -> str:
    """Genera un token opaco. Solo su hash se persiste en la base de datos."""

    return token_urlsafe(48)


def hash_session_token(token: str) -> str:
    """Liga el hash al secreto de la aplicación para proteger respaldos de BD."""

    value = f"{settings.SESSION_SECRET_KEY}:{token}"
    return sha256(value.encode("utf-8")).hexdigest()
