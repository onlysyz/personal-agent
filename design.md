# Personal Agent 设计文档

## 1. 概述

Personal Agent 是一个本地运行的私人 AI 助手，以用户编辑的 `profile.json` 为数据源，提供三大核心功能：Dashboard（看板）、人生抉择器（Life Decision Maker）、简历页（Public Profile）。所有数据本地存储，AI 模型通过 `.env` 自由配置。

**架构模式**：前端 SPA（React + Vite）+ 后端 API Server（Express），前后端分离。

## 2. 功能范围

| 模块 | MVP 范围 | Phase 2 | Phase 3 |
|------|----------|---------|---------|
| Dashboard | 基本信息卡片、当前状态、工作经历、技能列表、近期动态 | 技能雷达图、时间线可视化、模块显隐配置 | 主题切换、多语言 |
| 人生抉择器 | 输入抉择→AI 分析→追问 | 决策历史记录保存与回顾 | — |
| 简历页 | 静态信息展示 + AI 对话窗口 | public/private 字段过滤 | — |
| 数据编辑器 | 表单编辑 + 原始 JSON 查看 | 保存到 profile.json | 完整可视化编辑 UI |
| 数据层 | profile.json 读写 | visibility 过滤逻辑 | — |
| AI 层 | OpenAI / Anthropic / Ollama / Gemini 统一接口 | — | — |

## 3. 技术架构

### 3.1 技术栈

| 层次 | 技术选型 | 版本 | 理由 |
|------|----------|------|------|
| 前端框架 | React + Vite | React 19 / Vite 6 | 已有 UI 代码基础，构建快 |
| 路由 | react-router-dom | v7 | 已有路由实现 |
| 样式 | Tailwind CSS | v4 | 已有主题系统，零配置 |
| 动画 | motion (Framer Motion) | v12 | 已有页面过渡和卡片动画 |
| 图标 | lucide-react | — | 已统一使用 |
| UI 组件 | 手写组件 + Material Design 3 色彩体系 | — | 保持现有暗色科技风格 |
| 后端框架 | Express | v4 | API Server，提供 REST 接口 |
| 数据库 | SQLite (better-sqlite3) | — | 本地文件，无需安装服务 |
| AI 模型层 | 统一 LLM 接口 | — | 支持多 provider |
| 运行时 | Node.js | — | 前后端统一 |

### 3.2 整体架构

```
┌─────────────────────────────────────────────┐
│                Browser (SPA)                │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Dashboard│ │Decision  │ │Public Profile │  │
│  │  View   │ │Maker View│ │    View       │  │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘  │
│       │           │              │           │
│  ┌────▼───────────▼──────────────▼────────┐  │
│  │          API Client (fetch)            │  │
│  └────────────────┬──────────────────────┘  │
└───────────────────┼─────────────────────────┘
                    │ HTTP (localhost:3001)
┌───────────────────▼─────────────────────────┐
│            Express API Server               │
│  ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │ Profile  │ │Decision│ │    Chat      │  │
│  │ Routes   │ │ Routes │ │   Routes     │  │
│  └────┬─────┘ └───┬────┘ └──────┬───────┘  │
│       │           │             │           │
│  ┌────▼───────────▼─────────────▼────────┐  │
│  │          LLM Provider Layer           │  │
│  │  (OpenAI / Anthropic / Ollama /Gemini)│  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────┐  ┌───────────────────┐   │
│  │ profile.json │  │ SQLite (decisions,│   │
│  │   (读取)     │  │  chat_sessions)   │   │
│  └──────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────┘
```

### 3.3 开发与部署

- **开发模式**：Vite dev server (port 5173) + Express API (port 3001)，Vite proxy 转发 `/api` 请求
- **生产模式**：`vite build` 生成静态文件，Express 同时托管静态文件和 API（单端口 3000）
- **启动命令**：
  - `npm run dev` — 前后端同时启动（concurrently）
  - `npm run build && npm start` — 生产模式

## 4. 数据模型

### 4.1 ProfileData（用户个人信息）

基于现有 `src/types.ts` 扩展，增加 PRD 要求的 visibility、values、decisions_context 字段：

```typescript
interface Skill {
  name: string;
  value: number;                    // 0-1 熟练度
  color: "primary" | "secondary";
}

interface Experience {
  company: string;
  period: string;
  role: string;
  description: string;
  highlights?: string[];            // PRD 要求
  reason_for_leaving?: string;      // PRD 要求，仅供 Agent 回答
  active?: boolean;                 // 标记当前工作
  visibility: "public" | "private";
}

interface DynamicLog {
  id: string;
  type: "commit" | "doc" | "session";
  time: string;
  title: string;
  description: string;
}

interface ContactInfo {
  email: string;
  github: string;
  visibility: "public" | "private";
}

interface ProfileData {
  name: string;
  role: string;
  location: string;
  email: string;
  github: string;
  avatar: string;
  bio: string;                      // 一句话简介
  contact?: ContactInfo;            // PRD 要求的可控联系方式
  currentFocus: {
    title: string;
    description: string;
    stats: { label: string; value: string | number; highlight?: boolean }[];
  };
  skills: Skill[];
  experiences: Experience[];
  recentDynamics: DynamicLog[];
  values: string[];                 // PRD：价值观
  current_goals: string;            // PRD：当前目标
  decisions_context: string;        // PRD：决策上下文
}
```

### 4.2 DecisionContext & DecisionAnalysis

```typescript
interface DecisionContext {
  coreValues: string[];
  currentGoal: string;
}

interface DecisionAnalysis {
  pros: string[];
  cons: string[];
  alignment: number;                // 0-100 匹配度评分
  summary: string;
}
```

### 4.3 SQLite 表结构

```sql
-- 决策历史
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  analysis TEXT NOT NULL,           -- DecisionAnalysis JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 简历页对话会话
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT,
  messages TEXT NOT NULL,           -- JSON array of {role, content}
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.4 错误码定义

| 错误码 | 含义 | 场景 |
|--------|------|------|
| 400 | 请求参数错误 | 缺少必填字段 |
| 404 | 资源未找到 | profile.json 不存在、用户不存在 |
| 422 | 数据格式错误 | profile.json 解析失败 |
| 500 | 服务内部错误 | LLM 调用失败、数据库异常 |

## 5. 接口设计

### 5.1 获取个人信息

- **URL**：`GET /api/profile`
- **描述**：返回完整个人信息，供 Dashboard 和抉择器使用
- **请求参数**：无
- **响应示例**：

```json
{
  "code": 0,
  "data": {
    "name": "张三",
    "role": "全栈工程师",
    "location": "上海",
    "bio": "热爱开源，专注 AI 应用开发",
    "avatar": "/avatar.jpg",
    "currentFocus": { "title": "...", "description": "...", "stats": [...] },
    "skills": [...],
    "experiences": [...],
    "recentDynamics": [...],
    "values": ["自主性", "持续学习"],
    "current_goals": "在 AI 方向深耕",
    "decisions_context": "..."
  }
}
```

### 5.2 获取公开个人信息

- **URL**：`GET /api/profile/[username]`
- **描述**：返回过滤后的公开信息，供简历页使用
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | URL 路径参数 |

- **响应示例**：

```json
{
  "code": 0,
  "data": {
    "name": "张三",
    "role": "全栈工程师",
    "location": "上海",
    "bio": "热爱开源，专注 AI 应用开发",
    "avatar": "/avatar.jpg",
    "skills": [...],
    "experiences": [
      {
        "company": "某公司",
        "role": "高级工程师",
        "period": "2022-2024",
        "description": "...",
        "highlights": ["主导重构了核心服务"]
      }
    ]
  }
}
```

- **过滤规则**：
  - `contact.visibility === "private"` 时，不返回 contact 字段
  - `experience.visibility === "private"` 时，不返回该条经历
  - `reason_for_leaving` 不在公开接口返回
  - `values`、`current_goals`、`decisions_context`、`currentFocus` 不在公开接口返回
  - `recentDynamics` 不在公开接口返回（内部信息）

### 5.3 人生抉择分析

- **URL**：`POST /api/decisions`
- **描述**：用户提交抉择问题，AI 结合个人背景返回结构化分析
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question | string | 是 | 抉择描述 |
| session_id | string | 否 | 已有会话 ID，用于多轮追问 |

- **请求示例**：

```json
{
  "question": "我在考虑是否要从大厂跳槽去创业公司",
  "session_id": "abc123"
}
```

- **响应示例**：

```json
{
  "code": 0,
  "data": {
    "session_id": "abc123",
    "analysis": {
      "pros": ["接触更多 0-1 机会", "更大的决策权"],
      "cons": ["收入不确定性", "工作强度大"],
      "alignment": 72,
      "summary": "基于你重视自主性和有影响力的工作，创业公司与你价值观匹配度较高，但需注意财务稳定性..."
    }
  }
}
```

- **AI System Prompt**：

```
你是一位人生决策顾问。你将基于用户的个人信息帮助其分析当前抉择。

用户背景：
- 价值观：{values}
- 当前目标：{current_goals}
- 人生阶段与上下文：{decisions_context}
- 工作经历：{experience_summary}

原则：
1. 不给出"正确答案"，而是帮助用户梳理优先级
2. 每个选项列出利弊，并与用户价值观和目标做匹配度评估
3. 最终给出倾向性建议，但保留用户自主决策空间
4. 使用中文回复

请以 JSON 格式返回：{ "pros": string[], "cons": string[], "alignment": number, "summary": string }
```

### 5.4 获取决策历史

- **URL**：`GET /api/decisions`
- **描述**：返回历史决策记录列表
- **响应示例**：

```json
{
  "code": 0,
  "data": [
    {
      "id": "abc123",
      "question": "我在考虑是否要从大厂跳槽去创业公司",
      "analysis": { "pros": [...], "cons": [...], "alignment": 72, "summary": "..." },
      "created_at": "2026-04-24T10:00:00Z"
    }
  ]
}
```

### 5.5 获取决策详情

- **URL**：`GET /api/decisions/[id]`
- **描述**：返回某次决策的完整分析
- **响应示例**：

```json
{
  "code": 0,
  "data": {
    "id": "abc123",
    "question": "我在考虑是否要从大厂跳槽去创业公司",
    "analysis": { "pros": [...], "cons": [...], "alignment": 72, "summary": "..." },
    "created_at": "2026-04-24T10:00:00Z"
  }
}
```

### 5.6 简历页 AI 对话

- **URL**：`POST /api/chat`
- **描述**：访客在简历页与 AI Agent 对话
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 访客提问 |
| session_id | string | 否 | 已有会话 ID，用于多轮对话 |

- **请求示例**：

```json
{
  "message": "你最擅长什么技术方向？",
  "session_id": "xyz789"
}
```

- **响应示例**：

```json
{
  "code": 0,
  "data": {
    "session_id": "xyz789",
    "reply": "张三最擅长的技术方向是 React 和 Node.js 全栈开发，同时在 LLM 应用开发方面有深入实践..."
  }
}
```

- **AI System Prompt**：

```
你是{name}的个人 AI 助手，代表他/她回答访客的问题。

你可以基于以下公开信息回答：
{filtered_public_profile}

规则：
1. 只回答与 {name} 的职业、技能、经历相关的问题
2. 不得透露任何标记为 private 的信息
3. 对于敏感问题（如薪资、离职原因等未公开的信息），回复"这个问题请直接联系本人"
4. 回答要自然、有温度，像一个朋友在介绍 {name}
5. 如果问题超出已知信息范围，诚实说"这个我不太了解，你可以直接联系 ta"
6. 使用中文回复
```

### 5.7 保存个人信息

- **URL**：`PUT /api/profile`
- **描述**：保存编辑后的个人信息到 profile.json
- **请求参数**：完整的 ProfileData 对象
- **响应示例**：

```json
{
  "code": 0,
  "data": { "message": "Profile saved successfully" }
}
```

## 6. 页面结构与交互逻辑

### 6.1 全局布局

沿用现有 `Layout.tsx` + `Sidebar.tsx` + `TopBar.tsx` 结构：

```
┌──────────────────────────────────────────┐
│                  TopBar                  │
├────────┬─────────────────────────────────┤
│        │                                 │
│Side-   │         <Outlet />             │
│ bar    │      (页面内容区)               │
│ (256px)│                                 │
│        │                                 │
├────────┴─────────────────────────────────┤
│               (no footer)                │
└──────────────────────────────────────────┘
```

- **Sidebar 导航项**：Dashboard、Decision Maker、Public Profile、Data Editor
- **路由表**：

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `DashboardView` | 看板首页 |
| `/decision-maker` | `DecisionMakerView` | 人生抉择器 |
| `/public-profile` | `PublicProfileView` | 简历页预览 |
| `/data-editor` | `DataEditorView` | 数据编辑器 |

### 6.2 Dashboard

**页面结构**（沿用现有 Bento Grid）：
- Profile Card（4 cols）：头像、姓名、职位、城市、邮箱、GitHub
- Current Focus Card（8 cols）：当前任务、描述、3 个 stat 指标
- Knowledge Vectors（5 cols）：技能进度条
- Experience Context（7 cols）：工作经历时间线
- Recent Dynamics（12 cols）：3 个动态卡片

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 页面加载 | 进入 `/` | 请求 profile 数据，渲染卡片 | `GET /api/profile` |
| 卡片显隐切换 | Phase 2：点击设置图标 | 保存到 localStorage | 无 |

**状态定义**：

| 状态 | 表现 | 条件 |
|------|------|------|
| 加载中 | Skeleton 占位 | profile 请求中 |
| 正常 | 渲染所有卡片 | 数据加载成功 |
| 错误 | 错误提示 + 重试 | 请求失败 |
| 空数据 | 引导"请编辑 data/profile.json" | profile 不存在 |

### 6.3 人生抉择器

**页面结构**（沿用现有双栏布局）：
- 左侧 Context Sidebar（320px）：核心价值观标签、当前目标、最近决策
- 右侧 Chat Workspace（flex-1）：对话界面，AI 返回结构化分析卡片

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 提交抉择 | 点击发送 / Enter | 显示 loading，调用 AI 分析 | `POST /api/decisions` |
| 追问 | 在已有结果上继续输入 | 追加 session_id，返回分析 | `POST /api/decisions` |
| 查看历史 | Phase 2：点击左侧历史条目 | 加载决策详情 | `GET /api/decisions/[id]` |
| 复制分析 | 点击结果卡片复制按钮 | 复制 summary 到剪贴板 | 无 |

**分析结果渲染**（沿用现有 DecisionMakerView 的卡片模式）：
- 利弊两列展示（pros/cons grid）
- 圆形匹配度仪表盘（SVG，alignment 值）
- 总结文本 + 复制按钮

**状态定义**：

| 状态 | 表现 | 条件 |
|------|------|------|
| 初始 | 输入框 + 引导文案 | 首次进入 |
| 分析中 | 输入禁用 + Spinner + "Crunching data context..." | AI 生成中 |
| 分析完成 | 结构化分析卡片 | AI 返回 |
| 分析失败 | 错误提示 + 重试 | LLM 调用失败 |

### 6.4 简历页

**页面结构**（沿用现有 PublicProfileView）：
- 头部：头像（带 Active 脉冲动画）、姓名、"Agent Active" 徽章、职位、简介、技能标签
- 主体：AI 对话窗口（聊天气泡）
- 底部：3 个建议问题按钮 + 重置对话按钮

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 页面加载 | 进入 `/public-profile` | 加载公开信息，渲染头部 + 对话窗口 | `GET /api/profile` |
| 发送消息 | 输入 + 点击发送 | 用户气泡 → AI loading → 回复气泡 | `POST /api/chat` |
| 点击建议 | 点击预设问题按钮 | 自动填入并发送 | `POST /api/chat` |
| 重置对话 | 点击重置按钮 | 清空对话历史，恢复初始状态 | 无 |

**状态定义**：

| 状态 | 表现 | 条件 |
|------|------|------|
| 加载中 | 骨架屏 | 信息请求中 |
| 正常 | 头部 + 对话窗口 | 数据加载成功 |
| 对话中 | AI 回复加载动画 | AI 生成中 |
| 用户不存在 | 404 页面 | username 未找到 |

### 6.5 数据编辑器

**页面结构**（沿用现有 DataEditorView）：
- Basic Info 表单：agent_name、role、bio_summary（带 public/private 开关）
- Capabilities & Skills：技能标签编辑器
- Raw JSON Source：textarea 显示完整 JSON

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 页面加载 | 进入 `/data-editor` | 加载 profile，填充表单 | `GET /api/profile` |
| 保存 | 点击 "Commit to Disk" | 提交到后端保存 | `PUT /api/profile` |
| 丢弃 | 点击 "Discard Changes" | 重置表单为原始数据 | 无 |

## 7. 核心模块设计

### 7.1 统一 LLM 接口层（server/lib/llm.ts）

```typescript
interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMOptions {
  temperature?: number;
  max_tokens?: number;
  response_schema?: object;         // 结构化输出 schema
}

interface LLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  chatStructured<T>(messages: LLMMessage[], schema: object): Promise<T>;
}

function createProvider(): LLMProvider;
```

**支持的 Provider**：

| Provider | 环境变量 | SDK/方式 |
|----------|----------|----------|
| gemini | GEMINI_API_KEY | @google/genai（已有实现） |
| openai | OPENAI_API_KEY | openai SDK |
| anthropic | ANTHROPIC_API_KEY | @anthropic-ai/sdk |
| ollama | OLLAMA_BASE_URL | fetch 调用本地 API |

**迁移策略**：
- 现有 `src/services/gemini.ts` 中的 `analyzeDecision` 和 `chatWithAgent` 逻辑迁移到后端
- 前端 `gemini.ts` 改为通用 API Client，调用后端 `/api/decisions` 和 `/api/chat`
- Gemini 的结构化输出（`responseSchema`）在 LLM 层统一封装

### 7.2 Profile 读取与过滤（server/lib/profile.ts）

```typescript
function getProfile(): ProfileData;
function getPublicProfile(username: string): Partial<ProfileData>;
function saveProfile(profile: ProfileData): void;
```

**过滤逻辑**：
- 遍历 `experiences`，过滤 `visibility === "private"` 的条目
- 检查 `contact.visibility`，private 时移除
- 移除 `reason_for_leaving`、`values`、`current_goals`、`decisions_context`、`currentFocus`、`recentDynamics`

### 7.3 数据库操作层（server/lib/db.ts）

```typescript
function initDB(): void;

// 决策
function saveDecision(id: string, question: string, analysis: DecisionAnalysis): void;
function getDecisions(): DecisionRecord[];
function getDecisionById(id: string): DecisionRecord | null;

// 对话
function saveChatSession(id: string, visitorId: string, messages: ChatMessage[]): void;
function getChatSession(id: string): ChatSession | null;
function updateChatSession(id: string, messages: ChatMessage[]): void;
```

### 7.4 前端 API Client（src/services/api.ts）

替换现有 `gemini.ts` 的直接调用，改为统一的后端 API Client：

```typescript
const API_BASE = "/api";

async function fetchProfile(): Promise<ProfileData>;
async function fetchPublicProfile(username: string): Promise<Partial<ProfileData>>;
async function saveProfile(profile: ProfileData): Promise<void>;

async function analyzeDecision(question: string, sessionId?: string): Promise<{
  sessionId: string;
  analysis: DecisionAnalysis;
}>;
async function fetchDecisions(): Promise<DecisionRecord[]>;
async function fetchDecisionById(id: string): Promise<DecisionRecord>;

async function chatWithAgent(message: string, sessionId?: string): Promise<{
  sessionId: string;
  reply: string;
}>;
```

## 8. 目录结构

```
personal-agent/
├── src/                            # 前端代码（Vite 构建）
│   ├── main.tsx
│   ├── App.tsx                     # 路由定义
│   ├── index.css                   # Tailwind v4 主题 + 全局样式
│   ├── constants.ts                # 默认 profile 数据（fallback）
│   ├── types.ts                    # 类型定义
│   ├── components/
│   │   ├── Layout.tsx              # 全局布局（Sidebar + TopBar + Outlet）
│   │   ├── Sidebar.tsx             # 侧边栏导航
│   │   └── TopBar.tsx              # 顶栏
│   ├── views/
│   │   ├── DashboardView.tsx       # 看板页
│   │   ├── DecisionMakerView.tsx   # 人生抉择器
│   │   ├── PublicProfileView.tsx   # 简历页
│   │   └── DataEditorView.tsx      # 数据编辑器
│   └── services/
│       └── api.ts                  # 后端 API Client（替换 gemini.ts）
├── server/                         # 后端代码（Express）
│   ├── index.ts                    # Express 入口 + 静态文件托管
│   ├── routes/
│   │   ├── profile.ts              # GET/PUT /api/profile, GET /api/profile/:username
│   │   ├── decisions.ts            # POST/GET /api/decisions, GET /api/decisions/:id
│   │   └── chat.ts                 # POST /api/chat
│   └── lib/
│       ├── llm.ts                  # 统一 LLM 接口
│       ├── llm/
│       │   ├── gemini.ts           # Gemini provider
│       │   ├── openai.ts           # OpenAI provider
│       │   ├── anthropic.ts        # Anthropic provider
│       │   └── ollama.ts           # Ollama provider
│       ├── db.ts                   # SQLite 操作
│       ├── profile.ts              # profile.json 读写与过滤
│       └── prompts.ts              # AI System Prompt 模板
├── data/
│   ├── profile.json                # 用户个人信息
│   └── profile.example.json        # 示例文件
├── public/
│   └── avatar.jpg                  # 默认头像
├── vite.config.ts                  # Vite 配置 + API proxy
├── package.json
├── tsconfig.json
├── .env.example
├── prd.md
├── design.md
└── README.md
```

## 9. 关键配置文件

### 9.1 .env.example

```env
# LLM Provider: gemini | openai | anthropic | ollama
LLM_PROVIDER=gemini

# Gemini
GEMINI_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434

# Server
PORT=3001
```

### 9.2 vite.config.ts（开发代理）

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

### 9.3 package.json scripts

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch server/index.ts\"",
    "dev:client": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "vite build",
    "start": "NODE_ENV=production tsx server/index.ts"
  }
}
```

## 10. 边界场景处理

| 场景 | 处理方式 |
|------|----------|
| profile.json 不存在 | Dashboard 和抉择器显示引导提示，简历页返回 404 |
| profile.json 格式错误 | 返回 422 + 提示用户检查 JSON 格式 |
| LLM 调用超时 | 前端显示超时提示 + 重试按钮；后端 30s 超时 |
| LLM 返回异常 | 捕获异常，返回 500 + 通用提示，不暴露内部错误 |
| 访客提问超出信息边界 | AI 回复"这个问题请直接联系本人" |
| 访客提问无关问题 | AI 回复"这个我不太了解" |
| 数据库文件损坏 | 启动时自动重建表，历史数据丢失时提示 |
| 并发写入 | SQLite WAL 模式，读写不阻塞 |
| 前端 API 不可达 | 检测后端健康状态，显示"请确保 API 服务已启动" |

## 11. 安全设计

| 项目 | 策略 |
|------|------|
| API Key 保护 | .env 不入 Git（.gitignore 排除），API Key 仅存后端，不暴露给前端 |
| Prompt 注入 | 对话输入限制 2000 字，System Prompt 明确拒绝越界指令 |
| 信息泄露 | 公开接口严格按 visibility 过滤，AI Prompt 约束不透露 private 信息 |
| 本地访问 | 默认仅监听 localhost，部署文档提醒用户注意访问控制 |
| CORS | 开发模式仅允许 localhost:5173，生产模式无 CORS（同源） |

## 12. 性能考量

| 项目 | 策略 |
|------|------|
| profile.json 读取 | 启动时读取并缓存到内存，文件变更时热更新（fs.watch） |
| LLM 流式响应 | 抉择器和对话均支持 stream 返回，提升首字响应速度 |
| 静态资源 | Vite 构建 + Express 托管，生产模式 gzip |
| SQLite | WAL 模式 + 单连接复用 |
| 前端动画 | motion 的 `AnimatePresence` + 懒加载视图组件 |
