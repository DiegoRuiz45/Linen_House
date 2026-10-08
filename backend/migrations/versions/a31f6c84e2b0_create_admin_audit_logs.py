"""create admin audit logs

Revision ID: a31f6c84e2b0
Revises: f84c2a67d191
Create Date: 2026-10-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a31f6c84e2b0"
down_revision: Union[str, Sequence[str], None] = "f84c2a67d191"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("request_id", sa.String(32), nullable=False),
        sa.Column("method", sa.String(10), nullable=False),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_audit_logs_user_id"), "admin_audit_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_admin_audit_logs_request_id"), "admin_audit_logs", ["request_id"], unique=True)
    op.create_index(op.f("ix_admin_audit_logs_created_at"), "admin_audit_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_table("admin_audit_logs")
