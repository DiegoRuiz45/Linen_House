from decimal import Decimal

from pydantic import BaseModel


class DashboardResponse(BaseModel):
    revenue_today: Decimal
    revenue_month: Decimal
    orders_today: int
    pending_orders: int
    low_stock_variants: int
    out_of_stock_variants: int
    customers: int
    active_products: int


class SalesPoint(BaseModel):
    date: str
    revenue: Decimal
    orders: int
