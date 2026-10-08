from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.categories.model import Category
from app.modules.categories.schemas import CategoryCreate


class CategoryRepository:

    @staticmethod
    def get_all(
        db: Session,
    ) -> list[Category]:

        statement = (
            select(Category)
            .order_by(
                Category.name.asc()
            )
        )

        return list(
            db.scalars(
                statement
            ).all()
        )


    @staticmethod
    def get_active(
        db: Session,
    ) -> list[Category]:

        statement = (
            select(Category)
            .where(
                Category.active.is_(True)
            )
            .order_by(
                Category.name.asc()
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
        category_id: int,
    ) -> Category | None:

        statement = select(
            Category
        ).where(
            Category.id == category_id
        )

        return db.scalar(statement)


    @staticmethod
    def get_by_slug(
        db: Session,
        slug: str,
    ) -> Category | None:

        statement = select(
            Category
        ).where(
            Category.slug == slug
        )

        return db.scalar(statement)


    @staticmethod
    def get_by_name(
        db: Session,
        name: str,
    ) -> Category | None:

        statement = select(
            Category
        ).where(
            Category.name == name
        )

        return db.scalar(statement)


    @staticmethod
    def create(
        db: Session,
        data: CategoryCreate,
        slug: str,
        folder_name: str,
    ) -> Category:

        category = Category(
            name=data.name.strip(),
            slug=slug,
            description=data.description,
            image_url=data.image_url,
            folder_name=folder_name,
            active=True,
        )

        db.add(category)
        db.commit()
        db.refresh(category)

        return category


    @staticmethod
    def save(
        db: Session,
        category: Category,
    ) -> Category:

        db.add(category)

        db.commit()

        db.refresh(category)

        return category