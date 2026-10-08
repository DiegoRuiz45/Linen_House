from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.shared.enums import InventoryMovementType


class InventoryMovement(Base):

    __tablename__ = "inventory_movements"

    # ======================================================
    # IDENTIFICACIÓN
    # ======================================================

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    # ======================================================
    # VARIANTE AFECTADA
    # ======================================================

    variant_id: Mapped[int] = mapped_column(
        ForeignKey(
            "product_variants.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ======================================================
    # TIPO DE MOVIMIENTO
    # ======================================================

    movement_type: Mapped[InventoryMovementType] = mapped_column(
        Enum(
            InventoryMovementType,
            name="inventory_movement_type",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda enum_class: [
                item.value
                for item in enum_class
            ],
        ),
        nullable=False,
        index=True,
    )

    # ======================================================
    # CAMBIO DE INVENTARIO
    # ======================================================

    quantity_change: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    stock_before: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    stock_after: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # ======================================================
    # INFORMACIÓN DEL MOVIMIENTO
    # ======================================================

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    reference_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    reference_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # ======================================================
    # USUARIO QUE REALIZÓ EL CAMBIO
    # ======================================================

    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ======================================================
    # AUDITORÍA
    # ======================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True,
    )