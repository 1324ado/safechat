import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.core.database import get_db
from app.models.safety import AuditLog, Keyword
from app.models.user import User
from app.safety.filter import reload_keywords

router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Keyword schemas ---

class KeywordCreateRequest(BaseModel):
    word: str = Field(min_length=1, max_length=100)
    category: str | None = None


class KeywordResponse(BaseModel):
    id: uuid.UUID
    word: str
    category: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Audit log schemas ---

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    username: str | None = None
    session_id: uuid.UUID | None
    direction: str
    layer: str
    original_text: str
    category: str | None
    reason: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Keyword endpoints ---

@router.get("/keywords")
async def list_keywords(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    # Count total
    count_query = select(func.count(Keyword.id))
    if category:
        count_query = count_query.where(Keyword.category == category)
    total = await db.scalar(count_query) or 0

    # Get paginated data
    query = select(Keyword).order_by(Keyword.created_at.desc())
    if category:
        query = query.where(Keyword.category == category)
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    keywords = result.scalars().all()

    return {"total": total, "page": page, "size": size, "keywords": keywords}


@router.get("/keywords/categories")
async def list_keyword_categories(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    result = await db.execute(
        select(Keyword.category, func.count(Keyword.id))
        .group_by(Keyword.category)
    )
    return [{"category": row[0] or "未分类", "count": row[1]} for row in result.all()]


@router.post("/keywords", response_model=KeywordResponse, status_code=201)
async def create_keyword(
    req: KeywordCreateRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    kw = Keyword(word=req.word, category=req.category)
    db.add(kw)
    await db.commit()
    await db.refresh(kw)
    await reload_keywords(db)
    return kw


@router.delete("/keywords/{keyword_id}", status_code=204)
async def delete_keyword(
    keyword_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    result = await db.execute(select(Keyword).where(Keyword.id == keyword_id))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword not found")
    await db.delete(kw)
    await db.commit()
    await reload_keywords(db)


# --- Audit log endpoints ---

@router.get("/audit-logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    layer: str | None = None,
    category: str | None = None,
    review_status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    # Build base query for counting
    count_query = select(func.count(AuditLog.id))
    if layer:
        count_query = count_query.where(AuditLog.layer == layer)
    if category:
        count_query = count_query.where(AuditLog.category == category)
    if review_status:
        count_query = count_query.where(AuditLog.review_status == review_status)
    total = await db.scalar(count_query) or 0

    # Build data query
    query = (
        select(AuditLog, User.username)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
    )
    if layer:
        query = query.where(AuditLog.layer == layer)
    if category:
        query = query.where(AuditLog.category == category)
    if review_status:
        query = query.where(AuditLog.review_status == review_status)
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)

    logs = []
    for row in result.all():
        log = row[0]
        logs.append({
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "username": row[1] or "未知用户",
            "session_id": str(log.session_id) if log.session_id else None,
            "direction": log.direction,
            "layer": log.layer,
            "original_text": log.original_text,
            "category": log.category,
            "reason": log.reason,
            "review_status": log.review_status or "pending",
            "reviewed_at": log.reviewed_at.isoformat() if log.reviewed_at else None,
            "reviewer_note": log.reviewer_note,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    return {"total": total, "page": page, "size": size, "logs": logs}


class ReviewRequest(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    note: str | None = None


@router.put("/audit-logs/{log_id}/review")
async def review_audit_log(
    log_id: uuid.UUID,
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    log.review_status = req.status
    log.reviewed_at = datetime.utcnow()
    log.reviewer_note = req.note
    await db.commit()
    return {"message": "Review saved", "status": req.status}
