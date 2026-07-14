from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.core.database import get_db
from app.models.conversation import Conversation, Message, StyleSwitch
from app.models.safety import AuditLog
from app.models.style import Style
from app.models.user import User

router = APIRouter(prefix="/api/admin/stats", tags=["stats"])


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    total_conversations = await db.scalar(select(func.count(Conversation.id)))
    total_messages = await db.scalar(select(func.count(Message.id)))
    total_blocks = await db.scalar(select(func.count(AuditLog.id)))
    # 拦截率 = 拦截数 / (消息数 + 拦截数) * 100，因为被拦截的消息没有存入messages表
    total_attempts = (total_messages or 0) + (total_blocks or 0)
    block_rate = (total_blocks / total_attempts * 100) if total_attempts > 0 else 0
    return {
        "total_conversations": total_conversations or 0,
        "total_messages": total_messages or 0,
        "total_blocks": total_blocks or 0,
        "block_rate": round(block_rate, 2),
    }


@router.get("/by-style")
async def by_style(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(
        select(Message.style_id, func.count(Message.id))
        .where(Message.role == "assistant")
        .group_by(Message.style_id)
    )
    return [{"style_id": str(row[0]), "count": row[1]} for row in result.all()]


@router.get("/by-category")
async def by_category(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(
        select(AuditLog.category, func.count(AuditLog.id)).group_by(AuditLog.category)
    )
    return [{"category": row[0] or "未知", "count": row[1]} for row in result.all()]


@router.get("/recent")
async def recent_activity(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    # 最近的对话
    recent_convs = await db.execute(
        select(Conversation, User.username)
        .outerjoin(User, Conversation.user_id == User.id)
        .where(Conversation.is_deleted == False)
        .order_by(Conversation.created_at.desc())
        .limit(5)
    )
    conversations = []
    for row in recent_convs.all():
        conv = row[0]
        conversations.append({
            "type": "conversation",
            "id": str(conv.id),
            "title": conv.title,
            "username": row[1] or "未知用户",
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
        })

    # 最近的拦截
    recent_blocks = await db.execute(
        select(AuditLog, User.username)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(5)
    )
    blocks = []
    for row in recent_blocks.all():
        log = row[0]
        blocks.append({
            "type": "block",
            "id": str(log.id),
            "layer": log.layer,
            "category": log.category,
            "original_text": log.original_text[:50],
            "username": row[1] or "未知用户",
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    # 合并并按时间排序
    all_activities = conversations + blocks
    all_activities.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return all_activities[:10]


@router.get("/style-switches")
async def list_style_switches(
    page: int = Query(1, ge=1),
    size: int = Query(14, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    # Count total
    total = await db.scalar(select(func.count(StyleSwitch.id))) or 0

    # Get paginated data with joins
    query = (
        select(
            StyleSwitch,
            User.username,
            Style.name.label("from_style_name"),
            Style.name.label("to_style_name"),
        )
        .outerjoin(User, StyleSwitch.user_id == User.id)
        .outerjoin(Style, StyleSwitch.to_style_id == Style.id)
        .order_by(StyleSwitch.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)

    # Get from_style names separately
    switches = []
    for row in result.all():
        ss = row[0]
        # Get from_style name
        from_name = None
        if ss.from_style_id:
            from_style = await db.get(Style, ss.from_style_id)
            from_name = from_style.name if from_style else None

        to_style = await db.get(Style, ss.to_style_id)
        switches.append({
            "id": str(ss.id),
            "username": row[1] or "未知用户",
            "from_style": from_name or "无",
            "to_style": to_style.name if to_style else "未知",
            "created_at": ss.created_at.isoformat() if ss.created_at else None,
        })

    return {"total": total, "page": page, "size": size, "switches": switches}
