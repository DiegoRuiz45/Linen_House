from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminAuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    request_id: str
    method: str
    path: str
    status_code: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
