from decimal import Decimal

from fastapi import (
    HTTPException,
    status,
)
from sqlalchemy.exc import (
    IntegrityError,
    SQLAlchemyError,
)
from sqlalchemy.orm import Session

from app.modules.carts.model import (
    Cart,
    CartItem,
)
from app.modules.carts.repository import (
    CartRepository,
)
from app.modules.carts.schemas import (
    CartItemCreate,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    CartSyncIssue,
    CartSyncRequest,
    CartSyncResponse,
)


class CartService:

    # ======================================================
    # OBTENER O CREAR CARRITO
    # ======================================================

    @staticmethod
    def _get_or_create_cart(
        db: Session,
        user_id: int,
    ) -> Cart:

        cart = (
            CartRepository.get_by_user(
                db,
                user_id,
            )
        )

        if cart is not None:

            return cart


        try:

            cart = CartRepository.create(
                db,
                user_id,
            )

            db.commit()

            db.refresh(
                cart
            )

            return cart

        except IntegrityError:

            db.rollback()

            # Por seguridad ante dos requests
            # simultáneos intentando crear
            # el mismo carrito.

            cart = (
                CartRepository.get_by_user(
                    db,
                    user_id,
                )
            )

            if cart is not None:

                return cart

            raise


    # ======================================================
    # ARMAR RESPUESTA DEL CARRITO
    # ======================================================

    @staticmethod
    def _build_cart_response(
        db: Session,
        cart: Cart,
    ) -> CartResponse:

        rows = (
            CartRepository.get_detailed_items(
                db,
                cart.id,
            )
        )

        items = []

        total_items = 0

        subtotal = Decimal(
            "0.00"
        )


        for (
            item,
            variant,
            product,
            image_url,
        ) in rows:

            # Si la variante tiene precio propio,
            # usamos ese.
            #
            # De lo contrario usamos el precio
            # general del producto.

            unit_price = (
                variant.price
                if variant.price is not None
                else product.base_price
            )


            item_subtotal = (
                unit_price
                * item.quantity
            )


            available = (
                product.active
                and variant.active
                and variant.stock > 0
                and item.quantity
                <= variant.stock
            )


            items.append(
                CartItemResponse(
                    id=item.id,

                    variant_id=variant.id,

                    product_id=product.id,
                    product_name=product.name,
                    product_slug=product.slug,

                    size=variant.size,
                    color=variant.color,
                    sku=variant.sku,

                    unit_price=unit_price,

                    quantity=item.quantity,

                    subtotal=item_subtotal,

                    stock_available=(
                        variant.stock
                    ),

                    available=available,

                    image_url=image_url,
                )
            )


            total_items += (
                item.quantity
            )

            subtotal += (
                item_subtotal
            )


        return CartResponse(
            id=cart.id,
            items=items,
            total_items=total_items,
            subtotal=subtotal,
        )


    # ======================================================
    # VER CARRITO
    # ======================================================

    @staticmethod
    def get_cart(
        db: Session,
        user_id: int,
    ) -> CartResponse:

        cart = (
            CartService._get_or_create_cart(
                db,
                user_id,
            )
        )

        return (
            CartService._build_cart_response(
                db,
                cart,
            )
        )


    # ======================================================
    # AGREGAR ITEM
    # ======================================================

    @staticmethod
    def add_item(
        db: Session,
        user_id: int,
        data: CartItemCreate,
    ) -> CartResponse:

        variant_result = (
            CartRepository.get_variant_with_product(
                db,
                data.variant_id,
            )
        )


        if variant_result is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante no encontrada.",
            )


        variant, product = (
            variant_result
        )


        if not product.active:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El producto no está disponible.",
            )


        if not variant.active:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La variante no está disponible.",
            )


        if variant.stock <= 0:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La variante está agotada.",
            )


        cart = (
            CartService._get_or_create_cart(
                db,
                user_id,
            )
        )


        existing_item = (
            CartRepository.get_item_by_variant(
                db,
                cart.id,
                variant.id,
            )
        )


        if existing_item:

            new_quantity = (
                existing_item.quantity
                + data.quantity
            )


            if new_quantity > variant.stock:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "La cantidad solicitada supera "
                        "el stock disponible."
                    ),
                )


            existing_item.quantity = (
                new_quantity
            )

        else:

            if data.quantity > variant.stock:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "La cantidad solicitada supera "
                        "el stock disponible."
                    ),
                )


            item = CartItem(
                cart_id=cart.id,
                variant_id=variant.id,
                quantity=data.quantity,
            )

            db.add(
                item
            )


        try:

            db.commit()

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible agregar "
                    "el producto al carrito."
                ),
            ) from error


        return (
            CartService._build_cart_response(
                db,
                cart,
            )
        )


    # ======================================================
    # CAMBIAR CANTIDAD
    # ======================================================

    @staticmethod
    def update_item(
        db: Session,
        user_id: int,
        item_id: int,
        data: CartItemUpdate,
    ) -> CartResponse:

        cart = (
            CartRepository.get_by_user(
                db,
                user_id,
            )
        )


        if cart is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carrito no encontrado.",
            )


        item = (
            CartRepository.get_item_by_id(
                db,
                cart.id,
                item_id,
            )
        )


        if item is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto del carrito no encontrado.",
            )


        variant_result = (
            CartRepository.get_variant_with_product(
                db,
                item.variant_id,
            )
        )


        if variant_result is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante no encontrada.",
            )


        variant, product = (
            variant_result
        )


        if (
            not product.active
            or not variant.active
        ):

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "El producto o la variante "
                    "ya no está disponible."
                ),
            )


        if data.quantity > variant.stock:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "La cantidad solicitada supera "
                    "el stock disponible."
                ),
            )


        item.quantity = (
            data.quantity
        )


        try:

            db.commit()

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible actualizar "
                    "el carrito."
                ),
            ) from error


        return (
            CartService._build_cart_response(
                db,
                cart,
            )
        )


    # ======================================================
    # ELIMINAR ITEM
    # ======================================================

    @staticmethod
    def delete_item(
        db: Session,
        user_id: int,
        item_id: int,
    ) -> None:

        cart = (
            CartRepository.get_by_user(
                db,
                user_id,
            )
        )


        if cart is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Carrito no encontrado.",
            )


        item = (
            CartRepository.get_item_by_id(
                db,
                cart.id,
                item_id,
            )
        )


        if item is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto del carrito no encontrado.",
            )


        try:

            CartRepository.delete_item(
                db,
                item,
            )

            db.commit()

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible eliminar "
                    "el producto del carrito."
                ),
            ) from error


    # ======================================================
    # VACIAR
    # ======================================================

    @staticmethod
    def clear_cart(
        db: Session,
        user_id: int,
    ) -> None:

        cart = (
            CartRepository.get_by_user(
                db,
                user_id,
            )
        )


        if cart is None:

            return


        try:

            CartRepository.clear(
                db,
                cart.id,
            )

            db.commit()

        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible vaciar el carrito.",
            ) from error


    @staticmethod
    def sync_guest_cart(
        db: Session,
        user_id: int,
        data: CartSyncRequest,
    ) -> CartSyncResponse:

        cart = (
            CartService._get_or_create_cart(
                db,
                user_id,
            )
        )

        issues: list[CartSyncIssue] = []

        synced_items = 0

        try:

            for local_item in data.items:

                # ==============================================
                # LOCALIZAR VARIANTE REAL
                # ==============================================

                result = (
                    CartRepository
                    .get_variant_by_selection(
                        db=db,
                        product_slug=(
                            local_item.product_slug
                        ),
                        size=local_item.size,
                        color=local_item.color,
                    )
                )

                if result is None:

                    issues.append(
                        CartSyncIssue(
                            product_slug=(
                                local_item.product_slug
                            ),
                            size=local_item.size,
                            color=local_item.color,
                            quantity=(
                                local_item.quantity
                            ),
                            detail=(
                                "No se encontró una variante "
                                "equivalente."
                            ),
                        )
                    )

                    continue


                variant, product = result


                # ==============================================
                # VALIDAR PRODUCTO
                # ==============================================

                if not product.active:

                    issues.append(
                        CartSyncIssue(
                            product_slug=(
                                local_item.product_slug
                            ),
                            size=local_item.size,
                            color=local_item.color,
                            quantity=(
                                local_item.quantity
                            ),
                            detail=(
                                "El producto ya no está "
                                "disponible."
                            ),
                        )
                    )

                    continue


                # ==============================================
                # VALIDAR VARIANTE
                # ==============================================

                if not variant.active:

                    issues.append(
                        CartSyncIssue(
                            product_slug=(
                                local_item.product_slug
                            ),
                            size=local_item.size,
                            color=local_item.color,
                            quantity=(
                                local_item.quantity
                            ),
                            detail=(
                                "La variante ya no está "
                                "disponible."
                            ),
                        )
                    )

                    continue


                if variant.stock <= 0:

                    issues.append(
                        CartSyncIssue(
                            product_slug=(
                                local_item.product_slug
                            ),
                            size=local_item.size,
                            color=local_item.color,
                            quantity=(
                                local_item.quantity
                            ),
                            detail=(
                                "La variante está agotada."
                            ),
                        )
                    )

                    continue


                # ==============================================
                # BUSCAR SI YA ESTABA EN CARRITO SERVIDOR
                # ==============================================

                existing_item = (
                    CartRepository.get_item_by_variant(
                        db,
                        cart.id,
                        variant.id,
                    )
                )


                current_quantity = (
                    existing_item.quantity
                    if existing_item
                    else 0
                )


                new_quantity = (
                    current_quantity
                    + local_item.quantity
                )


                # ==============================================
                # VALIDAR STOCK DE LA SUMA
                # ==============================================

                if new_quantity > variant.stock:

                    issues.append(
                        CartSyncIssue(
                            product_slug=(
                                local_item.product_slug
                            ),
                            size=local_item.size,
                            color=local_item.color,
                            quantity=(
                                local_item.quantity
                            ),
                            detail=(
                                "No fue posible combinar "
                                "las cantidades porque superan "
                                "el stock disponible."
                            ),
                        )
                    )

                    continue


                # ==============================================
                # MEZCLAR
                # ==============================================

                if existing_item:

                    existing_item.quantity = (
                        new_quantity
                    )

                else:

                    cart_item = CartItem(
                        cart_id=cart.id,
                        variant_id=variant.id,
                        quantity=(
                            local_item.quantity
                        ),
                    )

                    db.add(
                        cart_item
                    )


                synced_items += 1


            # ==============================================
            # CONFIRMAR TODOS LOS ITEMS VÁLIDOS
            # ==============================================

            db.commit()


        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "No fue posible sincronizar "
                    "el carrito."
                ),
            ) from error


        return CartSyncResponse(
            cart=(
                CartService._build_cart_response(
                    db,
                    cart,
                )
            ),
            synced_items=synced_items,
            issues=issues,
        )