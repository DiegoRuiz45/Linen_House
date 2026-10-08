from pathlib import Path

from app.core.config import BASE_DIR
from io import BytesIO
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import BASE_DIR

PRODUCTS_UPLOAD_DIR = (
    BASE_DIR
    / "uploads"
    / "productos"
)


class ImageService:

    ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
    MAX_IMAGE_SIZE = 8 * 1024 * 1024
    MAX_IMAGE_WIDTH = 2000
    MAX_IMAGE_HEIGHT = 2000
    WEBP_QUALITY = 85

    # GUARDAR IMAGEN
    @staticmethod
    async def save_product_image(
        file: UploadFile,
        category_folder: str,
        product_slug: str,
    ) -> tuple[str, str]:

        # ==================================================
        # VALIDAR CONTENT TYPE
        # ==================================================

        if (
            file.content_type
            not in ImageService.ALLOWED_CONTENT_TYPES
        ):

            raise ValueError(
                "Formato de imagen no permitido."
            )


        # ==================================================
        # LEER ARCHIVO
        # ==================================================

        file_bytes = await file.read(
            ImageService.MAX_IMAGE_SIZE + 1
        )


        if not file_bytes:

            raise ValueError(
                "La imagen está vacía."
            )


        if (
            len(file_bytes)
            > ImageService.MAX_IMAGE_SIZE
        ):

            raise ValueError(
                "La imagen supera el tamaño máximo permitido."
            )


        # ==================================================
        # VALIDAR QUE REALMENTE SEA UNA IMAGEN
        # ==================================================

        try:

            image = Image.open(
                BytesIO(file_bytes)
            )

            image.verify()

        except (
            UnidentifiedImageError,
            OSError,
            SyntaxError,
        ) as error:

            raise ValueError(
                "El archivo no contiene una imagen válida."
            ) from error


        # verify() invalida el objeto para procesamiento,
        # por eso debemos abrirlo nuevamente.

        try:

            image = Image.open(
                BytesIO(file_bytes)
            )

            image.load()

        except (
            UnidentifiedImageError,
            OSError,
        ) as error:

            raise ValueError(
                "No fue posible procesar la imagen."
            ) from error


        # ==================================================
        # NORMALIZAR FORMATO
        # ==================================================

        if image.mode not in (
            "RGB",
            "RGBA",
        ):

            image = image.convert(
                "RGBA"
                if "transparency" in image.info
                else "RGB"
            )


        # ==================================================
        # REDIMENSIONAR SI ES DEMASIADO GRANDE
        # ==================================================

        image.thumbnail(
            (
                ImageService.MAX_IMAGE_WIDTH,
                ImageService.MAX_IMAGE_HEIGHT,
            )
        )


        # ==================================================
        # OBTENER CARPETA DEL PRODUCTO
        # ==================================================

        product_path, _ = (
            ImageService.create_product_folder(
                category_folder,
                product_slug,
            )
        )


        # ==================================================
        # GENERAR NOMBRE ÚNICO
        # ==================================================

        file_name = (
            f"{product_slug}-"
            f"{uuid4().hex[:12]}.webp"
        )


        destination = (
            ImageService._safe_path(
                product_path,
                file_name,
            )
        )


        # ==================================================
        # GUARDAR WEBP
        # ==================================================

        try:

            image.save(
                destination,
                format="WEBP",
                quality=ImageService.WEBP_QUALITY,
                optimize=True,
            )

        except OSError as error:

            raise OSError(
                "No fue posible guardar la imagen."
            ) from error


        # ==================================================
        # URL PÚBLICA
        # ==================================================

        image_url = (
            f"/uploads/productos/"
            f"{category_folder}/"
            f"{product_slug}/"
            f"{file_name}"
        )


        return (
            file_name,
            image_url,
        )

    @staticmethod
    def delete_product_image(
        category_folder: str,
        product_slug: str,
        file_name: str,
    ) -> None:

        category_path = (
            ImageService._safe_path(
                PRODUCTS_UPLOAD_DIR,
                category_folder,
            )
        )


        product_path = (
            ImageService._safe_path(
                category_path,
                product_slug,
            )
        )


        image_path = (
            ImageService._safe_path(
                product_path,
                file_name,
            )
        )


        if (
            image_path.exists()
            and image_path.is_file()
        ):

            image_path.unlink()

    # ======================================================
    # VALIDAR RUTA
    # ======================================================

    @staticmethod
    def _safe_path(
        base_path: Path,
        *parts: str,
    ) -> Path:

        base_path = base_path.resolve()

        target_path = (
            base_path.joinpath(*parts)
        ).resolve()

        if (
            target_path != base_path
            and base_path not in target_path.parents
        ):

            raise ValueError(
                "Ruta de almacenamiento inválida."
            )

        return target_path


    # ======================================================
    # CARPETA DE CATEGORÍA
    # ======================================================

    @staticmethod
    def create_category_folder(
        folder_name: str,
    ) -> Path:

        PRODUCTS_UPLOAD_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        category_path = (
            ImageService._safe_path(
                PRODUCTS_UPLOAD_DIR,
                folder_name,
            )
        )

        category_path.mkdir(
            parents=True,
            exist_ok=True,
        )

        return category_path


    # ======================================================
    # CARPETA DE PRODUCTO
    # ======================================================

    @staticmethod
    def create_product_folder(
        category_folder: str,
        product_slug: str,
    ) -> tuple[Path, bool]:

        category_path = (
            ImageService.create_category_folder(
                category_folder
            )
        )

        product_path = (
            ImageService._safe_path(
                category_path,
                product_slug,
            )
        )

        already_exists = (
            product_path.exists()
        )

        product_path.mkdir(
            parents=True,
            exist_ok=True,
        )

        return (
            product_path,
            not already_exists,
        )


    # ======================================================
    # ELIMINAR CARPETA VACÍA
    # ======================================================

    @staticmethod
    def remove_empty_product_folder(
        category_folder: str,
        product_slug: str,
    ) -> None:

        category_path = (
            ImageService._safe_path(
                PRODUCTS_UPLOAD_DIR,
                category_folder,
            )
        )

        product_path = (
            ImageService._safe_path(
                category_path,
                product_slug,
            )
        )

        if (
            product_path.exists()
            and product_path.is_dir()
            and not any(
                product_path.iterdir()
            )
        ):

            product_path.rmdir()