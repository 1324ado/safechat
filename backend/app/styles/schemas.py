import uuid

from pydantic import BaseModel, Field


class StyleResponse(BaseModel):
    id: uuid.UUID
    name: str
    identifier: str
    system_prompt: str
    few_shot: list | None
    temperature: float
    top_p: float
    max_tokens: int
    is_builtin: bool

    class Config:
        from_attributes = True


class StyleCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    identifier: str = Field(min_length=1, max_length=50)
    system_prompt: str
    few_shot: list | None = None
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 2048


class StyleUpdateRequest(BaseModel):
    name: str | None = None
    system_prompt: str | None = None
    few_shot: list | None = None
    temperature: float | None = None
    top_p: float | None = None
    max_tokens: int | None = None
