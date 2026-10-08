from sqlalchemy import (
    func,
    select,
    update,
)
from sqlalchemy.orm import Session

from app.modules.products.model import (
    Product,
    ProductImage,
    ProductVariant,
)
from app.modules.categories.model import Category


class ProductRepository:

    # ======================================================
    # PRODUCTOS
    # ======================================================

    @staticmethod
    def get_all(
        db: Session,
    ) -> list[Product]:

        statement = (
            select(Product)
            .order_by(
                Product.created_at.desc(),
                Product.id.desc(),
            )
        )

        return list(
            db.scalars(
                statement
            ).all()
        )


    @staticmethod
    def get_admin_list(db: Session) -> list:
        """Lista administrativa enriquecida sin consultas N+1."""

        variants_count = (
            select(func.count(ProductVariant.id))
            .where(ProductVariant.product_id == Product.id)
            .correlate(Product)
            .scalar_subquery()
        )
        stock_total = (
            select(func.coalesce(func.sum(ProductVariant.stock), 0))
            .where(ProductVariant.product_id == Product.id)
            .correlate(Product)
            .scalar_subquery()
        )
        primary_image_url = (
            select(ProductImage.image_url)
            .where(ProductImage.product_id == Product.id)
            .order_by(
                ProductImage.is_primary.desc(),
                ProductImage.position.asc(),
                ProductImage.id.asc(),
            )
            .limit(1)
            .correlate(Product)
            .scalar_subquery()
        )

        statement = (
            select(
                Product,
                Category.name.label("category_name"),
                variants_count.label("variants_count"),
                stock_total.label("stock_total"),
                primary_image_url.label("primary_image_url"),
            )
            .join(Category, Category.id == Product.category_id)
            .order_by(Product.created_at.desc(), Product.id.desc())
        )

        return list(db.execute(statement).all())


    @staticmethod
    def get_active(
        db: Session,
    ) -> list[Product]:

        statement = (
            select(Product)
            .where(
                Product.active.is_(True)
            )
            .order_by(
                Product.created_at.desc(),
                Product.id.desc(),
            )
        )

        return list(
            db.scalars(
                statement
            ).all()
        )


    @staticmethod
    def get_by_id(
        db: Session,
        product_id: int,
    ) -> Product | None:

        statement = (
            select(Product)
            .where(
                Product.id == product_id
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def get_by_slug(
        db: Session,
        slug: str,
    ) -> Product | None:

        statement = (
            select(Product)
            .where(
                Product.slug == slug
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def create(
        db: Session,
        product: Product,
        commit: bool = True,
    ) -> Product:

        db.add(
            product
        )

        if commit:

            db.commit()

            db.refresh(
                product
            )

        else:

            db.flush()

        return product


    @staticmethod
    def save(
        db: Session,
        product: Product,
        commit: bool = True,
    ) -> Product:

        db.add(
            product
        )

        if commit:

            db.commit()

            db.refresh(
                product
            )

        else:

            db.flush()

        return product


    # ======================================================
    # VARIANTES
    # ======================================================

    @staticmethod
    def get_variants(
        db: Session,
        product_id: int,
        only_active: bool = False,
    ) -> list[ProductVariant]:

        statement = (
            select(ProductVariant)
            .where(
                ProductVariant.product_id
                == product_id
            )
        )

        if only_active:

            statement = (
                statement.where(
                    ProductVariant.active.is_(True)
                )
            )

        statement = (
            statement.order_by(
                ProductVariant.id.asc()
            )
        )

        return list(
            db.scalars(
                statement
            ).all()
        )


    @staticmethod
    def get_variant_by_id(
        db: Session,
        product_id: int,
        variant_id: int,
    ) -> ProductVariant | None:

        statement = (
            select(ProductVariant)
            .where(
                ProductVariant.id
                == variant_id,

                ProductVariant.product_id
                == product_id,
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def get_variant_by_sku(
        db: Session,
        sku: str,
    ) -> ProductVariant | None:

        statement = (
            select(ProductVariant)
            .where(
                ProductVariant.sku == sku
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def create_variant(
        db: Session,
        variant: ProductVariant,
        commit: bool = True,
    ) -> ProductVariant:

        db.add(
            variant
        )

        if commit:

            db.commit()

            db.refresh(
                variant
            )

        else:

            db.flush()

        return variant


    @staticmethod
    def save_variant(
        db: Session,
        variant: ProductVariant,
        commit: bool = True,
    ) -> ProductVariant:

        db.add(
            variant
        )

        if commit:

            db.commit()

            db.refresh(
                variant
            )

        else:

            db.flush()

        return variant


    # ======================================================
    # IMÁGENES
    # ======================================================

    @staticmethod
    def get_images(
        db: Session,
        product_id: int,
    ) -> list[ProductImage]:

        statement = (
            select(ProductImage)
            .where(
                ProductImage.product_id
                == product_id
            )
            .order_by(
                ProductImage.position.asc(),
                ProductImage.id.asc(),
            )
        )

        return list(
            db.scalars(
                statement
            ).all()
        )


    @staticmethod
    def get_primary_image(
        db: Session,
        product_id: int,
    ) -> ProductImage | None:

        statement = (
            select(ProductImage)
            .where(
                ProductImage.product_id
                == product_id,

                ProductImage.is_primary.is_(
                    True
                ),
            )
            .order_by(
                ProductImage.position.asc(),
                ProductImage.id.asc(),
            )
            .limit(1)
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def get_image_by_id(
        db: Session,
        product_id: int,
        image_id: int,
    ) -> ProductImage | None:

        statement = (
            select(ProductImage)
            .where(
                ProductImage.id
                == image_id,

                ProductImage.product_id
                == product_id,
            )
        )

        return db.scalar(
            statement
        )


    @staticmethod
    def create_image(
        db: Session,
        image: ProductImage,
        commit: bool = True,
    ) -> ProductImage:

        db.add(
            image
        )

        if commit:

            db.commit()

            db.refresh(
                image
            )

        else:

            db.flush()

        return image


    @staticmethod
    def save_image(
        db: Session,
        image: ProductImage,
        commit: bool = True,
    ) -> ProductImage:

        db.add(image)

        if commit:
            db.commit()
            db.refresh(image)
        else:
            db.flush()

        return image


    @staticmethod
    def delete_image(
        db: Session,
        image: ProductImage,
        commit: bool = True,
    ) -> None:

        db.delete(
            image
        )

        if commit:

            db.commit()

        else:

            db.flush()


    @staticmethod
    def unset_primary_images(
        db: Session,
        product_id: int,
    ) -> None:

        statement = (
            update(ProductImage)
            .where(
                ProductImage.product_id
                == product_id,

                ProductImage.is_primary.is_(
                    True
                ),
            )
            .values(
                is_primary=False
            )
        )

        db.execute(
            statement
        )

        db.flush()
