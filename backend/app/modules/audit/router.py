from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.audit.model import AdminAuditLog
from app.modules.audit.schemas import AdminAuditLogResponse
from app.modules.auth.dependencies import require_admin, require_trusted_origin
from app.modules.users.model import User


router = APIRouter(
    prefix="/admin/audit-logs",
    tags=["Admin - Audit"],
    dependencies=[Depends(require_trusted_origin)],
)


@router.get("", response_model=list[AdminAuditLogResponse])
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return list(
        db.scalars(
            select(AdminAuditLog)
            .order_by(AdminAuditLog.created_at.desc())
            .limit(limit)
        ).all()
    )
