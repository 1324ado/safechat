import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin
from app.core.database import get_db
from app.models.style import Style
from app.models.user import User
from app.styles.schemas import StyleCreateRequest, StyleResponse, StyleUpdateRequest

router = APIRouter(prefix="/api/styles", tags=["styles"])


@router.get("", response_model=list[StyleResponse])
async def list_styles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Style).order_by(Style.is_builtin.desc(), Style.name))
    return result.scalars().all()


@router.post("", response_model=StyleResponse, status_code=201)
async def create_style(
    req: StyleCreateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    style = Style(**req.model_dump(), created_by=admin.id)
    db.add(style)
    await db.commit()
    await db.refresh(style)
    return style


@router.put("/{style_id}", response_model=StyleResponse)
async def update_style(
    style_id: uuid.UUID,
    req: StyleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Style).where(Style.id == style_id))
    style = result.scalar_one_or_none()
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(style, field, value)
    await db.commit()
    await db.refresh(style)
    return style


@router.delete("/{style_id}", status_code=204)
async def delete_style(
    style_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Style).where(Style.id == style_id))
    style = result.scalar_one_or_none()
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    if style.is_builtin:
        raise HTTPException(status_code=400, detail="Cannot delete builtin style")
    await db.delete(style)
    await db.commit()
