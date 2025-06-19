from pydantic import BaseModel, Field, HttpUrl, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from src.utils import validate_username, validate_email, validate_password

class LinkCreateSchema(BaseModel):
    original_url: HttpUrl
    short_url: Optional[str] = Field(default=None)
    user_id: Optional[int] = Field(default=None)
    password: Optional[str] = Field(default=None)

class LinkCreateResponseSchema(BaseModel):
    id: int
    original_url: HttpUrl
    short_url: str
    created_at: datetime

class LinkPublicSchema(BaseModel):
    original_url: HttpUrl
    clicks: int
    created_at: datetime

class LinkStatsSchema(BaseModel):
    original_url: HttpUrl
    short_url: str
    clicks: int
    created_at: datetime
    has_password: bool = Field(default=False)

class LoginRequestSchema(BaseModel):
    email: EmailStr
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, value):
        if not validate_email(value):
            raise ValueError('O e-mail inserido não é válido. Verifique se o e-mail está correto e tente novamente.')
        return value

class RegisterRequestSchema(BaseModel):
    username: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, value):
        if not validate_username(value):
            raise ValueError('O nome de usuário deve conter apenas letras, números, ou underlines e ter entre 3 e 16 caracteres.')
        return value

    @field_validator('email')
    @classmethod
    def validate_email(cls, value):
        if not validate_email(value):
            raise ValueError('O e-mail inserido não é válido. Verifique se o e-mail está correto e tente novamente.')
        return value

    @field_validator('password')
    @classmethod
    def validate_password(cls, value):
        if not validate_password(value):
            raise ValueError('A senha deve conter no mínimo 8 caracteres, incluindo pelo menos uma letra e um número.')
        return value

class LoginResponseSchema(BaseModel):
    access_token: str
    token_type: str

class UserLinksResponseSchema(BaseModel):
    links: list[LinkStatsSchema]

class LinkUpdateSchema(BaseModel):
    short_url: str

class LinkPasswordUpdateSchema(BaseModel):
    password: str

class UsernameUpdateSchema(BaseModel):
    username: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, value):
        if not validate_username(value):
            raise ValueError('O nome de usuário deve conter apenas letras, números, ou underlines e ter entre 3 e 16 caracteres.')
        return value

class EmailUpdateSchema(BaseModel):
    email: EmailStr

    @field_validator('email')
    @classmethod
    def validate_email(cls, value):
        if not validate_email(value):
            raise ValueError('O e-mail inserido não é válido. Verifique se o e-mail está correto e tente novamente.')
        return value

class PasswordUpdateSchema(BaseModel):
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, value):
        if not validate_password(value):
            raise ValueError('A senha deve conter no mínimo 8 caracteres, incluindo pelo menos uma letra e um número.')
        return value