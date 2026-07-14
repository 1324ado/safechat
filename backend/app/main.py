from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.auth.router import router as auth_router
from app.auth.service import hash_password
from app.chat.router import router as chat_router
from app.core.database import async_session
from app.logs.router import router as stats_router
from app.models.style import Style
from app.models.user import User
from app.safety.router import router as safety_router
from app.styles.router import router as styles_router
from app.styles.seed import BUILTIN_STYLES


async def seed_styles():
    async with async_session() as db:
        existing = await db.scalar(select(Style).limit(1))
        if not existing:
            for data in BUILTIN_STYLES:
                db.add(Style(**data))
            await db.commit()


async def seed_admin():
    async with async_session() as db:
        existing = await db.scalar(select(User).where(User.username == "admin"))
        if not existing:
            admin = User(
                username="admin",
                password_hash=hash_password("123456"),
                role="admin",
            )
            db.add(admin)
            await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_styles()
    await seed_admin()
    yield


app = FastAPI(title="Style Safety Assistant", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(styles_router)
app.include_router(safety_router)
app.include_router(chat_router)
app.include_router(stats_router)

# Serve uploaded files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
