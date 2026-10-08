from datetime import datetime

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.shared.enums import UserRole


# ==========================================================
# BASE
# ==========================================================

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str | None = None
    avatar_url: str | None = None
    phone: str | None = None


# ==========================================================
# DATOS RECIBIDOS DESDE GOOGLE
# ==========================================================

class UserGoogleCreate(UserBase):
    google_id: str
    email_verified: bool = False


# ==========================================================
# ACTUALIZACIÓN DE PERFIL
# ==========================================================

class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)

    @field_validator("first_name")
    @classmethod
    def clean_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("El nombre no puede estar vacío.")
        return cleaned

    @field_validator("last_name", "phone")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


# ==========================================================
# RESPUESTA DE USUARIO
# ==========================================================

class UserResponse(UserBase):

    id: int

    email_verified: bool
    role: UserRole
    is_active: bool

    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )


class AdminCustomerResponse(UserResponse):
    orders_count: int = 0
    total_spent: Decimal = Decimal("0.00")
