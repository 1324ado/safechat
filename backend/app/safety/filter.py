import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.safety import AuditLog, Keyword
from app.safety.keyword_filter import KeywordFilter
from app.safety.model_filter import check_with_model

_keyword_filter: KeywordFilter | None = None


async def reload_keywords(db: AsyncSession):
    global _keyword_filter
    result = await db.execute(select(Keyword))
    keywords = result.scalars().all()
    _keyword_filter = KeywordFilter()
    _keyword_filter.build(keywords)


async def _get_filter(db: AsyncSession) -> KeywordFilter:
    global _keyword_filter
    if _keyword_filter is None:
        await reload_keywords(db)
    return _keyword_filter


class FilterResult:
    def __init__(self, blocked: bool, layer: str | None = None, category: str | None = None, reason: str | None = None):
        self.blocked = blocked
        self.layer = layer
        self.category = category
        self.reason = reason

    def to_dict(self):
        return {"blocked": self.blocked, "layer": self.layer, "category": self.category, "reason": self.reason}


async def filter_text(
    text: str,
    user_id: uuid.UUID | None,
    direction: str,
    db: AsyncSession,
    session_id: uuid.UUID | None = None,
) -> FilterResult:
    # Layer 1: keyword filter
    kf = await _get_filter(db)
    blocked, category, matched = kf.check(text)
    if blocked:
        log = AuditLog(
            user_id=user_id,
            session_id=session_id,
            direction=direction,
            layer="keyword",
            original_text=text[:1000],
            category=category,
            reason=f"命中关键词: {matched}",
            review_status="rejected",
        )
        db.add(log)
        await db.commit()
        return FilterResult(True, "keyword", category, f"命中关键词: {matched}")

    # Layer 2: model filter
    blocked, category, reason = await check_with_model(text)
    if blocked:
        log = AuditLog(
            user_id=user_id,
            session_id=session_id,
            direction=direction,
            layer="model",
            original_text=text[:1000],
            category=category,
            reason=reason,
            review_status="rejected",
        )
        db.add(log)
        await db.commit()
        return FilterResult(True, "model", category, reason)

    return FilterResult(False)
