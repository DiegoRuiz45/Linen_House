from pydantic import BaseModel, Field

from app.modules.users.schemas import UserResponse


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=100, max_length=8192)


class GoogleLoginResponse(BaseModel):
    user: UserResponse
