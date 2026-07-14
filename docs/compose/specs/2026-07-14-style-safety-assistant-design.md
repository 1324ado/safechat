# 大模型对话风格定制与内容安全过滤助手 — 设计文档

## [S1] 问题与目标

构建一个基于 MiMo API 的对话风格定制与内容安全过滤助手，具备：
- 多风格对话切换（教师辅导、代码助手、科普讲解等）
- 两层安全过滤（关键词 + 云端审核模型）
- 用户系统与管理后台
- 对话日志与审核记录持久化
- 对照测试能力

## [S2] 整体架构

```
React 前端 (shadcn/ui + Tailwind)  ──REST API──>  FastAPI 后端
                                                     ├── 用户认证模块 (JWT)
                                                     ├── 风格管理模块 (Prompt模板 + 参数 + RAG)
                                                     ├── 安全过滤模块 (关键词 + 云端模型审核)
                                                     ├── 对话引擎 (MiMo API)
                                                     ├── 日志与统计模块
                                                     └── PostgreSQL 数据库
```

### 后端模块划分

| 模块 | 路径 | 职责 |
|---|---|---|
| core | `backend/app/core/` | 配置、依赖注入、数据库连接 |
| auth | `backend/app/auth/` | 用户注册、登录、JWT 认证 |
| users | `backend/app/users/` | 用户管理 CRUD |
| styles | `backend/app/styles/` | 风格模板定义与管理 |
| safety | `backend/app/safety/` | 关键词过滤器 + 云端审核 |
| chat | `backend/app/chat/` | 对话引擎，串联风格→安全→模型→安全 |
| logs | `backend/app/logs/` | 日志查询与统计 API |
| models | `backend/app/models/` | SQLAlchemy ORM 模型 |

### 前端页面

| 页面 | 路由 | 说明 |
|---|---|---|
| 登录/注册 | `/login`, `/register` | 渐变背景 + 毛玻璃卡片 |
| 聊天页 | `/chat`, `/chat/:sessionId` | 左侧会话列表 + 右侧消息流 + 风格切换 |
| 管理后台 | `/admin/*` | 深色侧边栏 + 浅色内容区 |

管理后台子页面：
- 仪表盘 `/admin/dashboard` — 总对话数、拦截率、活跃用户、趋势图
- 审核日志 `/admin/audit` — 谁问了什么违规内容，筛选/分页
- 用户管理 `/admin/users` — 用户列表、角色设置
- 风格管理 `/admin/styles` — 风格模板 CRUD
- 关键词库 `/admin/keywords` — 敏感词管理

## [S3] 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 前端 | React + TypeScript + Vite | React 18, Vite 5 |
| UI 组件 | shadcn/ui + Tailwind CSS | Tailwind 3.4+ |
| 状态管理 | Zustand | 4.x |
| 图表 | Recharts | 2.x |
| 后端 | FastAPI + Uvicorn | FastAPI 0.110+ |
| ORM | SQLAlchemy + Alembic | SQLAlchemy 2.0+ |
| 数据库 | PostgreSQL | 15+ |
| 认证 | PyJWT + bcrypt | |
| 大模型 | MiMo-v2.5-pro-ultraspeed | OpenAI 兼容 API |
| HTTP 客户端 | httpx (后端) + axios (前端) | |

## [S4] 用户系统

### 数据模型

```sql
users (
  id            UUID PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'user',  -- 'user' | 'admin'
  avatar        VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)
```

### API

- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录，返回 access_token + refresh_token
- `GET /api/auth/me` — 获取当前用户信息
- `POST /api/auth/refresh` — 刷新 token

### 权限控制

- 普通用户：聊天、查看自己的对话历史
- 管理员：所有功能 + 管理后台

## [S5] 风格定制（三层递进）

### 内置风格

| 风格 | 标识 | temperature | top_p | 说明 |
|---|---|---|---|---|
| 教师辅导 | teacher | 0.3 | 0.9 | 耐心、循序渐进、多举例子 |
| 代码助手 | coder | 0.2 | 0.85 | 简洁准确、给出代码示例 |
| 科普讲解 | science | 0.7 | 0.95 | 生动比喻、通俗易懂 |
| 翻译助手 | translator | 0.3 | 0.9 | 信达雅、保留原文风格 |
| 写作助手 | writer | 0.8 | 0.95 | 文采丰富、结构清晰 |

### 数据模型

```sql
styles (
  id            UUID PRIMARY KEY,
  name          VARCHAR(50) NOT NULL,
  identifier    VARCHAR(50) UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL,
  few_shot      JSONB,           -- [{"user": "...", "assistant": "..."}]
  temperature   FLOAT DEFAULT 0.7,
  top_p         FLOAT DEFAULT 0.9,
  max_tokens    INT DEFAULT 2048,
  is_builtin    BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
)
```

### 风格切换 API

- `GET /api/styles` — 获取所有可用风格
- `POST /api/styles` — 创建自定义风格（管理员）
- `PUT /api/styles/:id` — 更新风格
- `DELETE /api/styles/:id` — 删除自定义风格

## [S6] 安全过滤（两层串行）

### 第一层：关键词过滤

- 使用 ahocorasick 库实现 AC 自动机
- 支持关键词分类（色情、暴力、政治、违法等）
- 请求和响应都过

### 第二层：云端审核模型

调用 MiMo API，用分类 prompt 做内容审核：

```
你是一个内容审核员。请判断以下文本是否包含违规内容。
违规类型包括：色情、暴力、违法、歧视、仇恨言论、自残。

文本：{text}

请返回 JSON 格式：
{"safe": true/false, "category": "类型", "reason": "原因"}
```

### 数据模型

```sql
keywords (
  id        UUID PRIMARY KEY,
  word      VARCHAR(100) NOT NULL,
  category  VARCHAR(50),     -- 色情/暴力/政治/违法/自定义
  created_at TIMESTAMP DEFAULT NOW()
)

audit_logs (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  session_id    UUID,
  direction     VARCHAR(10),    -- 'request' | 'response'
  layer         VARCHAR(20),    -- 'keyword' | 'model'
  original_text TEXT,
  category      VARCHAR(50),
  reason        TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
)
```

### 过滤 API

- `GET /api/admin/keywords` — 关键词列表（分页）
- `POST /api/admin/keywords` — 添加关键词
- `DELETE /api/admin/keywords/:id` — 删除关键词
- `GET /api/admin/audit-logs` — 审核日志（分页、筛选）
- `GET /api/admin/audit-stats` — 拦截率统计

## [S7] 对话引擎

### 流程

```
用户输入 → 关键词过滤 → 云端审核 → 构建 messages → 调用 MiMo API → 流式返回 → 关键词过滤响应 → 云端审核响应 → 返回用户
```

### 数据模型

```sql
conversations (
  id         UUID PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  title      VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
)

messages (
  id              UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role            VARCHAR(20),    -- 'user' | 'assistant' | 'system'
  content         TEXT,
  style_id        UUID REFERENCES styles(id),
  created_at      TIMESTAMP DEFAULT NOW()
)

style_switches (
  id              UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  user_id         UUID REFERENCES users(id),
  from_style_id   UUID REFERENCES styles(id),
  to_style_id     UUID REFERENCES styles(id),
  created_at      TIMESTAMP DEFAULT NOW()
)
```

### 对话 API

- `POST /api/chat/conversations` — 创建会话
- `GET /api/chat/conversations` — 获取会话列表
- `GET /api/chat/conversations/:id/messages` — 获取消息历史
- `POST /api/chat/conversations/:id/messages` — 发送消息（SSE 流式返回）
- `POST /api/chat/conversations/:id/switch-style` — 切换风格

## [S8] 统计与仪表盘

### 统计指标

- 总对话数 / 今日对话数
- 总消息数 / 今日消息数
- 拦截总数 / 今日拦截数
- 拦截率 = 拦截数 / 总请求数
- 按风格分组的对话数
- 按违规类型分组的拦截数
- 趋势图（按天/周/月）

### 统计 API

- `GET /api/admin/stats/overview` — 概览数据
- `GET /api/admin/stats/trends` — 趋势数据
- `GET /api/admin/stats/by-style` — 按风格分组
- `GET /api/admin/stats/by-category` — 按违规类型分组

## [S9] 前端设计规范

仿照 ragent 项目的设计系统：

- **配色**：HSL CSS 变量，主色 #3b82f6 (蓝)
- **字体**：Space Grotesk (标题) + DM Sans (正文) + JetBrains Mono (代码)
- **布局**：
  - 登录页：渐变背景 + 毛玻璃居中卡片
  - 聊天页：左侧会话列表 + 右侧消息区 + 风格切换
  - 管理后台：深色侧边栏 (#1a1f2e → #252d3d) + 浅色内容区 (#F3F4F6)
- **组件**：shadcn/ui (Button, Card, Table, Badge, Dialog, Select, Input, Tabs)
- **动画**：fade-up, pulse-soft, 适度使用

## [S10] 对照测试方案

### 风格匹配度测试

- 准备 10 个测试问题
- 每个问题在 5 种风格下各运行一次
- 人工评估风格匹配度（1-5 分）

### 违规内容拦截率测试

- 准备违规测试集（50 条）和正常测试集（50 条）
- 过两层过滤
- 统计：违规拦截率（应 > 95%）、正常误拦截率（应 < 5%）

### 正常对话体验测试

- 准备 20 个日常对话问题
- 验证不应被拦截
- 记录响应延迟
