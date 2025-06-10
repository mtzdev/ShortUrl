from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime

class LinkCreateSchema(BaseModel):
    original_url: HttpUrl
    short_url: Optional[str] = Field(default=None)
    user_id: Optional[int] = Field(default=None)
    password: Optional[str] = Field(default=None)

class LinkCreateResponseSchema(BaseModel):
    id: int
    original_url: str
    short_url: str
    created_at: datetime

class LinkPublicSchema(BaseModel):
    original_url: str
    clicks: int
    created_at: datetime

class LinkStatsSchema(BaseModel):
    original_url: str
    short_url: str
    clicks: int
    created_at: datetime

class LoginRequestSchema(BaseModel):
    email: str
    password: str

class RegisterRequestSchema(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str

class LoginResponseSchema(BaseModel):
    access_token: str
    token_type: str