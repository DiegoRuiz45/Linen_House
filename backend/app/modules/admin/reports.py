import csv
from io import StringIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_admin, require_trusted_origin
from app.modules.inventory.repository import InventoryRepository
from app.modules.orders.model import Order
from app.modules.users.model import User


router = APIRouter(
    prefix="/admin/reports",
    tags=["Admin - Reports"],
    dependencies=[Depends(require_trusted_origin)],
)


def csv_response(buffer: StringIO, filename: str) -> StreamingResponse:
    content = "\ufeff" + buffer.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def safe_csv_text(value: str) -> str:
    value = str(value)
    if value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{value}"
    return value


@router.get("/sales.csv")
def sales_report(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        [
            "pedido", "fecha", "cliente", "correo", "estado", "pago",
            "subtotal", "descuento", "envio", "total", "moneda",
        ]
    )
    for order in db.scalars(select(Order).order_by(Order.created_at.desc())).all():
        writer.writerow(
            [
                order.number,
                order.created_at.isoformat(sep=" "),
                safe_csv_text(f"{order.customer_first_name} {order.customer_last_name}"),
                safe_csv_text(order.customer_email),
                order.status.value,
                order.payment_status.value,
                order.subtotal,
                order.discount_total,
                order.shipping_total,
                order.total,
                order.currency,
            ]
        )
    return csv_response(output, "linen-house-ventas.csv")


@router.get("/inventory.csv")
def inventory_report(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        [
            "producto", "sku", "talla", "color", "stock", "stock_minimo",
            "stock_bajo", "agotado", "activo",
        ]
    )
    for variant, product_name in InventoryRepository.get_inventory(db):
        writer.writerow(
            [
                safe_csv_text(product_name),
                safe_csv_text(variant.sku),
                safe_csv_text(variant.size),
                safe_csv_text(variant.color),
                variant.stock,
                variant.minimum_stock,
                variant.stock <= variant.minimum_stock,
                variant.stock == 0,
                variant.active,
            ]
        )
    return csv_response(output, "linen-house-inventario.csv")
