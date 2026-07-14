# 大模型对话风格定制与内容安全过滤助手

## 项目架构

```
safechat/
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # 全局配置 (数据库、API密钥、JWT)
│   │   │   └── database.py           # SQLAlchemy 异步引擎 + 会话工厂
│   │   ├── auth/
│   │   │   ├── schemas.py            # 注册/登录请求/响应模型
│   │   │   ├── service.py            # 密码哈希、JWT 生成、用户验证
│   │   │   ├── dependencies.py       # FastAPI 依赖注入 (get_current_user, require_admin)
│   │   │   └── router.py             # /api/auth/* 路由 (含头像上传、用户列表)
│   │   ├── models/
│   │   │   ├── user.py               # 用户表 ORM (含 avatar 字段)
│   │   │   ├── style.py              # 风格模板表 ORM
│   │   │   ├── conversation.py       # 会话、消息、风格切换记录表 ORM (软删除)
│   │   │   └── safety.py             # 关键词、审核日志表 ORM (含审核状态)
│   │   ├── styles/
│   │   │   ├── schemas.py            # 风格 CRUD 请求/响应模型
│   │   │   ├── seed.py               # 5 种内置风格种子数据
│   │   │   └── router.py             # /api/styles/* 路由
│   │   ├── safety/
│   │   │   ├── keyword_filter.py     # 第一层：关键词匹配过滤器
│   │   │   ├── model_filter.py       # 第二层：云端模型审核 (MiMo API)
│   │   │   ├── filter.py             # 统一过滤管道 (串行两层)
│   │   │   └── router.py             # /api/admin/keywords/*, /api/admin/audit-logs/*
│   │   ├── chat/
│   │   │   ├── schemas.py            # 对话请求/响应模型
│   │   │   └── router.py             # /api/chat/* 路由 (SSE 流式)
│   │   ├── logs/
│   │   │   └── router.py             # /api/admin/stats/* 统计路由 (含风格切换记录)
│   │   ├── uploads/                  # 上传文件目录 (头像)
│   │   └── main.py                   # FastAPI 入口，路由注册，种子数据初始化
│   ├── pyproject.toml                # Python 依赖
│   └── .env.example                  # 环境变量模板
│
└── frontend/                         # React 前端
    ├── src/
    │   ├── components/
    │   │   ├── ui/                   # shadcn/ui 组件
    │   │   └── AvatarCropModal.tsx   # 头像裁剪弹窗
    │   ├── pages/
    │   │   ├── LoginPage.tsx         # 登录页
    │   │   ├── RegisterPage.tsx      # 注册页
    │   │   ├── ChatPage.tsx          # 聊天页 (侧边栏 + 消息流 + 风格切换)
    │   │   └── admin/
    │   │       ├── AdminLayout.tsx   # 管理后台布局
    │   │       ├── DashboardPage.tsx # 仪表盘 (统计卡片 + 最近活动)
    │   │       ├── AuditLogPage.tsx  # 审核日志 (分页 + 筛选)
    │   │       ├── UserManagePage.tsx# 用户管理
    │   │       ├── StyleManagePage.tsx# 风格管理 (弹窗编辑)
    │   │       ├── KeywordManagePage.tsx# 关键词库 (搜索 + 分类筛选)
    │   │       └── StyleSwitchPage.tsx# 风格切换记录
    │   ├── stores/
    │   │   ├── authStore.ts          # Zustand 认证状态管理
    │   │   └── chatStore.ts          # Zustand 对话状态管理
    │   ├── services/
    │   │   └── api.ts                # Axios 实例 (拦截器、token 注入)
    │   ├── styles/
    │   │   └── globals.css           # Tailwind CSS + 设计系统变量
    │   ├── lib/
    │   │   └── utils.ts              # cn() 工具函数
    │   ├── router.tsx                # React Router 路由配置
    │   └── main.tsx                  # 应用入口
    ├── tailwind.config.cjs           # Tailwind 配置
    ├── vite.config.ts                # Vite 配置 (别名、代理)
    └── package.json                  # 前端依赖
```

## 核心技术栈

### 前端

| 技术 | 版本 | 用途 | 特点 |
|---|---|---|---|
| **React** | 19.2.7 | UI 框架 | 组件化、虚拟 DOM、Hooks |
| **TypeScript** | 6.0.3 | 类型系统 | 静态类型检查、接口定义、泛型 |
| **Vite** | 8.1.4 | 构建工具 | 极速 HMR、ESBuild 预构建、原生 ESM |
| **shadcn/ui** | latest | UI 组件库 | 基于 Radix UI + Tailwind、可复制组件、无运行时依赖 |
| **Radix UI** | 2.1.11 | 无样式原语 | 无障碍访问、键盘导航、WAI-ARIA 合规 |
| **Tailwind CSS** | 3.4.19 | 原子化 CSS | JIT 编译、响应式、自定义设计系统 |
| **Zustand** | 5.0.14 | 状态管理 | 轻量（<1KB）、无 Provider、支持 persist 中间件 |
| **React Router** | 7.18.1 | 客户端路由 | 嵌套路由、Loader/Action、权限守卫 |
| **Axios** | 1.18.1 | HTTP 客户端 | 请求/响应拦截器、自动 JSON 转换、token 注入 |
| **Lucide React** | 1.24.0 | 图标库 | 1000+ SVG 图标、Tree-shaking |
| **Sonner** | 2.0.7 | Toast 通知 | 轻量、可堆叠、支持富文本 |
| **react-easy-crop** | - | 图片裁剪 | 头像上传裁剪 |
| **react-markdown** | - | Markdown 渲染 | 消息内容渲染 |
| **prismjs** | - | 代码高亮 | 代码块语法高亮 |

### 后端

| 技术 | 版本 | 用途 | 特点 |
|---|---|---|---|
| **FastAPI** | 0.139.0 | Web 框架 | 异步高性能、自动 OpenAPI 文档、Pydantic 校验 |
| **SQLAlchemy** | 2.0.51 | ORM | 异步支持、声明式映射、类型注解 |
| **PostgreSQL** | 18 | 关系数据库 | JSONB 支持、全文检索、并发性能优异 |
| **asyncpg** | 0.31.0 | PG 异步驱动 | 原生 asyncio、高性能、连接池 |
| **Pydantic** | 2.13.4 | 数据校验 | 模型验证、JSON Schema 生成、序列化 |
| **PyJWT** | 2.13.0 | JWT 令牌 | 签发/验证 access_token + refresh_token |
| **bcrypt** | 5.0.0 | 密码哈希 | 加盐哈希、抗彩虹表攻击 |
| **httpx** | 0.28.1 | 异步 HTTP | 支持 HTTP/2、流式请求、超时控制 |
| **sse-starlette** | 3.4.5 | SSE 推送 | Server-Sent Events 流式响应 |

### AI / 安全

| 技术 | 用途 | 说明 |
|---|---|---|
| **MiMo-v2.5-pro-ultraspeed** | 对话生成 + 内容审核 | 小米开源大模型 |
| **OpenAI 兼容 API** | 模型调用接口 | 标准 Chat Completions 协议，支持流式 |
| **Prompt Engineering** | 风格定制 | System Prompt + Few-shot 示例 + Temperature 调优 |
| **关键词过滤** | 第一层安全 | 精确匹配敏感词库，零延迟拦截 |
| **模型审核** | 第二层安全 | LLM 分类判断违规内容（色情/暴力/违法/歧视等） |
| **两层串行管道** | 安全架构 | 请求和响应双向过滤，任一层命中即拦截 |

## 数据库表结构

| 表名 | 说明 | 关键字段 |
|---|---|---|
| `users` | 用户 | id, username, password_hash, role, avatar, created_at |
| `styles` | 风格模板 | id, name, identifier, system_prompt, few_shot, temperature, top_p, is_builtin |
| `conversations` | 对话会话 | id, user_id, title, is_deleted, created_at |
| `messages` | 消息 | id, conversation_id, role, content, style_id, created_at |
| `style_switches` | 风格切换记录 | id, conversation_id, user_id, from_style_id, to_style_id, created_at |
| `keywords` | 敏感词 | id, word, category, created_at |
| `audit_logs` | 审核日志 | id, user_id, direction, layer, original_text, category, reason, review_status |

## API 路由

| 路径 | 方法 | 说明 | 权限 |
|---|---|---|---|
| `/api/auth/register` | POST | 注册 | 公开 |
| `/api/auth/login` | POST | 登录 | 公开 |
| `/api/auth/me` | GET | 当前用户 | 登录 |
| `/api/auth/avatar` | POST | 上传头像 | 登录 |
| `/api/auth/users` | GET | 用户列表 | 管理员 |
| `/api/styles` | GET | 风格列表 | 公开 |
| `/api/styles` | POST | 创建风格 | 管理员 |
| `/api/styles/:id` | PUT | 更新风格 | 管理员 |
| `/api/styles/:id` | DELETE | 删除风格 | 管理员 |
| `/api/chat/conversations` | GET/POST | 会话列表/创建 | 登录 |
| `/api/chat/conversations/:id/messages` | GET/POST | 消息列表/发送(SSE) | 登录 |
| `/api/chat/conversations/:id/switch-style` | POST | 切换风格(有对话) | 登录 |
| `/api/chat/switch-style` | POST | 切换风格(无对话) | 登录 |
| `/api/admin/keywords` | GET/POST | 关键词列表/添加 | 管理员 |
| `/api/admin/keywords/categories` | GET | 关键词分类列表 | 管理员 |
| `/api/admin/keywords/:id` | DELETE | 删除关键词 | 管理员 |
| `/api/admin/audit-logs` | GET | 审核日志(分页) | 管理员 |
| `/api/admin/stats/overview` | GET | 统计概览 | 管理员 |
| `/api/admin/stats/by-style` | GET | 按风格统计 | 管理员 |
| `/api/admin/stats/by-category` | GET | 按类型统计 | 管理员 |
| `/api/admin/stats/recent` | GET | 最近活动 | 管理员 |
| `/api/admin/stats/style-switches` | GET | 风格切换记录 | 管理员 |

## 安全过滤流程

```
用户输入 → 关键词过滤(精确匹配) → 云端模型审核(MiMo API) → 构建对话 → 调用模型
                                                                        ↓
用户收到 ← 关键词过滤响应 ← 云端模型审核响应 ← 流式返回 ←──────────────┘
```

## 内置风格

| 风格 | 标识 | temperature | 特点 |
|---|---|---|---|
| 教师辅导 | teacher | 0.3 | 循序渐进、多举例、耐心纠正 |
| 代码助手 | coder | 0.2 | 简洁准确、直接给代码 |
| 科普讲解 | science | 0.7 | 生动比喻、通俗易懂 |
| 翻译助手 | translator | 0.3 | 信达雅、保留风格 |
| 写作助手 | writer | 0.8 | 文采丰富、结构清晰 |

## 管理后台

访问 `/admin` 进入管理后台（需要管理员账号）

- **仪表盘**：统计概览、最近活动
- **审核日志**：拦截记录，支持按类型筛选
- **用户管理**：用户列表
- **风格管理**：风格模板 CRUD
- **关键词库**：敏感词管理，支持搜索和分类筛选
- **切换记录**：风格切换历史

