from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    title: str
    message: str
    reference_type: str | None
    reference_id: int | None
    read_at: datetime | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
