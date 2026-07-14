import uuid
from datetime import datetime

from pydantic import BaseModel


class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    style_id: uuid.UUID | None
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str
    style_identifier: str | None = None


class SwitchStyleRequest(BaseModel):
    style_identifier: str
    from_style_identifier: str | None = None
