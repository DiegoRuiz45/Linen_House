from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Category(Base):

    __tablename__ = "categories"

    # ======================================================
    # IDENTIFICACIÓN
    # ======================================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )

    # ======================================================
    # INFORMACIÓN
    # ======================================================

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # ======================================================
    # ALMACENAMIENTO
    # ======================================================

    folder_name: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
    )

    # ======================================================
    # ESTADO
    # ======================================================

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # ======================================================
    # AUDITORÍA
    # ======================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )