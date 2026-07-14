import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import TokenResponse
from app.core.config import settings
from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: uuid.UUID, role: str, expires_delta: timedelta) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_token_pair(user: User) -> TokenResponse:
    access = create_token(user.id, user.role, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh = create_token(user.id, user.role, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    return TokenResponse(access_token=access, refresh_token=refresh)


async def create_user(db: AsyncSession, username: str, password: str) -> User:
    user = User(username=username, password_hash=hash_password(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.password_hash):
        return user
    return None


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
