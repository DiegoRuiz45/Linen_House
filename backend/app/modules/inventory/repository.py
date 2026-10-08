from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.inventory.model import InventoryMovement
from app.modules.products.model import (
    Product,
    ProductVariant,
)


class InventoryRepository:

    # ======================================================
    # LISTAR INVENTARIO
    # ======================================================

    @staticmethod
    def get_inventory(
        db: Session,
    ):

        statement = (
            select(
                ProductVariant,
                Product.name.label(
                    "product_name"
                ),
            )
            .join(
                Product,
                Product.id
                == ProductVariant.product_id,
            )
            .order_by(
                Product.name.asc(),
                ProductVariant.id.asc(),
            )
        )

        return db.execute(
            statement
        ).all()


    # ======================================================
    # OBTENER VARIANTE
    # ======================================================

    @staticmethod
    def get_variant_by_id(
        db: Session,
        variant_id: int,
    ) -> ProductVariant | None:

        statement = (
            select(ProductVariant)
            .where(
                ProductVariant.id
                == variant_id
            )
        )

        return db.scalar(
            statement
        )


    # ======================================================
    # OBTENER VARIANTE BLOQUEADA
    # ======================================================

    @staticmethod
    def get_variant_for_update(
        db: Session,
        variant_id: int,
    ) -> ProductVariant | None:

        statement = (
            select(ProductVariant)
            .where(
                ProductVariant.id
                == variant_id
            )
            .with_for_update()
        )

        return db.scalar(
            statement
        )


    # ======================================================
    # CREAR MOVIMIENTO
    # ======================================================

    @staticmethod
    def add_movement(
        db: Session,
        movement: InventoryMovement,
    ) -> InventoryMovement:

        db.add(
            movement
        )

        return movement


    # ======================================================
    # HISTORIAL
    # ======================================================

    @staticmethod
    def get_movements(
        db: Session,
        variant_id: int,
    ) -> list[InventoryMovement]:

        statement = (
            select(
                InventoryMovement
            )
            .where(
                InventoryMovement.variant_id
                == variant_id
            )
            .order_by(
                InventoryMovement.created_at.desc(),
                InventoryMovement.id.desc(),
            )
        )

        return list(
            db.scalars(
                statement
            ).all()
        )