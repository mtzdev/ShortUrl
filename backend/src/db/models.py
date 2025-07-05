from sqlalchemy.orm import Mapped, mapped_column, registry
from sqlalchemy import func, ForeignKey
from datetime import datetime
from typing import Optional

table_registry = registry()

@table_registry.mapped_as_dataclass
class User:
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    email: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(init=False, server_default=func.now())

@table_registry.mapped_as_dataclass
class Link:
    __tablename__ = 'links'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('users.id'), nullable=True)
    original_url: Mapped[str] = mapped_column(nullable=False)
    short_url: Mapped[str] = mapped_column(unique=True)
    password: Mapped[Optional[str]] = mapped_column(nullable=True, default=None)
    clicks: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(init=False, server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, default=None)

@table_registry.mapped_as_dataclass
class RefreshToken:
    __tablename__ = 'refresh_tokens'

    id: Mapped[int] = mapped_column(init=False, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    session_id: Mapped[str] = mapped_column(unique=True)
    refresh_token: Mapped[str] = mapped_column(unique=True)
    user_agent: Mapped[str]
    ip_address: Mapped[str]
    expires_at: Mapped[datetime]
    remember: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(init=False, server_default=func.now())
    last_used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, default=None)