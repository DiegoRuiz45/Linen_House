from fastapi import (
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import delete, select
from sqlalchemy.exc import (
    IntegrityError,
    SQLAlchemyError,
)
from sqlalchemy.orm import Session

from app.modules.carts.model import CartItem
from app.modules.categories.repository import CategoryRepository
from app.modules.inventory.model import InventoryMovement
from app.modules.orders.model import OrderItem
from app.modules.products.model import (
    Product,
    ProductImage,
    ProductVariant,
)
from app.modules.products.repository import ProductRepository
from app.modules.products.schemas import (
    ProductAdminListResponse,
    ProductCatalogResponse,
    ProductCreate,
    ProductDetailResponse,
    ProductImageUpdate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)
from app.shared.enums import InventoryMovementType
from app.shared.utils import slugify
from app.storage.image_service import ImageService


class ProductService:

    # ======================================================
    # VALIDAR COMBINACIÓN DE VARIANTE
    # ======================================================

    @staticmethod
    def _validate_variant_combination(
        db: Session,
        product_id: int,
        size: str,
        color: str,
        exclude_variant_id: int | None = None,
    ) -> None:

        variants = (
            ProductRepository.get_variants(
                db,
                product_id,
                only_active=False,
            )
        )

        normalized_size = (
            size
            .strip()
            .lower()
        )

        normalized_color = (
            color
            .strip()
            .lower()
        )

        for variant in variants:

            if (
                exclude_variant_id is not None
                and variant.id == exclude_variant_id
            ):
                continue

            if (
                variant.size.strip().lower()
                == normalized_size
                and
                variant.color.strip().lower()
                == normalized_color
            ):

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Ya existe una variante con "
                        "esa talla y color."
                    ),
                )


    # ======================================================
    # PRODUCTOS PÚBLICOS
    # ======================================================

    @staticmethod
    def get_active_products(
        db: Session,
    ) -> list[ProductCatalogResponse]:

        products = (
            ProductRepository.get_active(
                db
            )
        )

        result: list[
            ProductCatalogResponse
        ] = []


        for product in products:

            # ==============================================
            # CATEGORÍA
            # ==============================================

            category = (
                CategoryRepository.get_by_id(
                    db,
                    product.category_id,
                )
            )

            # Un producto no debe aparecer en la tienda
            # si su categoría ya no existe o está inactiva.
            if (
                category is None
                or not category.active
            ):
                continue


            # ==============================================
            # VARIANTES ACTIVAS
            # ==============================================

            variants = (
                ProductRepository.get_variants(
                    db,
                    product.id,
                    only_active=True,
                )
            )


            sizes: list[str] = []
            colors: list[str] = []

            stock_total = 0


            for variant in variants:

                if (
                    variant.size
                    not in sizes
                ):

                    sizes.append(
                        variant.size
                    )


                if (
                    variant.color
                    not in colors
                ):

                    colors.append(
                        variant.color
                    )


                stock_total += (
                    variant.stock
                )


            # ==============================================
            # IMAGEN PRINCIPAL
            # ==============================================

            primary_image = (
                ProductRepository.get_primary_image(
                    db,
                    product.id,
                )
            )


            # Si por alguna razón no existe una imagen
            # marcada como principal, usamos la primera.
            if primary_image is None:

                images = (
                    ProductRepository.get_images(
                        db,
                        product.id,
                    )
                )

                if images:

                    primary_image = (
                        images[0]
                    )


            primary_image_url = (
                primary_image.image_url
                if primary_image is not None
                else None
            )


            # ==============================================
            # RESPUESTA
            # ==============================================

            result.append(
                ProductCatalogResponse(
                    id=product.id,

                    category_id=(
                        product.category_id
                    ),

                    category_name=(
                        category.name
                    ),

                    category_slug=(
                        category.slug
                    ),

                    name=product.name,

                    slug=product.slug,

                    description=(
                        product.description
                    ),

                    base_price=(
                        product.base_price
                    ),

                    previous_price=(
                        product.previous_price
                    ),

                    primary_image_url=(
                        primary_image_url
                    ),

                    sizes=sizes,

                    colors=colors,

                    stock_total=(
                        stock_total
                    ),

                    in_stock=(
                        stock_total > 0
                    ),

                    active=product.active,

                    featured=product.featured,

                    created_at=(
                        product.created_at
                    ),

                    updated_at=(
                        product.updated_at
                    ),
                )
            )


        return result


    # ======================================================
    # PRODUCTOS ADMIN
    # ======================================================

    @staticmethod
    def get_all_products(
        db: Session,
    ) -> list[ProductAdminListResponse]:

        products = ProductRepository.get_admin_list(db)
        result: list[ProductAdminListResponse] = []

        for (
            product,
            category_name,
            variants_count,
            stock_total,
            primary_image_url,
        ) in products:
            result.append(
                ProductAdminListResponse(
                    id=product.id,
                    category_id=product.category_id,
                    category_name=category_name,
                    name=product.name,
                    slug=product.slug,
                    description=product.description,
                    base_price=product.base_price,
                    previous_price=product.previous_price,
                    active=product.active,
                    featured=product.featured,
                    created_at=product.created_at,
                    updated_at=product.updated_at,
                    primary_image_url=primary_image_url,
                    variants_count=variants_count,
                    stock_total=stock_total,
                )
            )

        return result


    # ======================================================
    # DETALLE DE PRODUCTO
    # ======================================================

    @staticmethod
    def get_product_detail(
        db: Session,
        slug: str,
        public: bool = True,
    ) -> ProductDetailResponse:

        product = (
            ProductRepository.get_by_slug(
                db,
                slug,
            )
        )


        if product is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )

        category = (
            CategoryRepository.get_by_id(
                db,
                product.category_id,
            )
        )


        if category is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada.",
            )


        # ==============================================
        # VALIDACIONES DEL CATÁLOGO PÚBLICO
        # ==============================================

        if public:

            if not product.active:

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado.",
                )


            if not category.active:

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Producto no encontrado.",
                )


        # ==============================================
        # IMÁGENES
        # ==============================================

        images = (
            ProductRepository.get_images(
                db,
                product.id,
            )
        )


        # ==============================================
        # VARIANTES
        # ==============================================

        variants = (
            ProductRepository.get_variants(
                db,
                product.id,
                only_active=public,
            )
        )


        return ProductDetailResponse(
            id=product.id,

            category_id=(
                product.category_id
            ),

            category_name=(
                category.name
            ),

            category_slug=(
                category.slug
            ),

            name=product.name,

            slug=product.slug,

            description=(
                product.description
            ),

            base_price=(
                product.base_price
            ),

            previous_price=(
                product.previous_price
            ),

            active=product.active,

            featured=product.featured,

            created_at=(
                product.created_at
            ),

            updated_at=(
                product.updated_at
            ),

            images=images,

            variants=variants,
        )


    @staticmethod
    def get_admin_product_detail(
        db: Session,
        product_id: int,
    ) -> ProductDetailResponse:
        product = ProductRepository.get_by_id(db, product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )

        return ProductService.get_product_detail(
            db=db,
            slug=product.slug,
            public=False,
        )


    # ======================================================
    # CREAR PRODUCTO
    # ======================================================

    @staticmethod
    def create_product(
        db: Session,
        data: ProductCreate,
        user_id: int,
    ) -> Product:

        # ==============================================
        # CATEGORÍA
        # ==============================================

        category = (
            CategoryRepository.get_by_id(
                db,
                data.category_id,
            )
        )


        if category is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada.",
            )


        if not category.active:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No puedes crear productos "
                    "en una categoría inactiva."
                ),
            )


        # ==============================================
        # SLUG
        # ==============================================

        slug = slugify(
            data.name
        )


        if not slug:

            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "El nombre del producto "
                    "no es válido."
                ),
            )


        existing_product = (
            ProductRepository.get_by_slug(
                db,
                slug,
            )
        )


        if existing_product:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Ya existe un producto "
                    "con ese nombre o slug."
                ),
            )


        # ==============================================
        # VALIDAR VARIANTES DEL REQUEST
        # ==============================================

        sku_set: set[str] = set()

        combination_set: set[
            tuple[str, str]
        ] = set()

        prices_by_size: dict[
            str,
            tuple[object, object],
        ] = {}


        for variant_data in data.variants:

            sku = (
                variant_data
                .sku
                .strip()
                .upper()
            )

            size = (
                variant_data
                .size
                .strip()
            )

            color = (
                variant_data
                .color
                .strip()
            )

            effective_prices = (
                variant_data.price
                if variant_data.price is not None
                else data.base_price,
                variant_data.previous_price
                if variant_data.previous_price is not None
                else data.previous_price,
            )

            normalized_size = size.lower()
            if (
                normalized_size in prices_by_size
                and prices_by_size[normalized_size]
                != effective_prices
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Todos los colores de la talla {size} "
                        "deben tener el mismo precio actual y anterior."
                    ),
                )

            prices_by_size[normalized_size] = effective_prices


            # ==========================================
            # SKU DUPLICADO DENTRO DEL REQUEST
            # ==========================================

            if sku in sku_set:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"El SKU {sku} está repetido "
                        "en las variantes enviadas."
                    ),
                )


            sku_set.add(
                sku
            )


            # ==========================================
            # SKU DUPLICADO EN BASE DE DATOS
            # ==========================================

            existing_sku = (
                ProductRepository.get_variant_by_sku(
                    db,
                    sku,
                )
            )


            if existing_sku:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"El SKU {sku} ya existe."
                    ),
                )


            # ==========================================
            # TALLA + COLOR DUPLICADOS EN REQUEST
            # ==========================================

            combination = (
                size.lower(),
                color.lower(),
            )


            if (
                combination
                in combination_set
            ):

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Hay variantes repetidas "
                        "con la misma talla y color."
                    ),
                )


            combination_set.add(
                combination
            )


        # ==============================================
        # PRODUCTO
        # ==============================================

        product = Product(
            category_id=(
                data.category_id
            ),

            name=(
                data.name.strip()
            ),

            slug=slug,

            description=(
                data.description
            ),

            base_price=(
                data.base_price
            ),

            previous_price=(
                data.previous_price
            ),

            active=data.active,

            featured=(
                data.featured
            ),
        )


        product_folder_created = False


        try:

            # ==========================================
            # CREAR PRODUCTO
            # ==========================================

            db.add(
                product
            )

            # Necesitamos product.id pero todavía
            # no queremos confirmar la transacción.
            db.flush()


            # ==========================================
            # CREAR CARPETA DEL PRODUCTO
            # ==========================================

            (
                _,
                product_folder_created,
            ) = (
                ImageService.create_product_folder(
                    category.folder_name,
                    product.slug,
                )
            )


            # ==========================================
            # CREAR VARIANTES
            # ==========================================

            for variant_data in data.variants:

                variant = ProductVariant(
                    product_id=(
                        product.id
                    ),

                    size=(
                        variant_data
                        .size
                        .strip()
                    ),

                    color=(
                        variant_data
                        .color
                        .strip()
                    ),

                    sku=(
                        variant_data
                        .sku
                        .strip()
                        .upper()
                    ),

                    price=(
                        variant_data.price
                    ),

                    previous_price=(
                        variant_data.previous_price
                    ),

                    stock=(
                        variant_data.stock
                    ),

                    minimum_stock=(
                        variant_data.minimum_stock
                    ),

                    active=variant_data.active,
                )


                db.add(
                    variant
                )

                # Obtener variant.id.
                db.flush()


                # ======================================
                # INVENTARIO INICIAL
                # ======================================

                initial_movement = (
                    InventoryMovement(
                        variant_id=(
                            variant.id
                        ),

                        movement_type=(
                            InventoryMovementType.INITIAL
                        ),

                        quantity_change=(
                            variant.stock
                        ),

                        stock_before=0,

                        stock_after=(
                            variant.stock
                        ),

                        reason=(
                            "Stock inicial al crear "
                            "la variante."
                        ),

                        reference_type=(
                            "product"
                        ),

                        reference_id=(
                            product.id
                        ),

                        created_by_user_id=(
                            user_id
                        ),
                    )
                )


                db.add(
                    initial_movement
                )


            # ==========================================
            # CONFIRMAR TODO
            # ==========================================

            db.commit()

            db.refresh(
                product
            )

            return product


        except IntegrityError as error:

            db.rollback()


            if product_folder_created:

                try:

                    ImageService.remove_empty_product_folder(
                        category.folder_name,
                        slug,
                    )

                except OSError:

                    pass


            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No fue posible crear el producto. "
                    "Revisa variantes, combinaciones "
                    "o SKU duplicados."
                ),
            ) from error


        except SQLAlchemyError as error:

            db.rollback()


            if product_folder_created:

                try:

                    ImageService.remove_empty_product_folder(
                        category.folder_name,
                        slug,
                    )

                except OSError:

                    pass


            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible registrar "
                    "el producto."
                ),
            ) from error


        except (OSError, ValueError) as error:

            db.rollback()


            if product_folder_created:

                try:

                    ImageService.remove_empty_product_folder(
                        category.folder_name,
                        slug,
                    )

                except OSError:

                    pass


            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible crear la carpeta "
                    "del producto."
                ),
            ) from error


    # ======================================================
    # ACTUALIZAR PRODUCTO
    # ======================================================

    @staticmethod
    def update_product(
        db: Session,
        product_id: int,
        data: ProductUpdate,
    ) -> Product:

        product = (
            ProductRepository.get_by_id(
                db,
                product_id,
            )
        )


        if product is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )


        update_data = (
            data.model_dump(
                exclude_unset=True
            )
        )


        old_category = (
            CategoryRepository.get_by_id(
                db,
                product.category_id,
            )
        )


        new_category = None

        category_changed = False

        new_folder_created = False


        # ==============================================
        # CAMBIO DE CATEGORÍA
        # ==============================================

        if "category_id" in update_data:

            new_category = (
                CategoryRepository.get_by_id(
                    db,
                    update_data[
                        "category_id"
                    ],
                )
            )


            if new_category is None:

                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Categoría no encontrada.",
                )


            if not new_category.active:

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "La categoría se encuentra "
                        "inactiva."
                    ),
                )


            category_changed = (
                new_category.id
                != product.category_id
            )


            # Las imágenes actuales están físicamente
            # dentro de la carpeta de la categoría.
            #
            # Hasta implementar migración física de
            # archivos, evitamos romper sus URLs.
            if category_changed:

                current_images = (
                    ProductRepository.get_images(
                        db,
                        product.id,
                    )
                )


                if current_images:

                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "No puedes cambiar la categoría "
                            "de un producto que ya tiene "
                            "imágenes. Elimina o migra "
                            "las imágenes primero."
                        ),
                    )


                try:

                    (
                        _,
                        new_folder_created,
                    ) = (
                        ImageService.create_product_folder(
                            new_category.folder_name,
                            product.slug,
                        )
                    )

                except (
                    OSError,
                    ValueError,
                ) as error:

                    raise HTTPException(
                        status_code=(
                            status.HTTP_500_INTERNAL_SERVER_ERROR
                        ),
                        detail=(
                            "No fue posible preparar "
                            "la carpeta de la nueva categoría."
                        ),
                    ) from error


        # ==============================================
        # NOMBRE
        # ==============================================

        if "name" in update_data:

            product.name = (
                update_data[
                    "name"
                ].strip()
            )

            # El slug permanece estable.
            #
            # Esto evita romper:
            # - URLs
            # - imágenes
            # - referencias existentes.
            update_data.pop(
                "name"
            )


        # ==============================================
        # APLICAR CAMPOS
        # ==============================================

        for (
            field,
            value,
        ) in update_data.items():

            setattr(
                product,
                field,
                value,
            )


        try:

            updated_product = (
                ProductRepository.save(
                    db,
                    product,
                )
            )


        except IntegrityError as error:

            db.rollback()


            if (
                category_changed
                and new_folder_created
                and new_category is not None
            ):

                try:

                    ImageService.remove_empty_product_folder(
                        new_category.folder_name,
                        product.slug,
                    )

                except OSError:

                    pass


            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No fue posible actualizar "
                    "el producto."
                ),
            ) from error


        except SQLAlchemyError as error:

            db.rollback()


            if (
                category_changed
                and new_folder_created
                and new_category is not None
            ):

                try:

                    ImageService.remove_empty_product_folder(
                        new_category.folder_name,
                        product.slug,
                    )

                except OSError:

                    pass


            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible actualizar "
                    "el producto."
                ),
            ) from error


        # ==============================================
        # LIMPIAR CARPETA ANTERIOR VACÍA
        # ==============================================

        if (
            category_changed
            and old_category is not None
        ):

            try:

                ImageService.remove_empty_product_folder(
                    old_category.folder_name,
                    product.slug,
                )

            except OSError:

                # La actualización de BD ya fue correcta.
                # No hacemos fallar la petición solo
                # porque una carpeta vacía no pudo
                # eliminarse.
                pass


        return updated_product


    # ======================================================
    # DESACTIVAR PRODUCTO
    # ======================================================

    @staticmethod
    def deactivate_product(
        db: Session,
        product_id: int,
    ) -> None:

        product = (
            ProductRepository.get_by_id(
                db,
                product_id,
            )
        )


        if product is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )


        product.active = False


        try:

            ProductRepository.save(
                db,
                product,
            )


        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible desactivar "
                    "el producto."
                ),
            ) from error


    # ======================================================
    # CREAR VARIANTE
    # ======================================================

    @staticmethod
    def create_variant(
        db: Session,
        product_id: int,
        data: ProductVariantCreate,
        user_id: int,
    ) -> ProductVariant:

        product = (
            ProductRepository.get_by_id(
                db,
                product_id,
            )
        )


        if product is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )


        sku = (
            data.sku
            .strip()
            .upper()
        )

        size = (
            data.size
            .strip()
        )

        color = (
            data.color
            .strip()
        )


        # ==============================================
        # SKU
        # ==============================================

        existing_sku = (
            ProductRepository.get_variant_by_sku(
                db,
                sku,
            )
        )


        if existing_sku:

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El SKU ya existe.",
            )


        # ==============================================
        # TALLA + COLOR
        # ==============================================

        ProductService._validate_variant_combination(
            db=db,
            product_id=product.id,
            size=size,
            color=color,
        )

        size_variants = [
            existing_variant
            for existing_variant in ProductRepository.get_variants(
                db,
                product.id,
                only_active=False,
            )
            if existing_variant.size.strip().lower()
            == size.lower()
        ]

        if size_variants:
            reference = size_variants[0]
            reference_prices = (
                reference.price
                if reference.price is not None
                else product.base_price,
                reference.previous_price
                if reference.previous_price is not None
                else product.previous_price,
            )
            new_prices = (
                data.price
                if data.price is not None
                else product.base_price,
                data.previous_price
                if data.previous_price is not None
                else product.previous_price,
            )
            if reference_prices != new_prices:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"La talla {size} ya tiene otro precio. "
                        "Todos sus colores deben compartir el mismo valor."
                    ),
                )


        # ==============================================
        # CREAR
        # ==============================================

        variant = ProductVariant(
            product_id=(
                product.id
            ),

            size=size,

            color=color,

            sku=sku,

            price=(
                data.price
            ),

            previous_price=(
                data.previous_price
            ),

            stock=(
                data.stock
            ),

            minimum_stock=(
                data.minimum_stock
            ),

            active=data.active,
        )


        try:

            db.add(
                variant
            )

            db.flush()


            # ==========================================
            # MOVIMIENTO INITIAL
            # ==========================================

            initial_movement = (
                InventoryMovement(
                    variant_id=(
                        variant.id
                    ),

                    movement_type=(
                        InventoryMovementType.INITIAL
                    ),

                    quantity_change=(
                        variant.stock
                    ),

                    stock_before=0,

                    stock_after=(
                        variant.stock
                    ),

                    reason=(
                        "Stock inicial al crear "
                        "la variante."
                    ),

                    reference_type=(
                        "product"
                    ),

                    reference_id=(
                        product.id
                    ),

                    created_by_user_id=(
                        user_id
                    ),
                )
            )


            db.add(
                initial_movement
            )


            db.commit()

            db.refresh(
                variant
            )

            return variant


        except IntegrityError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No fue posible crear la variante. "
                    "Revisa el SKU, talla y color."
                ),
            ) from error


        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible crear "
                    "la variante."
                ),
            ) from error


    # ======================================================
    # ACTUALIZAR VARIANTE
    # ======================================================

    @staticmethod
    def update_variant(
        db: Session,
        product_id: int,
        variant_id: int,
        data: ProductVariantUpdate,
    ) -> ProductVariant:

        variant = (
            ProductRepository.get_variant_by_id(
                db,
                product_id,
                variant_id,
            )
        )


        if variant is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante no encontrada.",
            )


        update_data = (
            data.model_dump(
                exclude_unset=True
            )
        )


        # ==============================================
        # NORMALIZAR SKU
        # ==============================================

        if "sku" in update_data:

            new_sku = (
                update_data[
                    "sku"
                ]
                .strip()
                .upper()
            )


            existing = (
                ProductRepository.get_variant_by_sku(
                    db,
                    new_sku,
                )
            )


            if (
                existing is not None
                and existing.id
                != variant.id
            ):

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El SKU ya existe.",
                )


            update_data[
                "sku"
            ] = new_sku


        # ==============================================
        # NORMALIZAR TALLA
        # ==============================================

        if "size" in update_data:

            update_data[
                "size"
            ] = (
                update_data[
                    "size"
                ].strip()
            )


        # ==============================================
        # NORMALIZAR COLOR
        # ==============================================

        if "color" in update_data:

            update_data[
                "color"
            ] = (
                update_data[
                    "color"
                ].strip()
            )


        # ==============================================
        # VALIDAR COMBINACIÓN FINAL
        # ==============================================

        final_size = (
            update_data.get(
                "size",
                variant.size,
            )
        )

        final_color = (
            update_data.get(
                "color",
                variant.color,
            )
        )


        ProductService._validate_variant_combination(
            db=db,
            product_id=product_id,
            size=final_size,
            color=final_color,
            exclude_variant_id=(
                variant.id
            ),
        )

        size_variants = [
            existing_variant
            for existing_variant in ProductRepository.get_variants(
                db,
                product_id,
                only_active=False,
            )
            if existing_variant.id != variant.id
            and existing_variant.size.strip().lower()
            == final_size.lower()
        ]

        size_changed = (
            final_size.lower()
            != variant.size.strip().lower()
        )
        if size_changed and size_variants:
            if "price" not in update_data:
                update_data["price"] = size_variants[0].price
            if "previous_price" not in update_data:
                update_data["previous_price"] = (
                    size_variants[0].previous_price
                )

        for size_variant in size_variants:
            if "price" in update_data:
                size_variant.price = update_data["price"]
                db.add(size_variant)
            if "previous_price" in update_data:
                size_variant.previous_price = (
                    update_data["previous_price"]
                )
                db.add(size_variant)


        # ==============================================
        # APLICAR
        # ==============================================

        for (
            field,
            value,
        ) in update_data.items():

            setattr(
                variant,
                field,
                value,
            )


        try:

            return (
                ProductRepository.save_variant(
                    db,
                    variant,
                )
            )


        except IntegrityError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No fue posible actualizar "
                    "la variante. Revisa SKU, "
                    "talla y color."
                ),
            ) from error


        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "No fue posible actualizar "
                    "la variante."
                ),
            ) from error


    # ======================================================
    # ELIMINAR VARIANTE
    # ======================================================

    @staticmethod
    def delete_variant(
        db: Session,
        product_id: int,
        variant_id: int,
    ) -> None:

        variant = (
            ProductRepository.get_variant_by_id(
                db,
                product_id,
                variant_id,
            )
        )

        if variant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante no encontrada.",
            )

        order_item_id = db.scalar(
            select(OrderItem.id)
            .where(OrderItem.variant_id == variant.id)
            .limit(1)
        )

        if order_item_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "No se puede eliminar una variante que ya pertenece "
                    "a un pedido. Desactívala para conservar el historial."
                ),
            )

        try:
            # Los carritos no son historial comercial y no deben mantener
            # referencias a una variante eliminada.
            db.execute(
                delete(CartItem)
                .where(CartItem.variant_id == variant.id)
            )

            # Una variante sin pedidos puede eliminarse junto con sus
            # movimientos; la propia petición queda en la auditoría admin.
            db.execute(
                delete(InventoryMovement)
                .where(InventoryMovement.variant_id == variant.id)
            )

            db.delete(variant)
            db.commit()

        except IntegrityError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "La variante tiene información relacionada y no puede "
                    "eliminarse. Puedes desactivarla en su lugar."
                ),
            ) from error

        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible eliminar la variante.",
            ) from error


    # ======================================================
    # SUBIR IMAGEN DE PRODUCTO
    # ======================================================

    @staticmethod
    async def upload_product_image(
        db: Session,
        product_id: int,
        file: UploadFile,
        alt_text: str | None = None,
        is_primary: bool = False,
    ) -> ProductImage:

        # ==============================================
        # PRODUCTO
        # ==============================================

        product = (
            ProductRepository.get_by_id(
                db,
                product_id,
            )
        )


        if product is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )


        # ==============================================
        # CATEGORÍA
        # ==============================================

        category = (
            CategoryRepository.get_by_id(
                db,
                product.category_id,
            )
        )


        if category is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Categoría del producto "
                    "no encontrada."
                ),
            )


        # ==============================================
        # IMÁGENES ACTUALES
        # ==============================================

        current_images = (
            ProductRepository.get_images(
                db,
                product.id,
            )
        )


        # La primera imagen siempre será principal.
        if not current_images:

            is_primary = True


        # La posición debe calcularse por el máximo,
        # no por len(), porque pueden haberse borrado
        # imágenes anteriormente.
        next_position = (
            max(
                (
                    image.position
                    for image
                    in current_images
                ),
                default=-1,
            )
            + 1
        )


        # ==============================================
        # GUARDAR ARCHIVO FÍSICO
        # ==============================================

        try:

            (
                file_name,
                image_url,
            ) = (
                await ImageService.save_product_image(
                    file=file,

                    category_folder=(
                        category.folder_name
                    ),

                    product_slug=(
                        product.slug
                    ),
                )
            )


        except ValueError as error:

            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=str(
                    error
                ),
            ) from error


        except OSError as error:

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "No fue posible almacenar "
                    "la imagen."
                ),
            ) from error


        # ==============================================
        # REGISTRAR EN BASE DE DATOS
        # ==============================================

        try:

            if is_primary:

                (
                    ProductRepository
                    .unset_primary_images(
                        db,
                        product.id,
                    )
                )


            normalized_alt_text = (
                alt_text.strip()
                if (
                    alt_text
                    and alt_text.strip()
                )
                else None
            )


            image = ProductImage(
                product_id=(
                    product.id
                ),

                file_name=(
                    file_name
                ),

                image_url=(
                    image_url
                ),

                alt_text=(
                    normalized_alt_text
                ),

                position=(
                    next_position
                ),

                is_primary=(
                    is_primary
                ),
            )


            ProductRepository.create_image(
                db,
                image,
                commit=False,
            )


            db.commit()

            db.refresh(
                image
            )


            return image


        except SQLAlchemyError as error:

            db.rollback()


            # El archivo ya había sido creado.
            # Si MySQL falla, lo eliminamos para
            # no dejar archivos huérfanos.
            try:

                ImageService.delete_product_image(
                    category.folder_name,
                    product.slug,
                    file_name,
                )

            except OSError:

                pass


            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "No fue posible registrar "
                    "la imagen."
                ),
            ) from error


    # ======================================================
    # ACTUALIZAR METADATOS DE IMAGEN
    # ======================================================

    @staticmethod
    def update_product_image(
        db: Session,
        product_id: int,
        image_id: int,
        data: ProductImageUpdate,
    ) -> ProductImage:

        product = ProductRepository.get_by_id(db, product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )

        image = ProductRepository.get_image_by_id(
            db,
            product_id,
            image_id,
        )
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Imagen no encontrada.",
            )

        update_data = data.model_dump(exclude_unset=True)

        if "alt_text" in update_data:
            alt_text = update_data["alt_text"]
            update_data["alt_text"] = (
                alt_text.strip()
                if alt_text and alt_text.strip()
                else None
            )

        try:
            if update_data.get("is_primary") is True:
                ProductRepository.unset_primary_images(db, product_id)
            elif (
                update_data.get("is_primary") is False
                and image.is_primary
            ):
                alternatives = [
                    candidate
                    for candidate in ProductRepository.get_images(db, product_id)
                    if candidate.id != image.id
                ]
                if alternatives:
                    alternatives[0].is_primary = True
                else:
                    update_data["is_primary"] = True

            for field, value in update_data.items():
                setattr(image, field, value)

            return ProductRepository.save_image(db, image)

        except SQLAlchemyError as error:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No fue posible actualizar la imagen.",
            ) from error


    # ======================================================
    # ELIMINAR IMAGEN
    # ======================================================

    @staticmethod
    def delete_product_image(
        db: Session,
        product_id: int,
        image_id: int,
    ) -> None:

        # ==============================================
        # PRODUCTO
        # ==============================================

        product = (
            ProductRepository.get_by_id(
                db,
                product_id,
            )
        )


        if product is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado.",
            )


        # ==============================================
        # IMAGEN
        # ==============================================

        image = (
            ProductRepository.get_image_by_id(
                db,
                product_id,
                image_id,
            )
        )


        if image is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Imagen no encontrada.",
            )


        # ==============================================
        # CATEGORÍA
        # ==============================================

        category = (
            CategoryRepository.get_by_id(
                db,
                product.category_id,
            )
        )


        if category is None:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada.",
            )


        # Guardamos estos valores antes de borrar
        # el objeto de SQLAlchemy.
        file_name = (
            image.file_name
        )

        was_primary = (
            image.is_primary
        )


        # ==============================================
        # ACTUALIZAR BASE DE DATOS
        # ==============================================

        try:

            ProductRepository.delete_image(
                db,
                image,
                commit=False,
            )


            remaining_images = (
                ProductRepository.get_images(
                    db,
                    product.id,
                )
            )


            # ==========================================
            # NUEVA IMAGEN PRINCIPAL
            # ==========================================

            if (
                was_primary
                and remaining_images
            ):

                remaining_images[
                    0
                ].is_primary = True


            # ==========================================
            # REORDENAR POSICIONES
            # ==========================================

            for (
                index,
                remaining_image,
            ) in enumerate(
                remaining_images
            ):

                remaining_image.position = (
                    index
                )


            db.commit()


        except SQLAlchemyError as error:

            db.rollback()

            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "No fue posible eliminar "
                    "la imagen."
                ),
            ) from error


        # ==============================================
        # ELIMINAR ARCHIVO FÍSICO
        # ==============================================

        # La BD ya quedó correctamente actualizada.
        #
        # Si el archivo físico no puede borrarse,
        # preferimos dejar un archivo huérfano
        # antes que dejar la BD apuntando a una
        # imagen inexistente.
        try:

            ImageService.delete_product_image(
                category.folder_name,
                product.slug,
                file_name,
            )

        except OSError:

            pass
