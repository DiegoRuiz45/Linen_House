from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.categories.model import Category
from app.modules.categories.repository import CategoryRepository
from app.modules.categories.schemas import (
    CategoryCreate,
    CategoryUpdate,
)
from app.shared.utils import slugify
from app.storage.image_service import ImageService


class CategoryService:

    # ======================================================
    # LISTAR CATEGORÍAS PÚBLICAS
    # ======================================================

    @staticmethod
    def get_active_categories(
        db: Session,
    ) -> list[Category]:

        return CategoryRepository.get_active(
            db
        )


    # ======================================================
    # LISTAR TODAS PARA ADMIN
    # ======================================================

    @staticmethod
    def get_all_categories(
        db: Session,
    ) -> list[Category]:

        return CategoryRepository.get_all(
            db
        )


    # ======================================================
    # CREAR
    # ======================================================

    @staticmethod
    def create_category(
        db: Session,
        data: CategoryCreate,
    ) -> Category:

        clean_name = data.name.strip()

        slug = slugify(
            clean_name
        )


        if not slug:

            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El nombre de la categoría no es válido.",
            )


        existing_name = (
            CategoryRepository.get_by_name(
                db,
                clean_name,
            )
        )


        if existing_name:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese nombre.",
            )


        existing_slug = (
            CategoryRepository.get_by_slug(
                db,
                slug,
            )
        )


        if existing_slug:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese identificador.",
            )


        folder_name = slug


        try:

            ImageService.create_category_folder(
                folder_name
            )

        except (OSError, ValueError) as error:

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible crear la carpeta de la categoría.",
            ) from error


        try:

            return CategoryRepository.create(
                db,
                data,
                slug,
                folder_name,
            )

        except IntegrityError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La categoría ya existe.",
            ) from error


    # ======================================================
    # ACTUALIZAR
    # ======================================================

    @staticmethod
    def update_category(
        db: Session,
        category_id: int,
        data: CategoryUpdate,
    ) -> Category:

        category = (
            CategoryRepository.get_by_id(
                db,
                category_id,
            )
        )


        if category is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada.",
            )


        update_data = data.model_dump(
            exclude_unset=True
        )


        if "name" in update_data:

            new_name = (
                update_data["name"].strip()
            )


            existing = (
                CategoryRepository.get_by_name(
                    db,
                    new_name,
                )
            )


            if (
                existing is not None
                and existing.id != category.id
            ):

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una categoría con ese nombre.",
                )


            category.name = new_name

            update_data.pop(
                "name"
            )


        for field, value in update_data.items():

            setattr(
                category,
                field,
                value,
            )


        try:

            return CategoryRepository.save(
                db,
                category,
            )

        except IntegrityError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No fue posible actualizar la categoría.",
            ) from error


    # ======================================================
    # ELIMINAR
    # ======================================================

    @staticmethod
    def delete_category(
        db: Session,
        category_id: int,
    ) -> None:

        category = (
            CategoryRepository.get_by_id(
                db,
                category_id,
            )
        )


        if category is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada.",
            )


        category.active = False


        CategoryRepository.save(
            db,
            category,
        )