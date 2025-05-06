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