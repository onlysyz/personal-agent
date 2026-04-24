# Personal Agent 设计文档

## 1. 概述

Personal Agent 是一个本地运行的私人 AI 助手，以用户编辑的 `profile.json` 为数据源，提供三大核心功能：Dashboard（看板）、人生抉择器（Life Decision Maker）、简历页（Public Profile）。所有数据本地存储，AI 模型通过 `.env` 自由配置。

**核心定位**：这不是一个带 AI 接口的后台系统，而是一个 **Agent 系统** — Agent 是第一公民，所有功能通过 Agent 的能力（规划、工具调用、记忆、子 Agent）驱动。

## 2. 功能范围

| 模块 | MVP 范围 | Phase 2 | Phase 3 |
|------|----------|---------|---------|
| Dashboard | 基本信息卡片、当前状态、工作经历、技能列表、近期动态 | 技能雷达图、时间线可视化、模块显隐配置 | 主题切换、多语言 |
| 人生抉择器 | 输入抉择→Agent 分析→追问 | 决策历史记录保存与回顾 | — |
| 简历页 | 静态信息展示 + Agent 对话窗口 | public/private 字段过滤 | — |
| 数据编辑器 | 表单编辑 + 原始 JSON 查看 | 保存到 profile.json | 完整可视化编辑 UI |
| Agent 系统 | DeepAgents Runtime + 自定义 Tools + Profile 知识注入 | 决策记忆持久化、会话管理 | 多 Agent 协作 |

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
| Agent Runtime | DeepAgents (LangChain) | deepagentsjs | 规划、工具、子Agent、记忆开箱即用 |
| Agent 框架 | LangGraph | @langchain/langgraph | 流式、持久化、检查点 |
| HTTP 层 | Express | v4 | 暴露 API，托管前端静态文件 |
| 数据库 | SQLite (better-sqlite3) | — | 本地文件，无需安装服务 |
| 运行时 | Node.js | — | 前后端统一 |

### 3.2 整体架构

```
┌──────────────────────────────────────────────────┐
│                  Browser (SPA)                   │
│  ┌─────────┐ ┌───────────┐ ┌─────────────────┐  │
│  │Dashboard│ │ Decision  │ │  Public Profile  │  │
│  │  View   │ │Maker View │ │     View         │  │
│  └────┬────┘ └─────┬─────┘ └───────┬─────────┘  │
│       │             │               │            │
│  ┌────▼─────────────▼───────────────▼──────────┐ │
│  │            API Client (fetch)               │ │
│  └────────────────┬───────────────────────────┘ │
└───────────────────┼─────────────────────────────┘
                    │ HTTP (localhost:3001)
┌───────────────────▼─────────────────────────────┐
│              Express (HTTP Layer)                │
│  ┌──────────────────────────────────────────┐   │
│  │        API Routes (thin adapter)         │   │
│  │  profile │ decisions │ chat │ agent      │   │
│  └──────────────┬───────────────────────────┘   │
└─────────────────┼───────────────────────────────┘
                  │ delegates to
┌─────────────────▼───────────────────────────────┐
│          DeepAgents Runtime (Core)               │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │           Personal Agent                   │ │
│  │  ┌──────────────┐  ┌───────────────────┐  │ │
│  │  │ System Prompt│  │  Profile Knowledge │  │ │
│  │  │ (角色定义)    │  │  (profile.json)    │  │ │
│  │  └──────────────┘  └───────────────────┘  │ │
│  │                                            │ │
│  │  Built-in Capabilities:                    │ │
│  │  ✓ Planning (write_todos)                  │ │
│  │  ✓ Filesystem (read/write/edit/ls/grep)    │ │
│  │  ✓ Sub-agents (task delegation)            │ │
│  │  ✓ Context management (summarization)      │ │
│  │  ✓ Memory (cross-session persistence)      │ │
│  │                                            │ │
│  │  Custom Tools:                             │ │
│  │  ┌──────────────┐  ┌────────────────────┐  │ │
│  │  │read_profile  │  │save_decision       │  │ │
│  │  │query_decisions│  │filter_public_info  │  │ │
│  │  └──────────────┘  └────────────────────┘  │ │
│  │                                            │ │
│  │  Sub-agents:                               │ │
│  │  ┌──────────────┐  ┌────────────────────┐  │ │
│  │  │Decision Agent│  │  Profile Agent     │  │ │
│  │  │(抉择分析)     │  │  (简历页问答)       │  │ │
│  │  └──────────────┘  └────────────────────┘  │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ LangGraph    │  │  SQLite Checkpointer   │   │
│  │ (状态图引擎) │  │  (会话/决策持久化)      │   │
│  └──────────────┘  └────────────────────────┘   │
│                                                  │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │profile.json  │  │  LLM Provider          │   │
│  │(知识源)      │  │  (OpenAI/Anthropic/    │   │
│  │              │  │   Ollama/Gemini)        │   │
│  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 3.3 开发与部署

- **开发模式**：Vite dev server (port 5173) + Express API (port 3001)，Vite proxy 转发 `/api` 请求
- **生产模式**：`vite build` 生成静态文件，Express 同时托管静态文件和 API（单端口 3000）
- **启动命令**：
  - `npm run dev` — 前后端同时启动（concurrently）
  - `npm run build && npm start` — 生产模式

## 4. Agent 架构（核心）

### 4.1 为什么用 DeepAgents

传统做法是在 Express route 里拼 prompt + 调 LLM，这有几个问题：
- 没有规划能力，复杂任务（多轮追问、多步骤决策）无法拆解
- 没有上下文管理，对话长了就爆 context window
- 没有持久化，重启丢失所有会话状态
- 没有子 Agent，所有逻辑堆在一个 prompt 里
- 每个功能各写一套 LLM 调用，重复且不可组合

DeepAgents 解决了这些问题：它基于 LangGraph 提供了规划、文件系统、子 Agent、记忆、上下文压缩等开箱即用的能力，我们只需定义 **自定义 Tools** 和 **子 Agent**，让 Agent 自主决定如何使用它们。

### 4.2 Agent 层级设计

```
                    Personal Agent (主 Agent)
                    ├─ system: "你是 {name} 的私人 AI 助手"
                    ├─ knowledge: profile.json 全量注入
                    ├─ built-in: planning, filesystem, summarization
                    │
                    ├─ Sub-agent: Decision Agent
                    │  ├─ system: "你是人生决策顾问"
                    │  ├─ knowledge: values, goals, decisions_context
                    │  ├─ tools: [save_decision, query_decisions]
                    │  └─ response_format: DecisionAnalysis schema
                    │
                    └─ Sub-agent: Profile Agent
                       ├─ system: "你是 {name} 的对外代表"
                       ├─ knowledge: filter_public(profile)
                       ├─ tools: [filter_public_info]
                       └─ constraints: 不透露 private 信息
```

**设计原则**：
- **主 Agent 是协调者**：接收用户/访客请求，判断路由到哪个子 Agent
- **子 Agent 是专家**：每个子 Agent 有独立的 system prompt、知识范围和工具集
- **知识通过 memory 注入**：profile.json 内容作为 Agent Memory 加载，而非硬编码到 prompt
- **安全边界在工具层**：private 信息不是靠 prompt 约束，而是靠工具不返回

### 4.3 主 Agent 创建

```typescript
import { createDeepAgent, createSubAgentMiddleware } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { readProfileTool, saveDecisionTool, queryDecisionsTool, filterPublicInfoTool } from "./tools";
import { decisionAgent, profileAgent } from "./subagents";

const agent = createDeepAgent({
  model: process.env.LLM_MODEL || "anthropic:claude-sonnet-4-5-20250929",
  systemPrompt: `你是 {name} 的私人 AI 助手。你可以帮助 {name} 管理个人信息、
分析人生抉择、以及代表 {name} 向访客介绍自己。
当用户提出抉择类问题时，使用 task 工具委派给 decision_agent。
当访客提问关于 {name} 的问题时，使用 task 工具委派给 profile_agent。`,
  memory: ["./data/AGENTS.md"],        // profile 摘要作为长期记忆
  tools: [readProfileTool],            // 读取完整 profile 的工具
  subagents: [
    decisionAgent,
    profileAgent,
  ],
  checkpointer: sqliteCheckpointer,    // 会话持久化
});
```

### 4.4 子 Agent 定义

#### Decision Agent（抉择分析）

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const decisionAgent: SubAgent = {
  name: "decision_agent",
  description: "分析人生抉择，基于用户的价值观和目标给出结构化利弊分析和建议",
  middleware: [
    createDecisionMiddleware(),         // 注入决策上下文到 Agent state
  ],
};

// Decision Middleware: 将 values/goals/decisions_context 注入 Agent 状态
function createDecisionMiddleware() {
  return createMiddleware({
    name: "DecisionContextMiddleware",
    stateSchema: z.object({
      values: z.array(z.string()).default([]),
      current_goal: z.string().default(""),
      decisions_context: z.string().default(""),
    }),
  });
}
```

#### Profile Agent（简历页问答）

```typescript
const profileAgent: SubAgent = {
  name: "profile_agent",
  description: "代表用户回答访客关于职业、技能、经历的问题",
  middleware: [
    createProfileMiddleware(),          // 注入公开 profile 到 Agent state
  ],
};

// Profile Middleware: 将过滤后的公开信息注入 Agent 状态
function createProfileMiddleware() {
  return createMiddleware({
    name: "ProfileContextMiddleware",
    stateSchema: z.object({
      public_profile: z.record(z.any()).default({}),
    }),
  });
}
```

### 4.5 自定义 Tools

#### read_profile — 读取完整个人信息

```typescript
const readProfileTool = tool(async ({ section }, runConfig) => {
  const profile = getProfile();         // 从 profile.json 读取
  if (section && profile[section]) {
    return JSON.stringify(profile[section]);
  }
  return JSON.stringify(profile);
}, {
  name: "read_profile",
  description: "读取用户的个人信息。可指定 section: basic/experiences/skills/values/current_goals/decisions_context",
  schema: z.object({
    section: z.string().optional().describe("要读取的 section 名称"),
  }),
});
```

#### save_decision — 保存决策记录

```typescript
const saveDecisionTool = tool(async ({ question, analysis }) => {
  const id = crypto.randomUUID();
  saveDecisionToDB(id, question, analysis);
  return `决策已保存，ID: ${id}`;
}, {
  name: "save_decision",
  description: "保存一次决策分析结果，供未来回顾",
  schema: z.object({
    question: z.string().describe("用户的抉择问题"),
    analysis: z.string().describe("AI 的完整分析"),
  }),
});
```

#### query_decisions — 查询历史决策

```typescript
const queryDecisionsTool = tool(async ({ keyword }) => {
  const decisions = keyword
    ? searchDecisionsByKeyword(keyword)
    : getRecentDecisions(10);
  return JSON.stringify(decisions);
}, {
  name: "query_decisions",
  description: "查询历史决策记录，可按关键词搜索",
  schema: z.object({
    keyword: z.string().optional().describe("搜索关键词"),
  }),
});
```

#### filter_public_info — 过滤公开信息

```typescript
const filterPublicInfoTool = tool(async ({ query }) => {
  const publicProfile = getPublicProfile();  // 按 visibility 过滤
  return JSON.stringify(publicProfile);
}, {
  name: "filter_public_info",
  description: "获取用户公开可见的个人信息（已过滤 private 字段），用于回答访客问题",
  schema: z.object({
    query: z.string().optional().describe("访客的具体问题，用于定向提取相关信息"),
  }),
});
```

### 4.6 Agent 执行流程

#### 人生抉择流程

```
用户: "我在考虑是否要从大厂跳槽去创业公司"
  │
  ▼
主 Agent (Personal Agent)
  ├─ 识别为抉择类问题 → 调用 task("decision_agent", ...)
  │
  ▼
Decision Agent
  ├─ 读取 values: ["自主性", "持续学习", "有影响力的工作"]
  ├─ 读取 current_goals: "在 AI 方向深耕，寻找 0-1 产品机会"
  ├─ 读取 decisions_context: "..."
  ├─ 调用 read_profile("experiences") 了解工作背景
  ├─ 分析利弊 → 生成 DecisionAnalysis
  ├─ 调用 save_decision 保存记录
  └─ 返回结构化分析
  │
  ▼
主 Agent → 将结果返回给前端
```

#### 简历页对话流程

```
访客: "你最擅长什么技术方向？"
  │
  ▼
主 Agent (Personal Agent)
  ├─ 识别为访客提问 → 调用 task("profile_agent", ...)
  │
  ▼
Profile Agent
  ├─ 调用 filter_public_info 获取公开信息
  ├─ 基于 skills: React(0.92), Node.js(0.88)...
  ├─ 基于 experiences: 全栈开发经历...
  └─ 返回自然语言回答
  │
  ▼
主 Agent → 将结果返回给前端
```

### 4.7 结构化输出（抉择分析）

Decision Agent 使用 DeepAgents 的 `responseFormat` 强制结构化输出：

```typescript
import { toolStrategy } from "langchain";

const decisionAnalysisSchema = z.object({
  pros: z.array(z.string()).describe("该选择的利"),
  cons: z.array(z.string()).describe("该选择的弊"),
  alignment: z.number().min(0).max(100).describe("与用户价值观的匹配度"),
  summary: z.string().describe("综合建议"),
});

// 在创建抉择子 Agent 时使用
const structuredDecisionAgent = createDeepAgent({
  systemPrompt: "你是人生决策顾问...",
  responseFormat: toolStrategy(decisionAnalysisSchema),
  // ...
});
```

### 4.8 记忆与持久化

| 层次 | 机制 | 用途 |
|------|------|------|
| Agent Memory | `memory: ["./data/AGENTS.md"]` | profile 摘要注入 system prompt，跨会话 |
| 会话持久化 | LangGraph Checkpointer (SQLite) | 多轮对话状态保存，重启可恢复 |
| 决策历史 | `save_decision` Tool + SQLite | 决策记录持久化，可回顾查询 |
| 上下文压缩 | DeepAgents 内置 summarization middleware | 长对话自动压缩，防 context window 溢出 |

**AGENTS.md**（由 profile.json 自动生成或用户手动编写）：

```markdown
# Personal Agent Memory

## 基本信息
- 姓名：张三
- 职位：全栈工程师
- 所在城市：上海
- 简介：热爱开源，专注 AI 应用开发

## 核心价值观
- 自主性
- 持续学习
- 有影响力的工作

## 当前目标
在 AI 方向深耕，寻找 0-1 产品机会

## 工作经历
- 某公司 (2022-至今): 高级工程师，主导核心服务重构
- Tech Startup (2018-2022): 后端开发

## 核心技能
- React (92%), Node.js (88%), Python/ML (85%)
```

## 5. 数据模型

### 5.1 ProfileData（用户个人信息）

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
  highlights?: string[];
  reason_for_leaving?: string;      // 仅供 Agent 回答，不公开
  active?: boolean;
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
  bio: string;
  contact?: ContactInfo;
  currentFocus: {
    title: string;
    description: string;
    stats: { label: string; value: string | number; highlight?: boolean }[];
  };
  skills: Skill[];
  experiences: Experience[];
  recentDynamics: DynamicLog[];
  values: string[];
  current_goals: string;
  decisions_context: string;
}
```

### 5.2 DecisionAnalysis

```typescript
interface DecisionAnalysis {
  pros: string[];
  cons: string[];
  alignment: number;                // 0-100 匹配度评分
  summary: string;
}
```

### 5.3 SQLite 表结构

```sql
-- 决策历史
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  analysis TEXT NOT NULL,           -- DecisionAnalysis JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- LangGraph Checkpointer 使用 SQLite 持久化 Agent 状态
-- 由 @langchain/langgraph-checkpoint-sqlite 自动管理
```

### 5.4 错误码定义

| 错误码 | 含义 | 场景 |
|--------|------|------|
| 400 | 请求参数错误 | 缺少必填字段 |
| 404 | 资源未找到 | profile.json 不存在、用户不存在 |
| 422 | 数据格式错误 | profile.json 解析失败 |
| 500 | 服务内部错误 | Agent 调用失败、数据库异常 |

## 6. 接口设计

### 6.1 获取个人信息

- **URL**：`GET /api/profile`
- **描述**：返回完整个人信息，供 Dashboard 使用
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

### 6.2 获取公开个人信息

- **URL**：`GET /api/profile/[username]`
- **描述**：返回过滤后的公开信息，供简历页使用
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | URL 路径参数 |

- **过滤规则**：
  - `contact.visibility === "private"` 时，不返回 contact 字段
  - `experience.visibility === "private"` 时，不返回该条经历
  - `reason_for_leaving` 不在公开接口返回
  - `values`、`current_goals`、`decisions_context`、`currentFocus`、`recentDynamics` 不在公开接口返回

### 6.3 Agent 对话（统一入口）

- **URL**：`POST /api/agent`
- **描述**：与 Personal Agent 对话的统一入口，Agent 自动路由到对应子 Agent
- **请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户/访客消息 |
| thread_id | string | 否 | LangGraph thread ID，用于多轮对话持久化 |
| mode | string | 否 | `"decision"` / `"profile"` / `"auto"`，默认 auto |

- **请求示例**：

```json
{
  "message": "我在考虑是否要从大厂跳槽去创业公司",
  "thread_id": "thread_abc123",
  "mode": "auto"
}
```

- **响应（流式 SSE）**：

```
event: metadata
data: {"thread_id": "thread_abc123", "mode": "decision"}

event: token
data: {"content": "基于"}

event: token
data: {"content": "你的价值观和目标"}

event: tool_call
data: {"tool": "read_profile", "args": {"section": "experiences"}}

event: tool_result
data: {"tool": "read_profile", "result": "..."}

event: token
data: {"content": "## 利弊分析\n\n### 留在大厂\n**利**：..."}

event: end
data: {"structured_response": {"pros": [...], "cons": [...], "alignment": 72, "summary": "..."}}
```

### 6.4 获取决策历史

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

### 6.5 获取决策详情

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

### 6.6 保存个人信息

- **URL**：`PUT /api/profile`
- **描述**：保存编辑后的个人信息到 profile.json，同时重新生成 AGENTS.md
- **请求参数**：完整的 ProfileData 对象
- **响应示例**：

```json
{
  "code": 0,
  "data": { "message": "Profile saved successfully" }
}
```

## 7. 页面结构与交互逻辑

### 7.1 全局布局

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

### 7.2 Dashboard

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

### 7.3 人生抉择器

**页面结构**（沿用现有双栏布局）：
- 左侧 Context Sidebar（320px）：核心价值观标签、当前目标、最近决策
- 右侧 Chat Workspace（flex-1）：对话界面，AI 返回结构化分析卡片

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 提交抉择 | 点击发送 / Enter | 显示 loading，流式调用 Agent | `POST /api/agent` (mode=decision) |
| 追问 | 在已有结果上继续输入 | 同一 thread_id 继续对话 | `POST /api/agent` |
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
| 分析中 | 输入禁用 + 流式输出 | Agent 生成中 |
| 分析完成 | 结构化分析卡片 | Agent 返回 |
| 分析失败 | 错误提示 + 重试 | Agent 调用失败 |

### 7.4 简历页

**页面结构**（沿用现有 PublicProfileView）：
- 头部：头像（带 Active 脉冲动画）、姓名、"Agent Active" 徽章、职位、简介、技能标签
- 主体：AI 对话窗口（聊天气泡）
- 底部：3 个建议问题按钮 + 重置对话按钮

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 页面加载 | 进入 `/public-profile` | 加载公开信息，渲染头部 + 对话窗口 | `GET /api/profile` |
| 发送消息 | 输入 + 点击发送 | 用户气泡 → 流式 AI 回复 | `POST /api/agent` (mode=profile) |
| 点击建议 | 点击预设问题按钮 | 自动填入并发送 | `POST /api/agent` |
| 重置对话 | 点击重置按钮 | 生成新 thread_id，清空对话 | 无 |

**状态定义**：

| 状态 | 表现 | 条件 |
|------|------|------|
| 加载中 | 骨架屏 | 信息请求中 |
| 正常 | 头部 + 对话窗口 | 数据加载成功 |
| 对话中 | 流式 AI 回复 | Agent 生成中 |
| 用户不存在 | 404 页面 | username 未找到 |

### 7.5 数据编辑器

**页面结构**（沿用现有 DataEditorView）：
- Basic Info 表单：agent_name、role、bio_summary（带 public/private 开关）
- Capabilities & Skills：技能标签编辑器
- Raw JSON Source：textarea 显示完整 JSON

**交互逻辑**：

| 操作 | 触发条件 | 系统响应 | API 调用 |
|------|----------|----------|----------|
| 页面加载 | 进入 `/data-editor` | 加载 profile，填充表单 | `GET /api/profile` |
| 保存 | 点击 "Commit to Disk" | 提交保存，重新生成 AGENTS.md | `PUT /api/profile` |
| 丢弃 | 点击 "Discard Changes" | 重置表单为原始数据 | 无 |

## 8. 核心模块设计

### 8.1 Agent Runtime（server/agent/）

```typescript
// server/agent/index.ts — Agent 工厂
export function createPersonalAgent(config: {
  profilePath: string;
  llmProvider: string;
  llmModel: string;
  dbPath: string;
}) {
  // 加载 profile 作为 memory
  // 创建 checkpointer (SQLite)
  // 注册自定义 tools
  // 定义子 agents
  // 返回 createDeepAgent(...)
}
```

### 8.2 Profile 读取与过滤（server/lib/profile.ts）

```typescript
function getProfile(): ProfileData;
function getPublicProfile(username: string): Partial<ProfileData>;
function saveProfile(profile: ProfileData): void;
function generateAgentsMd(profile: ProfileData): string;  // 生成 AGENTS.md
```

**过滤逻辑**：
- 遍历 `experiences`，过滤 `visibility === "private"` 的条目
- 检查 `contact.visibility`，private 时移除
- 移除 `reason_for_leaving`、`values`、`current_goals`、`decisions_context`、`currentFocus`、`recentDynamics`

### 8.3 数据库操作层（server/lib/db.ts）

```typescript
function initDB(): void;
function saveDecision(id: string, question: string, analysis: DecisionAnalysis): void;
function getDecisions(): DecisionRecord[];
function getDecisionById(id: string): DecisionRecord | null;
function searchDecisionsByKeyword(keyword: string): DecisionRecord[];
```

### 8.4 前端 API Client（src/services/api.ts）

替换现有 `gemini.ts` 的直接调用，改为统一的后端 API Client：

```typescript
const API_BASE = "/api";

async function fetchProfile(): Promise<ProfileData>;
async function saveProfile(profile: ProfileData): Promise<void>;

// Agent 对话 — 返回 ReadableStream (SSE)
function streamAgentChat(message: string, options?: {
  threadId?: string;
  mode?: "decision" | "profile" | "auto";
}): { stream: ReadableStream; threadId: string };

async function fetchDecisions(): Promise<DecisionRecord[]>;
async function fetchDecisionById(id: string): Promise<DecisionRecord>;
```

## 9. 目录结构

```
personal-agent/
├── src/                            # 前端代码（Vite 构建）
│   ├── main.tsx
│   ├── App.tsx                     # 路由定义
│   ├── index.css                   # Tailwind v4 主题 + 全局样式
│   ├── constants.ts                # 默认 profile 数据（fallback）
│   ├── types.ts                    # 类型定义
│   ├── components/
│   │   ├── Layout.tsx              # 全局布局
│   │   ├── Sidebar.tsx             # 侧边栏导航
│   │   └── TopBar.tsx              # 顶栏
│   ├── views/
│   │   ├── DashboardView.tsx       # 看板页
│   │   ├── DecisionMakerView.tsx   # 人生抉择器
│   │   ├── PublicProfileView.tsx   # 简历页
│   │   └── DataEditorView.tsx      # 数据编辑器
│   └── services/
│       └── api.ts                  # 后端 API Client (SSE streaming)
├── server/                         # 后端代码
│   ├── index.ts                    # Express 入口 + 静态文件托管
│   ├── agent/                      # ★ Agent 核心
│   │   ├── index.ts                # Agent 工厂 (createPersonalAgent)
│   │   ├── tools/                  # 自定义 Tools
│   │   │   ├── read-profile.ts     # 读取 profile
│   │   │   ├── save-decision.ts    # 保存决策
│   │   │   ├── query-decisions.ts  # 查询历史决策
│   │   │   └── filter-public.ts    # 过滤公开信息
│   │   └── subagents/              # 子 Agent 定义
│   │       ├── decision-agent.ts   # 抉择分析 Agent
│   │       └── profile-agent.ts    # 简历问答 Agent
│   ├── routes/
│   │   ├── profile.ts              # GET/PUT /api/profile
│   │   ├── agent.ts                # POST /api/agent (SSE streaming)
│   │   └── decisions.ts            # GET /api/decisions
│   └── lib/
│       ├── db.ts                   # SQLite 操作
│       └── profile.ts              # profile.json 读写与过滤
├── data/
│   ├── profile.json                # 用户个人信息
│   ├── profile.example.json        # 示例文件
│   └── AGENTS.md                   # Agent Memory (自动生成)
├── public/
│   └── avatar.jpg
├── vite.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── prd.md
├── design.md
└── README.md
```

## 10. 关键配置文件

### 10.1 .env.example

```env
# LLM Provider & Model (LangChain init_chat_model 格式)
# 格式: provider:model_name
LLM_MODEL=anthropic:claude-sonnet-4-5-20250929

# API Keys (按需填写)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# Ollama (本地模型)
# LLM_MODEL=ollama:llama3.2
# OLLAMA_BASE_URL=http://localhost:11434

# Server
PORT=3001
```

### 10.2 vite.config.ts（开发代理）

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

### 10.3 package.json scripts

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

## 11. 边界场景处理

| 场景 | 处理方式 |
|------|----------|
| profile.json 不存在 | Dashboard 显示引导提示；Agent 首次调用 read_profile 时返回空，提示用户编辑 |
| profile.json 格式错误 | 返回 422 + 提示检查 JSON |
| LLM 调用超时 | 前端显示超时 + 重试；DeepAgents 内置重试机制 |
| Agent 循环调用 | DeepAgents 内置 max_iterations 限制，超出自动停止 |
| 访客提问超出信息边界 | filter_public_info 工具不返回 private 数据，Agent 无法泄露 |
| 访客提问无关问题 | Profile Agent 的 system prompt 约束只回答职业相关问题 |
| 对话过长 | DeepAgents summarization middleware 自动压缩上下文 |
| Agent 异常中断 | LangGraph checkpointer 保存状态，可从断点恢复 |
| 前端 API 不可达 | 检测后端健康状态，显示"请确保 API 服务已启动" |

## 12. 安全设计

| 项目 | 策略 |
|------|------|
| API Key 保护 | .env 不入 Git，API Key 仅存后端，不暴露给前端 |
| Prompt 注入 | 对话输入限制 2000 字；Agent 在工具层做边界控制，不依赖 prompt 自我约束 |
| 信息泄露 | **安全边界在工具层**：`filter_public_info` 只返回 public 字段，Agent 物理上无法获取 private 数据 |
| 本地访问 | 默认仅监听 localhost，部署文档提醒用户注意访问控制 |
| Agent 权限 | DeepAgents "trust the LLM" 模型，工具粒度控制权限：Profile Agent 没有 save_decision 工具 |
| CORS | 开发模式仅允许 localhost:5173，生产模式无 CORS（同源） |

## 13. 性能考量

| 项目 | 策略 |
|------|------|
| profile.json 读取 | 启动时读取并缓存，文件变更时热更新（fs.watch） |
| Agent 流式响应 | LangGraph streaming + SSE，前端逐 token 渲染 |
| 上下文管理 | DeepAgents summarization middleware 自动压缩长对话 |
| 会话恢复 | SQLite checkpointer，重启后可恢复 Agent 状态 |
| 静态资源 | Vite 构建 + Express 托管，生产模式 gzip |
| SQLite | WAL 模式 + 单连接复用 |
| 前端动画 | motion AnimatePresence + 懒加载视图组件 |
