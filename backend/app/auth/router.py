import base64
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_admin
from app.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.auth.service import authenticate_user, create_token_pair, create_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await create_user(db, req.username.strip(), req.password.strip())
    return user


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, req.username.strip(), req.password.strip())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return create_token_pair(user)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    from sqlalchemy import select
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "username": u.username,
            "role": u.role,
            "avatar": u.avatar,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="只允许上传图片文件")

    # Read and validate size (max 2MB)
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片大小不能超过2MB")

    # Save file
    ext = file.filename.split(".")[-1] if file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = AVATAR_DIR / filename
    filepath.write_bytes(content)

    # Update user avatar
    user.avatar = f"/uploads/avatars/{filename}"
    await db.commit()
    await db.refresh(user)
    return user
