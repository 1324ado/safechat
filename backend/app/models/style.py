import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Style(Base):
    __tablename__ = "styles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    identifier: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    few_shot: Mapped[dict | None] = mapped_column(JSONB)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    top_p: Mapped[float] = mapped_column(Float, default=0.9)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
