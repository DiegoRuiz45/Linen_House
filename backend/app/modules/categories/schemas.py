from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class CategoryCreate(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100,
    )

    description: str | None = None

    image_url: str | None = Field(
        default=None,
        max_length=500,
    )


class CategoryUpdate(BaseModel):

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    description: str | None = None

    image_url: str | None = Field(
        default=None,
        max_length=500,
    )

    active: bool | None = None


class CategoryResponse(BaseModel):

    id: int

    name: str
    slug: str

    description: str | None
    image_url: str | None

    folder_name: str

    active: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )