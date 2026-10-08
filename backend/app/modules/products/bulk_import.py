import csv
import io
import re
import unicodedata
import zipfile
from collections.abc import Iterable
from decimal import Decimal, InvalidOperation
from pathlib import PurePosixPath
from urllib.parse import unquote, urlparse
from xml.etree import ElementTree

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.categories.repository import CategoryRepository
from app.modules.products.model import ProductImage
from app.modules.products.repository import ProductRepository
from app.modules.products.schemas import (
    ProductBulkImportItem,
    ProductBulkImportResponse,
    ProductCreate,
    ProductVariantCreate,
)
from app.modules.products.service import ProductService


EXPECTED_HEADERS = {
    "importar",
    "producto_clave",
    "categoria",
    "nombre",
    "descripcion",
    "precio_base",
    "precio_anterior_producto",
    "producto_activo",
    "destacado",
    "talla",
    "color",
    "sku",
    "precio_variante",
    "precio_anterior_variante",
    "stock",
    "stock_minimo",
    "variante_activa",
    "imagenes_urls",
    "imagen_alt",
}

MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_DATA_ROWS = 5000
MAX_IMAGES_PER_PRODUCT = 10


class BulkImportError(ValueError):
    pass


def _text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalized(value: object) -> str:
    plain = unicodedata.normalize("NFKD", _text(value))
    return "".join(character for character in plain if not unicodedata.combining(character)).casefold()


def _boolean(value: object, field: str, row_number: int) -> bool:
    normalized = _normalized(value)
    if normalized in {"si", "s", "yes", "true", "1"}:
        return True
    if normalized in {"no", "n", "false", "0"}:
        return False
    raise BulkImportError(
        f"Fila {row_number}: {field} debe contener SI o NO."
    )


def _decimal(
    value: object,
    field: str,
    row_number: int,
    *,
    required: bool,
) -> Decimal | None:
    raw = _text(value)
    if not raw:
        if required:
            raise BulkImportError(f"Fila {row_number}: {field} es obligatorio.")
        return None
    try:
        number = Decimal(raw)
    except InvalidOperation as error:
        raise BulkImportError(
            f"Fila {row_number}: {field} debe ser un número sin símbolos ni separadores de miles."
        ) from error
    if not number.is_finite() or number < 0:
        raise BulkImportError(f"Fila {row_number}: {field} debe ser mayor o igual a cero.")
    return number


def _integer(value: object, field: str, row_number: int) -> int:
    number = _decimal(value, field, row_number, required=True)
    if number != number.to_integral_value():
        raise BulkImportError(f"Fila {row_number}: {field} debe ser un número entero.")
    return int(number)


def _column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference.upper())
    if letters is None:
        return 0
    result = 0
    for character in letters.group(0):
        result = result * 26 + ord(character) - 64
    return result - 1


def _xlsx_rows(content: bytes) -> list[list[object]]:
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as error:
        raise BulkImportError("El archivo XLSX está dañado o no es válido.") from error

    spreadsheet_ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    relationship_ns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    package_relationship_ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    ns = {"m": spreadsheet_ns, "r": relationship_ns}

    try:
        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        relationship_id = None
        for sheet in workbook.findall("m:sheets/m:sheet", ns):
            if _normalized(sheet.attrib.get("name")) == "productos":
                relationship_id = sheet.attrib.get(f"{{{relationship_ns}}}id")
                break
        if relationship_id is None:
            raise BulkImportError("El archivo debe contener una hoja llamada Productos.")

        relationships = ElementTree.fromstring(
            archive.read("xl/_rels/workbook.xml.rels")
        )
        target = None
        for relationship in relationships.findall(
            f"{{{package_relationship_ns}}}Relationship"
        ):
            if relationship.attrib.get("Id") == relationship_id:
                target = relationship.attrib.get("Target")
                break
        if not target:
            raise BulkImportError("No fue posible leer la hoja Productos.")
        sheet_path = target.lstrip("/")
        if not sheet_path.startswith("xl/"):
            sheet_path = str(PurePosixPath("xl") / sheet_path)

        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("m:si", ns):
                shared_strings.append("".join(
                    text.text or "" for text in item.findall(".//m:t", ns)
                ))

        sheet_root = ElementTree.fromstring(archive.read(sheet_path))
    except KeyError as error:
        raise BulkImportError("El archivo XLSX no tiene la estructura esperada.") from error

    rows: list[list[object]] = []
    for row in sheet_root.findall(".//m:sheetData/m:row", ns):
        row_number = int(row.attrib.get("r", len(rows) + 1))
        while len(rows) < row_number - 1:
            rows.append([])
        values: dict[int, object] = {}
        for cell in row.findall("m:c", ns):
            cell_type = cell.attrib.get("t")
            raw_node = cell.find("m:v", ns)
            if cell_type == "inlineStr":
                value: object = "".join(
                    text.text or "" for text in cell.findall(".//m:t", ns)
                )
            elif raw_node is None:
                value = ""
            elif cell_type == "s":
                value = shared_strings[int(raw_node.text or "0")]
            elif cell_type == "b":
                value = "SI" if raw_node.text == "1" else "NO"
            else:
                value = raw_node.text or ""
            values[_column_index(cell.attrib.get("r", "A1"))] = value
        if values:
            width = max(values) + 1
            rows.append([values.get(index, "") for index in range(width)])
        else:
            rows.append([])
    return rows


def _csv_rows(content: bytes) -> list[list[object]]:
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise BulkImportError("El CSV debe estar guardado en UTF-8.") from error
    sample = decoded[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;")
    except csv.Error:
        dialect = csv.excel
    return [list(row) for row in csv.reader(io.StringIO(decoded), dialect)]


def _records(content: bytes, filename: str) -> list[dict[str, object]]:
    suffix = PurePosixPath(filename.lower()).suffix
    if suffix == ".xlsx":
        rows = _xlsx_rows(content)
    elif suffix == ".csv":
        rows = _csv_rows(content)
    else:
        raise BulkImportError("Carga un archivo .xlsx o .csv.")

    header_index = next((
        index for index, row in enumerate(rows)
        if "importar" in {_normalized(value) for value in row}
        and "producto_clave" in {_normalized(value) for value in row}
    ), None)
    if header_index is None:
        raise BulkImportError("No se encontraron los encabezados de la plantilla.")

    headers = [_normalized(value) for value in rows[header_index]]
    missing = sorted(EXPECTED_HEADERS - set(headers))
    if missing:
        raise BulkImportError(
            "Faltan columnas obligatorias: " + ", ".join(missing) + "."
        )

    records: list[dict[str, object]] = []
    for row_offset, row in enumerate(rows[header_index + 1:], start=header_index + 2):
        record = {
            header: row[index] if index < len(row) else ""
            for index, header in enumerate(headers)
            if header
        }
        if any(_text(value) for value in record.values()):
            record["__row__"] = row_offset
            records.append(record)
    if len(records) > MAX_DATA_ROWS:
        raise BulkImportError(f"El archivo supera el máximo de {MAX_DATA_ROWS} filas de datos.")
    return records


def _consistent(rows: list[dict[str, object]], field: str, label: str) -> object:
    first = rows[0].get(field, "")
    first_text = _text(first)
    for row in rows[1:]:
        if _text(row.get(field, "")) != first_text:
            raise BulkImportError(
                f"Las filas del producto no coinciden en el campo {label}."
            )
    return first


def _image_urls(rows: Iterable[dict[str, object]]) -> list[str]:
    urls: list[str] = []
    for row in rows:
        for raw_url in _text(row.get("imagenes_urls")).split("|"):
            url = raw_url.strip()
            if not url or url in urls:
                continue
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc or len(url) > 500:
                raise BulkImportError(
                    "imagenes_urls solo admite URLs públicas http/https de máximo 500 caracteres."
                )
            urls.append(url)
    if len(urls) > MAX_IMAGES_PER_PRODUCT:
        raise BulkImportError(
            f"Cada producto admite máximo {MAX_IMAGES_PER_PRODUCT} imágenes en la carga."
        )
    return urls


def _error_message(error: Exception) -> str:
    if isinstance(error, HTTPException):
        return str(error.detail)
    if isinstance(error, ValidationError):
        first = error.errors()[0]
        field = ".".join(str(part) for part in first.get("loc", []))
        return f"{field}: {first.get('msg', 'dato inválido')}."
    return str(error) or "No fue posible crear el producto."


class ProductBulkImporter:

    @staticmethod
    def import_file(
        db: Session,
        *,
        content: bytes,
        filename: str,
        user_id: int,
    ) -> ProductBulkImportResponse:
        if not content:
            raise BulkImportError("El archivo está vacío.")
        if len(content) > MAX_FILE_SIZE:
            raise BulkImportError("El archivo no puede superar 5 MB.")

        records = _records(content, filename)
        grouped: dict[str, list[dict[str, object]]] = {}
        skipped_rows = 0
        for row in records:
            row_number = int(row["__row__"])
            flag = _normalized(row.get("importar"))
            if flag in {"no", "n", "false", "0", ""}:
                skipped_rows += 1
                continue
            if flag not in {"si", "s", "yes", "true", "1"}:
                raise BulkImportError(
                    f"Fila {row_number}: importar debe contener SI o NO."
                )
            key = _text(row.get("producto_clave")) or f"FILA-{row_number}"
            grouped.setdefault(key.casefold(), []).append(row)

        if not grouped:
            raise BulkImportError(
                "No hay filas marcadas con SI en la columna importar."
            )

        categories = {
            category.name.strip().casefold(): category
            for category in CategoryRepository.get_all(db)
            if category.active
        }
        results: list[ProductBulkImportItem] = []

        for normalized_key, rows in grouped.items():
            key = _text(rows[0].get("producto_clave")) or normalized_key
            name = _text(rows[0].get("nombre")) or None
            try:
                category_name = _text(_consistent(rows, "categoria", "categoria"))
                name = _text(_consistent(rows, "nombre", "nombre"))
                description = _text(_consistent(rows, "descripcion", "descripcion")) or None
                base_price = _decimal(
                    _consistent(rows, "precio_base", "precio_base"),
                    "precio_base",
                    int(rows[0]["__row__"]),
                    required=True,
                )
                previous_price = _decimal(
                    _consistent(
                        rows,
                        "precio_anterior_producto",
                        "precio_anterior_producto",
                    ),
                    "precio_anterior_producto",
                    int(rows[0]["__row__"]),
                    required=False,
                )
                active = _boolean(
                    _consistent(rows, "producto_activo", "producto_activo"),
                    "producto_activo",
                    int(rows[0]["__row__"]),
                )
                featured = _boolean(
                    _consistent(rows, "destacado", "destacado"),
                    "destacado",
                    int(rows[0]["__row__"]),
                )
                if not category_name or category_name.casefold() not in categories:
                    raise BulkImportError(
                        f"La categoría '{category_name or '(vacía)'}' no existe o está inactiva."
                    )

                variants: list[ProductVariantCreate] = []
                prices_by_size: dict[str, tuple[Decimal, Decimal | None]] = {}
                for row in rows:
                    row_number = int(row["__row__"])
                    size = _text(row.get("talla"))
                    color = _text(row.get("color"))
                    sku = _text(row.get("sku"))
                    if not size or not color or not sku:
                        raise BulkImportError(
                            f"Fila {row_number}: talla, color y sku son obligatorios."
                        )
                    variant_price = _decimal(
                        row.get("precio_variante"),
                        "precio_variante",
                        row_number,
                        required=False,
                    )
                    variant_previous_price = _decimal(
                        row.get("precio_anterior_variante"),
                        "precio_anterior_variante",
                        row_number,
                        required=False,
                    )
                    effective_prices = (
                        variant_price if variant_price is not None else base_price,
                        variant_previous_price if variant_previous_price is not None else previous_price,
                    )
                    normalized_size = size.casefold()
                    if (
                        normalized_size in prices_by_size
                        and prices_by_size[normalized_size] != effective_prices
                    ):
                        raise BulkImportError(
                            f"Todos los colores de la talla {size} deben tener el mismo precio actual y anterior."
                        )
                    prices_by_size[normalized_size] = effective_prices
                    variants.append(ProductVariantCreate(
                        size=size,
                        color=color,
                        sku=sku,
                        price=variant_price,
                        previous_price=variant_previous_price,
                        stock=_integer(row.get("stock"), "stock", row_number),
                        minimum_stock=_integer(
                            row.get("stock_minimo"),
                            "stock_minimo",
                            row_number,
                        ),
                        active=_boolean(
                            row.get("variante_activa"),
                            "variante_activa",
                            row_number,
                        ),
                    ))

                urls = _image_urls(rows)
                alt_text = next((
                    _text(row.get("imagen_alt"))
                    for row in rows
                    if _text(row.get("imagen_alt"))
                ), name)
                if len(alt_text) > 255:
                    raise BulkImportError("imagen_alt no puede superar 255 caracteres.")

                product = ProductService.create_product(
                    db=db,
                    data=ProductCreate(
                        category_id=categories[category_name.casefold()].id,
                        name=name,
                        description=description,
                        base_price=base_price,
                        previous_price=previous_price,
                        featured=featured,
                        active=active,
                        variants=variants,
                    ),
                    user_id=user_id,
                )
                for position, url in enumerate(urls):
                    parsed = urlparse(url)
                    file_name = unquote(PurePosixPath(parsed.path).name)
                    if not file_name:
                        file_name = f"imagen-remota-{position + 1}.jpg"
                    ProductRepository.create_image(
                        db,
                        ProductImage(
                            product_id=product.id,
                            file_name=file_name[:255],
                            image_url=url,
                            alt_text=alt_text,
                            position=position,
                            is_primary=position == 0,
                        ),
                        commit=False,
                    )
                if urls:
                    db.commit()

                results.append(ProductBulkImportItem(
                    product_key=key,
                    name=name,
                    created=True,
                    product_id=product.id,
                    message="Producto creado correctamente.",
                ))
            except (BulkImportError, HTTPException, ValidationError, SQLAlchemyError) as error:
                db.rollback()
                results.append(ProductBulkImportItem(
                    product_key=key,
                    name=name,
                    created=False,
                    message=_error_message(error),
                ))

        created_products = sum(result.created for result in results)
        return ProductBulkImportResponse(
            processed_products=len(results),
            created_products=created_products,
            failed_products=len(results) - created_products,
            skipped_rows=skipped_rows,
            results=results,
        )
