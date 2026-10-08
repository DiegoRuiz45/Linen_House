from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.admin.schemas import DashboardResponse, SalesPoint
from app.modules.admin.service import AdminService
from app.modules.auth.dependencies import require_admin, require_trusted_origin
from app.modules.users.model import User


router = APIRouter(
    prefix="/admin/dashboard",
    tags=["Admin - Dashboard"],
    dependencies=[Depends(require_trusted_origin)],
)


@router.get("", response_model=DashboardResponse)
def dashboard(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.dashboard(db)


@router.get("/sales", response_model=list[SalesPoint])
def sales(
    days: int = Query(default=30, ge=7, le=90),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService.sales(db, days)
