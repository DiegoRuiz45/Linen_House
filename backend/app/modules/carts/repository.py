from sqlalchemy import (
    delete,
    func,
    select,
)
from sqlalchemy.orm import Session

from app.modules.carts.model import (
    Cart,
    CartItem,
)
from app.modules.products.model import (
    Product,
    ProductImage,
    ProductVariant,
)


class CartRepository:

    # ======================================================
    # CART
    # ======================================================

    @staticmethod
    def get_by_user(
        db: Session,
        user_id: int,
    ) -> Cart | None:

        statement = (
            select(Cart)
            .where(
                Cart.user_id == user_id
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def create(
        db: Session,
        user_id: int,
    ) -> Cart:

        cart = Cart(
            user_id=user_id
        )

        db.add(
            cart
        )

        db.flush()

        return cart


    # ======================================================
    # ITEMS
    # ======================================================

    @staticmethod
    def get_item_by_id(
        db: Session,
        cart_id: int,
        item_id: int,
    ) -> CartItem | None:

        statement = (
            select(CartItem)
            .where(
                CartItem.id == item_id,
                CartItem.cart_id == cart_id,
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def get_item_by_variant(
        db: Session,
        cart_id: int,
        variant_id: int,
    ) -> CartItem | None:

        statement = (
            select(CartItem)
            .where(
                CartItem.cart_id == cart_id,
                CartItem.variant_id == variant_id,
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def get_variant_with_product(
        db: Session,
        variant_id: int,
    ):

        statement = (
            select(
                ProductVariant,
                Product,
            )
            .join(
                Product,
                Product.id
                == ProductVariant.product_id,
            )
            .where(
                ProductVariant.id
                == variant_id
            )
        )

        return db.execute(
            statement
        ).first()


    # ======================================================
    # DETALLE COMPLETO DEL CARRITO
    # ======================================================

    @staticmethod
    def get_detailed_items(
        db: Session,
        cart_id: int,
    ):

        primary_image = (
            select(
                ProductImage.image_url
            )
            .where(
                ProductImage.product_id
                == Product.id,
                ProductImage.is_primary.is_(True),
            )
            .order_by(
                ProductImage.position.asc(),
                ProductImage.id.asc(),
            )
            .limit(1)
            .scalar_subquery()
        )


        statement = (
            select(
                CartItem,
                ProductVariant,
                Product,
                primary_image.label(
                    "image_url"
                ),
            )
            .join(
                ProductVariant,
                ProductVariant.id
                == CartItem.variant_id,
            )
            .join(
                Product,
                Product.id
                == ProductVariant.product_id,
            )
            .where(
                CartItem.cart_id
                == cart_id
            )
            .order_by(
                CartItem.created_at.asc()
            )
        )


        return db.execute(
            statement
        ).all()


    # ======================================================
    # ELIMINAR ITEM
    # ======================================================

    @staticmethod
    def delete_item(
        db: Session,
        item: CartItem,
    ) -> None:

        db.delete(
            item
        )


    # ======================================================
    # VACIAR CARRITO
    # ======================================================

    @staticmethod
    def clear(
        db: Session,
        cart_id: int,
    ) -> None:

        statement = (
            delete(CartItem)
            .where(
                CartItem.cart_id
                == cart_id
            )
        )

        db.execute(
            statement
        )

    @staticmethod
    def get_variant_by_selection(
        db: Session,
        product_slug: str,
        size: str,
        color: str,
    ):

        statement = (
            select(
                ProductVariant,
                Product,
            )
            .join(
                Product,
                Product.id
                == ProductVariant.product_id,
            )
            .where(
                Product.slug
                == product_slug.strip(),

                func.lower(
                    ProductVariant.size
                )
                == size.strip().lower(),

                func.lower(
                    ProductVariant.color
                )
                == color.strip().lower(),
            )
        )

        return db.execute(
            statement
        ).first()