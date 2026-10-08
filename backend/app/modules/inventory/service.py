from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.inventory.model import InventoryMovement
from app.modules.inventory.repository import InventoryRepository
from app.modules.inventory.schemas import (
    InventoryVariantResponse,
    StockAdjustmentRequest,
    StockChangeRequest,
)
from app.shared.enums import InventoryMovementType


class InventoryService:

    # ======================================================
    # LISTAR INVENTARIO
    # ======================================================

    @staticmethod
    def get_inventory(
        db: Session,
    ) -> list[InventoryVariantResponse]:

        rows = (
            InventoryRepository.get_inventory(
                db
            )
        )

        inventory = []

        for variant, product_name in rows:

            inventory.append(
                InventoryVariantResponse(
                    variant_id=variant.id,
                    product_id=variant.product_id,
                    product_name=product_name,
                    sku=variant.sku,
                    size=variant.size,
                    color=variant.color,
                    stock=variant.stock,
                    minimum_stock=(
                        variant.minimum_stock
                    ),
                    low_stock=(
                        variant.stock
                        <= variant.minimum_stock
                    ),
                    out_of_stock=(
                        variant.stock == 0
                    ),
                    active=variant.active,
                )
            )

        return inventory


    # ======================================================
    # HISTORIAL
    # ======================================================

    @staticmethod
    def get_movements(
        db: Session,
        variant_id: int,
    ):

        variant = (
            InventoryRepository.get_variant_by_id(
                db,
                variant_id,
            )
        )

        if variant is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante no encontrada.",
            )

        return (
            InventoryRepository.get_movements(
                db,
                variant_id,
            )
        )


    # ======================================================
    # ENTRADA
    # ======================================================

    @staticmethod
    def stock_in(
        db: Session,
        variant_id: int,
        data: StockChangeRequest,
        user_id: int,
    ) -> InventoryMovement:

        try:

            variant = (
                InventoryRepository
                .get_variant_for_update(
                    db,
                    variant_id,
                )
            )

            if variant is None:

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Variante no encontrada.",
                )

            stock_before = (
                variant.stock
            )

            stock_after = (
                stock_before
                + data.quantity
            )

            variant.stock = (
                stock_after
            )

            movement = InventoryMovement(
                variant_id=variant.id,
                movement_type=(
                    InventoryMovementType.STOCK_IN
                ),
                quantity_change=data.quantity,
                stock_before=stock_before,
                stock_after=stock_after,
                reason=data.reason,
                reference_type=None,
                reference_id=None,
                created_by_user_id=user_id,
            )

            InventoryRepository.add_movement(
                db,
                movement,
            )

            db.commit()

            db.refresh(
                movement
            )

            return movement

        except HTTPException:

            db.rollback()
            raise

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible registrar la entrada de inventario.",
            ) from error


    # ======================================================
    # SALIDA
    # ======================================================

    @staticmethod
    def stock_out(
        db: Session,
        variant_id: int,
        data: StockChangeRequest,
        user_id: int,
    ) -> InventoryMovement:

        try:

            variant = (
                InventoryRepository
                .get_variant_for_update(
                    db,
                    variant_id,
                )
            )

            if variant is None:

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Variante no encontrada.",
                )

            stock_before = (
                variant.stock
            )

            stock_after = (
                stock_before
                - data.quantity
            )

            if stock_after < 0:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "La salida solicitada supera "
                        "el stock disponible."
                    ),
                )

            variant.stock = (
                stock_after
            )

            movement = InventoryMovement(
                variant_id=variant.id,
                movement_type=(
                    InventoryMovementType.STOCK_OUT
                ),
                quantity_change=(
                    -data.quantity
                ),
                stock_before=stock_before,
                stock_after=stock_after,
                reason=data.reason,
                reference_type=None,
                reference_id=None,
                created_by_user_id=user_id,
            )

            InventoryRepository.add_movement(
                db,
                movement,
            )

            db.commit()

            db.refresh(
                movement
            )

            return movement

        except HTTPException:

            db.rollback()
            raise

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible registrar la salida de inventario.",
            ) from error


    # ======================================================
    # AJUSTE ABSOLUTO
    # ======================================================

    @staticmethod
    def adjust_stock(
        db: Session,
        variant_id: int,
        data: StockAdjustmentRequest,
        user_id: int,
    ) -> InventoryMovement:

        try:

            variant = (
                InventoryRepository
                .get_variant_for_update(
                    db,
                    variant_id,
                )
            )

            if variant is None:

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Variante no encontrada.",
                )

            stock_before = (
                variant.stock
            )

            stock_after = (
                data.stock
            )

            quantity_change = (
                stock_after
                - stock_before
            )

            if quantity_change == 0:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "El stock indicado es igual "
                        "al stock actual."
                    ),
                )

            variant.stock = (
                stock_after
            )

            movement = InventoryMovement(
                variant_id=variant.id,
                movement_type=(
                    InventoryMovementType.ADJUSTMENT
                ),
                quantity_change=(
                    quantity_change
                ),
                stock_before=stock_before,
                stock_after=stock_after,
                reason=data.reason,
                reference_type=None,
                reference_id=None,
                created_by_user_id=user_id,
            )

            InventoryRepository.add_movement(
                db,
                movement,
            )

            db.commit()

            db.refresh(
                movement
            )

            return movement

        except HTTPException:

            db.rollback()
            raise

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible ajustar el inventario.",
            ) from error