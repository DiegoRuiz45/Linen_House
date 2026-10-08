from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AddressBase(BaseModel):
    department: str = Field(
        min_length=2,
        max_length=100,
    )

    city: str = Field(
        min_length=2,
        max_length=100,
    )

    address: str = Field(
        min_length=3,
        max_length=255,
    )

    address_extra: str | None = Field(
        default=None,
        max_length=255,
    )

    postal_code: str | None = Field(
        default=None,
        max_length=20,
    )

    notes: str | None = None


class AddressCreate(AddressBase):
    is_default: bool = False


class AddressUpdate(BaseModel):
    department: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    city: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    address: str | None = Field(
        default=None,
        min_length=3,
        max_length=255,
    )

    address_extra: str | None = Field(
        default=None,
        max_length=255,
    )

    postal_code: str | None = Field(
        default=None,
        max_length=20,
    )

    notes: str | None = None

    is_default: bool | None = None


class AddressResponse(AddressBase):
    id: int
    user_id: int
    is_default: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )