"""create orders and coupons

Revision ID: de7b91f4a320
Revises: c97de83c1510
Create Date: 2026-10-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "de7b91f4a320"
down_revision: Union[str, Sequence[str], None] = "c97de83c1510"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


order_status = sa.Enum(
    "pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled", "refunded",
    name="order_status", native_enum=False, create_constraint=True,
)
payment_status = sa.Enum(
    "pending", "paid", "failed", "refunded",
    name="payment_status", native_enum=False, create_constraint=True,
)


def upgrade() -> None:
    op.create_table(
        "coupons",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column(
            "discount_type",
            sa.Enum("percent", "fixed", name="coupon_discount_type", native_enum=False, create_constraint=True),
            nullable=False,
        ),
        sa.Column("value", sa.Numeric(12, 2), nullable=False),
        sa.Column("minimum_subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("maximum_discount", sa.Numeric(12, 2), nullable=True),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("usage_limit", sa.Integer(), nullable=True),
        sa.Column("per_user_limit", sa.Integer(), nullable=False),
        sa.Column("used_count", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_coupons_code"), "coupons", ["code"], unique=True)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("number", sa.String(30), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("coupon_id", sa.Integer(), nullable=True),
        sa.Column("coupon_code", sa.String(50), nullable=True),
        sa.Column("status", order_status, nullable=False),
        sa.Column("payment_status", payment_status, nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("shipping_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("customer_first_name", sa.String(100), nullable=False),
        sa.Column("customer_last_name", sa.String(100), nullable=False),
        sa.Column("customer_email", sa.String(255), nullable=False),
        sa.Column("customer_phone", sa.String(30), nullable=False),
        sa.Column("department", sa.String(100), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("address_extra", sa.String(255), nullable=True),
        sa.Column("postal_code", sa.String(20), nullable=True),
        sa.Column("customer_notes", sa.Text(), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("shipping_carrier", sa.String(100), nullable=True),
        sa.Column("tracking_number", sa.String(150), nullable=True),
        sa.Column("reservation_expires_at", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("shipped_at", sa.DateTime(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_order_user_idempotency"),
    )
    op.create_index(op.f("ix_orders_number"), "orders", ["number"], unique=True)
    op.create_index(op.f("ix_orders_user_id"), "orders", ["user_id"], unique=False)
    op.create_index(op.f("ix_orders_coupon_id"), "orders", ["coupon_id"], unique=False)
    op.create_index(op.f("ix_orders_status"), "orders", ["status"], unique=False)
    op.create_index(op.f("ix_orders_payment_status"), "orders", ["payment_status"], unique=False)
    op.create_index(op.f("ix_orders_created_at"), "orders", ["created_at"], unique=False)
    op.create_index(op.f("ix_orders_reservation_expires_at"), "orders", ["reservation_expires_at"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("variant_id", sa.Integer(), nullable=False),
        sa.Column("product_name", sa.String(150), nullable=False),
        sa.Column("product_slug", sa.String(180), nullable=False),
        sa.Column("sku", sa.String(100), nullable=False),
        sa.Column("size", sa.String(50), nullable=False),
        sa.Column("color", sa.String(80), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_order_items_order_id"), "order_items", ["order_id"], unique=False)
    op.create_index(op.f("ix_order_items_product_id"), "order_items", ["product_id"], unique=False)
    op.create_index(op.f("ix_order_items_variant_id"), "order_items", ["variant_id"], unique=False)

    op.create_table(
        "order_status_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column(
            "from_status",
            sa.Enum(
                "pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled", "refunded",
                name="order_history_from_status", native_enum=False, create_constraint=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "to_status",
            sa.Enum(
                "pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled", "refunded",
                name="order_history_to_status", native_enum=False, create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("changed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["changed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_order_status_history_order_id"), "order_status_history", ["order_id"], unique=False)
    op.create_index(op.f("ix_order_status_history_changed_by_user_id"), "order_status_history", ["changed_by_user_id"], unique=False)

    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("external_id", sa.String(150), nullable=True),
        sa.Column("event_id", sa.String(150), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "paid", "failed", "refunded", name="payment_transaction_status", native_enum=False, create_constraint=True),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "event_id", name="uq_payment_provider_event"),
    )
    op.create_index(op.f("ix_payment_transactions_order_id"), "payment_transactions", ["order_id"], unique=False)
    op.create_index(op.f("ix_payment_transactions_external_id"), "payment_transactions", ["external_id"], unique=False)

    op.create_table(
        "coupon_usages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("coupon_id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("coupon_id", "order_id", name="uq_coupon_usage_order"),
    )
    op.create_index(op.f("ix_coupon_usages_coupon_id"), "coupon_usages", ["coupon_id"], unique=False)
    op.create_index(op.f("ix_coupon_usages_order_id"), "coupon_usages", ["order_id"], unique=False)
    op.create_index(op.f("ix_coupon_usages_user_id"), "coupon_usages", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("coupon_usages")
    op.drop_table("payment_transactions")
    op.drop_table("order_status_history")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("coupons")
