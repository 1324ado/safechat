# 大模型对话风格定制与内容安全过滤助手 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 MiMo API 的多风格对话助手，具备两层安全过滤、用户系统、管理后台和对照测试能力。

**Architecture:** 前后端分离架构。FastAPI 后端提供 REST API + SSE 流式对话，React 前端使用 shadcn/ui 组件库。PostgreSQL 存储所有数据。安全过滤采用关键词 + 云端模型两层串行。

**Tech Stack:** React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS (前端), FastAPI + SQLAlchemy + Alembic (后端), PostgreSQL (数据库), MiMo-v2.5-pro-ultraspeed (大模型)

## Global Constraints

- 后端 Python >= 3.11, 前端 Node >= 18
- MiMo API base_url: `https://api.xiaomimimo.com/v1`, model: `mimo-v2.5-pro-ultraspeed`
- API Key 从环境变量 `MIMO_API_KEY` 读取
- 所有 API 路径以 `/api/` 开头
- JWT access_token 有效期 30 分钟, refresh_token 有效期 7 天
- 前端代理后端端口 8000
- 管理员角色才能访问 `/admin/*` 路由
- 风格切换记录和审核日志必须持久化

---

## Task 1: 项目脚手架 — 后端

**Covers:** [S2, SS3]

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/database.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`

**Interfaces:**
- Produces: `get_db()` async generator, `Settings` config class

- [ ] **Step 1: 初始化 Python 项目**

```bash
cd D:\X\新建文件夹
mkdir -p backend\app\core backend\app\auth backend\app\users backend\app\styles backend\app\safety backend\app\chat backend\app\logs backend\app\models backend\tests
```

- [ ] **Step 2: 创建 pyproject.toml**

```toml
[project]
name = "style-safety-assistant"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.29.0",
    "sqlalchemy[asyncio]>=2.0.29",
    "asyncpg>=0.29.0",
    "alembic>=1.13.1",
    "pydantic>=2.7.0",
    "pydantic-settings>=2.2.0",
    "pyjwt>=2.8.0",
    "bcrypt>=4.1.2",
    "httpx>=0.27.0",
    "python-multipart>=0.0.9",
    "ahocorasick-rs>=0.2.0",
    "sse-starlette>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "httpx>=0.27.0",
]
```

- [ ] **Step 3: 创建配置模块**

`backend/app/core/config.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/style_safety"
    MIMO_API_KEY: str = ""
    MIMO_BASE_URL: str = "https://api.xiaomimimo.com/v1"
    MIMO_MODEL: str = "mimo-v2.5-pro-ultraspeed"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: 创建数据库模块**

`backend/app/core/database.py`:
```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
```

- [ ] **Step 5: 创建 FastAPI 入口**

`backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Style Safety Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: 验证后端启动**

```bash
cd D:\X\新建文件夹\backend
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Expected: 访问 `http://localhost:8000/api/health` 返回 `{"status":"ok"}`

- [ ] **Step 7: 初始化 git 并提交**

```bash
cd D:\X\新建文件夹
git init
echo "__pycache__/\n*.pyc\n.env\nnode_modules/\ndist/\n" > .gitignore
git add backend/
git commit -m "feat: initialize backend project scaffold"
```

---

## Task 2: 项目脚手架 — 前端

**Covers:** [S2, S9]

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.cjs`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles/globals.css`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components.json`

**Interfaces:**
- Produces: 前端项目骨架，可启动 dev server

- [ ] **Step 1: 初始化前端项目**

```bash
cd D:\X\新建文件夹
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: 安装依赖**

```bash
cd D:\X\新建文件夹\frontend
npm install react-router-dom zustand axios sonner lucide-react recharts date-fns clsx tailwind-merge class-variance-authority
npm install -D tailwindcss @tailwindcss/typography autoprefixer postcss
npx tailwindcss init -p
```

- [ ] **Step 3: 配置 shadcn/ui**

参考 ragent 项目的组件结构，手动创建核心 UI 组件（Button, Card, Table, Badge, Dialog, Input, Select, Tabs, Label, Separator, Checkbox, Avatar, Tooltip, AlertDialog, DropdownMenu, Progress）。

- [ ] **Step 4: 创建设计系统 CSS**

`frontend/src/styles/globals.css` — 复用 ragent 的 HSL 变量系统和 admin-layout 样式。

- [ ] **Step 5: 配置 Vite 代理**

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 6: 验证前端启动**

```bash
cd D:\X\新建文件夹\frontend
npm run dev
```

Expected: 浏览器打开 `http://localhost:5173` 显示页面

- [ ] **Step 7: 提交**

```bash
cd D:\X\新建文件夹
git add frontend/
git commit -m "feat: initialize frontend project with shadcn/ui design system"
```

---

## Task 3: 数据库模型与迁移

**Covers:** [S4, S5, S6, S7]

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/style.py`
- Create: `backend/app/models/conversation.py`
- Create: `backend/app/models/safety.py`
- Create: `backend/alembic/versions/001_initial.py`

**Interfaces:**
- Consumes: `Base` from `app.core.database`
- Produces: 所有 ORM 模型类，供后续 task 使用

- [ ] **Step 1: 创建用户模型**

`backend/app/models/user.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user")
    avatar: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: 创建风格模型**

`backend/app/models/style.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, ForeignKey, func
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
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: 创建对话和消息模型**

`backend/app/models/conversation.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), default="新对话")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    style_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("styles.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StyleSwitch(Base):
    __tablename__ = "style_switches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    from_style_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("styles.id"))
    to_style_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("styles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 4: 创建安全过滤模型**

`backend/app/models/safety.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    word: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    layer: Mapped[str] = mapped_column(String(20), nullable=False)
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 5: 创建 models/__init__.py**

`backend/app/models/__init__.py`:
```python
from app.models.user import User
from app.models.style import Style
from app.models.conversation import Conversation, Message, StyleSwitch
from app.models.safety import Keyword, AuditLog

__all__ = ["User", "Style", "Conversation", "Message", "StyleSwitch", "Keyword", "AuditLog"]
```

- [ ] **Step 6: 初始化 Alembic 并生成迁移**

```bash
cd D:\X\新建文件夹\backend
alembic init alembic
# 编辑 alembic/env.py 导入 Base 和所有 models
alembic revision --autogenerate -m "initial tables"
alembic upgrade head
```

Expected: PostgreSQL 中创建所有表

- [ ] **Step 7: 提交**

```bash
cd D:\X\新建文件夹
git add backend/app/models/ backend/alembic/
git commit -m "feat: add database models and initial migration"
```

---

## Task 4: 用户认证模块

**Covers:** [S4]

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/schemas.py`
- Create: `backend/app/auth/service.py`
- Create: `backend/app/auth/router.py`
- Create: `backend/app/auth/dependencies.py`
- Create: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `User` model, `get_db()`, `Settings`
- Produces: `create_user()`, `authenticate_user()`, `create_token_pair()`, `get_current_user()` dependency

- [ ] **Step 1: 创建认证 schemas**

`backend/app/auth/schemas.py`:
```python
import uuid
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    role: str
    avatar: str | None

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 创建认证服务**

`backend/app/auth/service.py`:
```python
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
```

- [ ] **Step 3: 创建认证依赖**

`backend/app/auth/dependencies.py`:
```python
import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.auth.service import get_user_by_id

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user
```

- [ ] **Step 4: 创建认证路由**

`backend/app/auth/router.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.auth.service import authenticate_user, create_token_pair, create_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await create_user(db, req.username, req.password)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, req.username, req.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return create_token_pair(user)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user
```

- [ ] **Step 5: 注册路由到 main.py**

在 `backend/app/main.py` 中添加:
```python
from app.auth.router import router as auth_router
app.include_router(auth_router)
```

- [ ] **Step 6: 测试认证 API**

```bash
# 注册
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected: 返回 access_token 和 refresh_token

- [ ] **Step 7: 提交**

```bash
cd D:\X\新建文件夹
git add backend/app/auth/
git commit -m "feat: add user authentication with JWT"
```

---

## Task 5: 风格管理模块

**Covers:** [S5]

**Files:**
- Create: `backend/app/styles/__init__.py`
- Create: `backend/app/styles/schemas.py`
- Create: `backend/app/styles/router.py`
- Create: `backend/app/styles/seed.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `Style` model, `get_db()`, `require_admin`
- Produces: 风格 CRUD API, 内置风格种子数据

- [ ] **Step 1: 创建风格 schemas**

`backend/app/styles/schemas.py`:
```python
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
```

- [ ] **Step 2: 创建风格种子数据**

`backend/app/styles/seed.py`:
```python
BUILTIN_STYLES = [
    {
        "name": "教师辅导风格",
        "identifier": "teacher",
        "system_prompt": "你是一位经验丰富的教师。你的回答风格特点：\n1. 循序渐进，从简单到复杂\n2. 多用类比和生活中的例子\n3. 鼓励学生思考，适时提问\n4. 对错误表示理解，耐心纠正\n5. 总结要点，帮助记忆",
        "few_shot": [
            {"user": "什么是变量？", "assistant": "想象你有一个盒子，你可以在里面放任何东西。在编程中，变量就像这个盒子——它有一个名字（变量名），里面可以存放数据（值）。比如 x = 5，就是把数字5放进名叫x的盒子里。"},
        ],
        "temperature": 0.3,
        "top_p": 0.9,
        "max_tokens": 2048,
        "is_builtin": True,
    },
    {
        "name": "代码助手风格",
        "identifier": "coder",
        "system_prompt": "你是一位专业的编程助手。你的回答风格特点：\n1. 直接给出代码解决方案\n2. 代码注释清晰\n3. 先给出最佳实践，再解释原理\n4. 注意边界情况和错误处理\n5. 保持简洁，避免冗余解释",
        "few_shot": [
            {"user": "怎么反转字符串？", "assistant": "Python: `s[::-1]`\n\n如果需要函数：\n```python\ndef reverse_string(s: str) -> str:\n    return s[::-1]\n```"},
        ],
        "temperature": 0.2,
        "top_p": 0.85,
        "max_tokens": 2048,
        "is_builtin": True,
    },
    {
        "name": "科普讲解风格",
        "identifier": "science",
        "system_prompt": "你是一位科普作家。你的回答风格特点：\n1. 用生动的比喻和类比\n2. 避免专业术语，用通俗语言\n3. 引用有趣的事实或故事\n4. 让读者产生好奇心\n5. 适当使用emoji增加趣味性",
        "few_shot": [
            {"user": "黑洞是什么？", "assistant": "想象宇宙中有一个超级强大的吸尘器，它的吸力大到连光都逃不掉——这就是黑洞！当一颗巨大的恒星死亡时，它会坍缩成一个密度无限大的点，周围的时空被严重扭曲，形成了一个'只进不出'的区域。"},
        ],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 2048,
        "is_builtin": True,
    },
    {
        "name": "翻译助手风格",
        "identifier": "translator",
        "system_prompt": "你是一位专业翻译。你的翻译原则：\n1. 信——忠实原文含义\n2. 达——表达自然流畅\n3. 雅——保留原文风格\n4. 根据上下文选择最合适的译法\n5. 对文化差异做适当注释",
        "few_shot": [
            {"user": "翻译: The early bird catches the worm", "assistant": "早起的鸟儿有虫吃。\n\n（注：这是一句英语谚语，相当于中文的'早起三光，晚起三慌'，鼓励人们勤奋早起。）"},
        ],
        "temperature": 0.3,
        "top_p": 0.9,
        "max_tokens": 2048,
        "is_builtin": True,
    },
    {
        "name": "写作助手风格",
        "identifier": "writer",
        "system_prompt": "你是一位写作助手。你的回答风格特点：\n1. 文采丰富，用词精准\n2. 结构清晰，逻辑严密\n3. 根据文体调整语气\n4. 提供多种表达方案\n5. 注重段落间的衔接",
        "few_shot": [
            {"user": "帮我写一段春天的描写", "assistant": "三月的风裹挟着泥土的芬芳，轻轻拂过沉睡的枝头。桃花最先醒来，粉白的花瓣在晨光中微微颤动，仿佛少女羞涩的笑靥。溪水挣脱了冰的束缚，欢快地跳跃在青石之间，唱着只有燕子才能听懂的歌。"},
        ],
        "temperature": 0.8,
        "top_p": 0.95,
        "max_tokens": 2048,
        "is_builtin": True,
    },
]
```

- [ ] **Step 3: 创建风格路由**

`backend/app/styles/router.py`:
```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
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
```

- [ ] **Step 4: 注册路由并添加种子数据**

修改 `backend/app/main.py`，在 startup 事件中插入种子数据。

- [ ] **Step 5: 测试风格 API**

```bash
curl http://localhost:8000/api/styles
```

Expected: 返回 5 个内置风格

- [ ] **Step 6: 提交**

```bash
cd D:\X\新建文件夹
git add backend/app/styles/
git commit -m "feat: add style management with builtin styles"
```

---

## Task 6: 安全过滤模块

**Covers:** [S6]

**Files:**
- Create: `backend/app/safety/__init__.py`
- Create: `backend/app/safety/keyword_filter.py`
- Create: `backend/app/safety/model_filter.py`
- Create: `backend/app/safety/filter.py`
- Create: `backend/app/safety/schemas.py`
- Create: `backend/app/safety/router.py`

**Interfaces:**
- Consumes: `Keyword` model, `AuditLog` model, `get_db()`, MiMo API
- Produces: `filter_text(text, user_id, direction, session_id)` → `FilterResult`

- [ ] **Step 1: 创建关键词过滤器**

`backend/app/safety/keyword_filter.py`:
```python
import ahocorasick

from app.models.safety import Keyword


class KeywordFilter:
    def __init__(self):
        self._automaton = ahocorasick.Automaton()
        self._keywords: dict[str, str] = {}  # word -> category

    def build(self, keywords: list[Keyword]):
        self._keywords = {kw.word: kw.category or "自定义" for kw in keywords}
        for idx, word in enumerate(self._keywords.keys()):
            self._automaton.add_word(word, (idx, word))
        self._automaton.make_automaton()

    def check(self, text: str) -> tuple[bool, str | None, str | None]:
        """Returns (is_blocked, category, matched_word)"""
        for _, (_, word) in self._automaton.iter(text):
            return True, self._keywords[word], word
        return False, None, None
```

- [ ] **Step 2: 创建云端审核过滤器**

`backend/app/safety/model_filter.py`:
```python
import json

import httpx

from app.core.config import settings

MODERATION_PROMPT = """你是一个内容审核员。请判断以下文本是否包含违规内容。
违规类型包括：色情、暴力、违法、歧视、仇恨言论、自残、危险行为。
如果文本是正常的技术问题、学习问题、日常交流，请判定为安全。

文本：{text}

请只返回 JSON 格式，不要有其他内容：
{{"safe": true/false, "category": "类型或null", "reason": "简短原因"}}"""


async def check_with_model(text: str) -> tuple[bool, str | None, str | None]:
    """Returns (is_blocked, category, reason)"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{settings.MIMO_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {settings.MIMO_API_KEY}"},
            json={
                "model": settings.MIMO_MODEL,
                "messages": [
                    {"role": "user", "content": MODERATION_PROMPT.format(text=text[:500])}
                ],
                "max_tokens": 200,
                "temperature": 0.1,
            },
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        try:
            result = json.loads(content.strip())
            safe = result.get("safe", True)
            if not safe:
                return True, result.get("category", "违规"), result.get("reason", "内容审核不通过")
        except (json.JSONDecodeError, KeyError):
            pass
    return False, None, None
```

- [ ] **Step 3: 创建统一过滤管道**

`backend/app/safety/filter.py`:
```python
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
        )
        db.add(log)
        await db.commit()
        return FilterResult(True, "model", category, reason)

    return FilterResult(False)
```

- [ ] **Step 4: 创建安全路由（关键词管理和审核日志）**

`backend/app/safety/router.py` — 包含关键词 CRUD 和审核日志查询 API。

- [ ] **Step 5: 测试过滤功能**

```bash
# 添加关键词
curl -X POST http://localhost:8000/api/admin/keywords \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"word":"敏感词","category":"自定义"}'
```

- [ ] **Step 6: 提交**

```bash
cd D:\X\新建文件夹
git add backend/app/safety/
git commit -m "feat: add two-layer safety filtering (keyword + model)"
```

---

## Task 7: 对话引擎

**Covers:** [S7]

**Files:**
- Create: `backend/app/chat/__init__.py`
- Create: `backend/app/chat/schemas.py`
- Create: `backend/app/chat/router.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `Conversation`, `Message`, `StyleSwitch` models, `filter_text()`, MiMo API, `get_current_user`
- Produces: SSE 流式对话 API

- [ ] **Step 1: 创建对话 schemas**

`backend/app/chat/schemas.py`:
```python
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
```

- [ ] **Step 2: 创建对话路由**

`backend/app/chat/router.py` — 实现会话管理、消息发送（SSE 流式）、风格切换。消息发送时：
1. 过安全过滤（请求方向）
2. 构建 messages（system prompt + few_shot + history + user message）
3. 调用 MiMo API（stream=True）
4. 流式返回时过安全过滤（响应方向）
5. 保存消息到数据库

- [ ] **Step 3: 测试对话 API**

```bash
# 创建会话
curl -X POST http://localhost:8000/api/chat/conversations \
  -H "Authorization: Bearer <token>"

# 发送消息（SSE）
curl -N http://localhost:8000/api/chat/conversations/<id>/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"你好","style_identifier":"teacher"}'
```

- [ ] **Step 4: 提交**

```bash
cd D:\X\新建文件夹
git add backend/app/chat/
git commit -m "feat: add chat engine with SSE streaming and style switching"
```

---

## Task 8: 统计 API

**Covers:** [S8]

**Files:**
- Create: `backend/app/logs/__init__.py`
- Create: `backend/app/logs/router.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `Conversation`, `Message`, `AuditLog` models
- Produces: 统计数据 API

- [ ] **Step 1: 创建统计路由**

`backend/app/logs/router.py`:
```python
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_admin
from app.core.database import get_db
from app.models.conversation import Conversation, Message, StyleSwitch
from app.models.safety import AuditLog

router = APIRouter(prefix="/api/admin/stats", tags=["stats"])


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    total_conversations = await db.scalar(select(func.count(Conversation.id)))
    total_messages = await db.scalar(select(func.count(Message.id)))
    total_blocks = await db.scalar(select(func.count(AuditLog.id)))
    total_requests = await db.scalar(select(func.count(Message.id)).where(Message.role == "user"))
    block_rate = (total_blocks / total_requests * 100) if total_requests > 0 else 0
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
```

- [ ] **Step 2: 注册路由**

- [ ] **Step 3: 提交**

```bash
cd D:\X\新建文件夹
git add backend/app/logs/
git commit -m "feat: add statistics API for dashboard"
```

---

## Task 9: 前端 — 登录/注册页

**Covers:** [S4, S9]

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/stores/authStore.ts`
- Create: `frontend/src/services/authService.ts`
- Create: `frontend/src/router.tsx`

**Interfaces:**
- Consumes: `/api/auth/*` API
- Produces: `useAuthStore` (Zustand store), 路由配置

- [ ] **Step 1: 创建 auth store**

`frontend/src/stores/authStore.ts` — Zustand store 管理 token、用户信息、登录/登出状态。

- [ ] **Step 2: 创建登录页面**

仿照 ragent 的 LoginPage 设计：渐变背景 + 毛玻璃居中卡片。

- [ ] **Step 3: 创建注册页面**

类似登录页，增加确认密码字段。

- [ ] **Step 4: 配置路由**

```typescript
// 路由结构
/login        → LoginPage
/register     → RegisterPage
/chat         → ChatPage (需登录)
/chat/:id     → ChatPage (需登录)
/admin/*      → AdminLayout (需管理员)
```

- [ ] **Step 5: 验证**

启动前后端，测试注册→登录→跳转聊天页流程。

- [ ] **Step 6: 提交**

```bash
cd D:\X\新建文件夹
git add frontend/src/
git commit -m "feat: add login/register pages with JWT auth"
```

---

## Task 10: 前端 — 聊天页

**Covers:** [S7, S9]

**Files:**
- Create: `frontend/src/pages/ChatPage.tsx`
- Create: `frontend/src/components/chat/ChatInput.tsx`
- Create: `frontend/src/components/chat/MessageList.tsx`
- Create: `frontend/src/components/chat/MessageBubble.tsx`
- Create: `frontend/src/components/chat/StyleSelector.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/MainLayout.tsx`
- Create: `frontend/src/stores/chatStore.ts`
- Create: `frontend/src/services/chatService.ts`

**Interfaces:**
- Consumes: `/api/chat/*`, `/api/styles` API, `useAuthStore`
- Produces: 完整聊天界面

- [ ] **Step 1: 创建 chat store 和 service**

管理会话列表、当前会话、消息、流式接收。

- [ ] **Step 2: 创建 MainLayout + Sidebar**

仿照 ragent 的布局：左侧边栏显示会话列表 + 新建会话按钮。

- [ ] **Step 3: 创建聊天组件**

- MessageList: 消息列表，支持 Markdown 渲染
- MessageBubble: 单条消息气泡（用户靠右蓝色，助手靠左白色）
- ChatInput: 输入框 + 发送按钮 + 风格切换下拉框
- StyleSelector: 风格选择器

- [ ] **Step 4: 实现 SSE 流式接收**

```typescript
// 使用 EventSource 或 fetch + ReadableStream
const response = await fetch(`/api/chat/conversations/${id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ content, style_identifier }),
});
const reader = response.body.getReader();
// 逐 chunk 读取并更新消息
```

- [ ] **Step 5: 验证**

测试聊天流程：创建会话→选择风格→发送消息→流式接收回复→切换风格。

- [ ] **Step 6: 提交**

```bash
cd D:\X\新建文件夹
git add frontend/src/
git commit -m "feat: add chat page with SSE streaming and style switching"
```

---

## Task 11: 前端 — 管理后台

**Covers:** [S8, S9]

**Files:**
- Create: `frontend/src/pages/admin/AdminLayout.tsx`
- Create: `frontend/src/pages/admin/DashboardPage.tsx`
- Create: `frontend/src/pages/admin/AuditLogPage.tsx`
- Create: `frontend/src/pages/admin/UserManagePage.tsx`
- Create: `frontend/src/pages/admin/StyleManagePage.tsx`
- Create: `frontend/src/pages/admin/KeywordManagePage.tsx`
- Create: `frontend/src/services/adminService.ts`

**Interfaces:**
- Consumes: `/api/admin/*` API
- Produces: 完整管理后台

- [ ] **Step 1: 创建 AdminLayout**

仿照 ragent：深色侧边栏 + 浅色内容区 + 顶部面包屑。侧边栏菜单：仪表盘、审核日志、用户管理、风格管理、关键词库。

- [ ] **Step 2: 创建仪表盘**

使用 Recharts 展示：总对话数、拦截率、活跃用户、趋势图。

- [ ] **Step 3: 创建审核日志页**

表格展示：用户名、原始内容、拦截层、违规类型、原因、时间。支持搜索和筛选。

- [ ] **Step 4: 创建用户管理页**

仿照 ragent 的 UserListPage：用户列表表格 + 角色设置。

- [ ] **Step 5: 创建风格管理页**

风格列表 + 新增/编辑对话框。

- [ ] **Step 6: 创建关键词管理页**

关键词列表 + 添加/删除 + 分类筛选。

- [ ] **Step 7: 验证**

以管理员登录，访问所有管理页面，验证数据展示和 CRUD 操作。

- [ ] **Step 8: 提交**

```bash
cd D:\X\新建文件夹
git add frontend/src/
git commit -m "feat: add admin dashboard with audit logs and management pages"
```

---

## Task 12: 对照测试与验证

**Covers:** [S10]

**Files:**
- Create: `backend/tests/test_safety.py`
- Create: `backend/tests/test_styles.py`
- Create: `backend/tests/test_data/`

**Interfaces:**
- Consumes: 所有 API
- Produces: 测试报告

- [ ] **Step 1: 创建安全过滤测试集**

`backend/tests/test_data/violation_samples.json` — 50 条违规内容
`backend/tests/test_data/safe_samples.json` — 50 条正常内容

- [ ] **Step 2: 运行安全过滤测试**

```bash
cd D:\X\新建文件夹\backend
pytest tests/test_safety.py -v
```

验证：违规拦截率 > 95%，正常误拦截率 < 5%

- [ ] **Step 3: 创建风格匹配度测试**

同一问题在不同风格下运行，人工对比输出。

- [ ] **Step 4: 创建端到端测试**

测试完整流程：注册→登录→创建会话→切换风格→发送消息→查看日志。

- [ ] **Step 5: 提交**

```bash
cd D:\X\新建文件夹
git add backend/tests/
git commit -m "test: add safety filter tests and style matching tests"
```
