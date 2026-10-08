from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.shared.enums import ReviewStatus


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=120)
    body: str = Field(min_length=10, max_length=2000)

    @field_validator("title")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 10:
            raise ValueError("La reseña debe tener al menos 10 caracteres.")
        return cleaned


class ReviewModerate(BaseModel):
    status: ReviewStatus

    @field_validator("status")
    @classmethod
    def final_status_only(cls, value: ReviewStatus) -> ReviewStatus:
        if value == ReviewStatus.PENDING:
            raise ValueError("Selecciona aprobado o rechazado.")
        return value


class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    customer_name: str
    rating: int
    title: str | None
    body: str
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime
