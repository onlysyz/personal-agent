# Personal Agent — PRD

## 概述

Personal Agent 是一个开源的私人 AI 助手项目，用户可在本地运行，AI 模型自由配置。它以结构化的个人信息为数据源，提供自我管理、辅助决策、以及对外展示三大核心功能。

## 目标用户

- 希望用 AI 管理和展示个人信息的个人开发者
- 求职者（将简历页分享给 HR 或面试官）
- 喜欢用 AI 辅助人生决策的用户

## 核心页面与功能

### 1. Dashboard（看板）

**目标**：让用户快速了解自己当前的状态全貌。

**内容模块（可配置显示/隐藏）**：
- 基本信息卡片：姓名、职位、所在城市、一句话简介
- 当前状态：当前在做什么、近期目标
- 工作时间线：过往工作经历概览
- 技能雷达图：核心技能可视化
- 近期动态：最近的项目、文章、开源贡献等

**数据来源**：用户本地编辑的 `profile.json`

---

### 2. 人生抉择器（Life Decision Maker）

**目标**：用户描述当前面临的选择，AI 结合用户个人背景给出有针对性的建议。

**交互流程**：
1. 用户输入当前抉择（文字描述，支持多轮追问）
2. AI 读取用户的个人信息（价值观、经历、目标）作为背景
3. AI 输出结构化分析：各选项的利弊、与用户目标的匹配度、最终建议
4. 支持追问和深入讨论

**关键设计**：
- AI 不是给一个"正确答案"，而是帮用户梳理自己的优先级
- 历史决策记录可保存，便于回顾

---

### 3. 简历页（Public Profile）

**目标**：对外分享的公开页面，访客可以通过 AI Agent 了解你。

**访问方式**：
- 本地运行时访问 `http://localhost:3000/[username]`
- 可通过内网穿透/部署分享给他人

**页面结构**：
- 顶部：静态个人信息展示（头像、姓名、职位、联系方式）
- 主体：AI 对话窗口，访客可以自由提问

**Agent 能回答的问题（示例）**：
- "你为什么从上家公司离职？"
- "你最擅长什么技术方向？"
- "你有哪些项目经验？"
- "你的职业规划是什么？"

**信息边界控制**：
- 用户可在 `profile.json` 中标记哪些字段为 `public` / `private`
- `private` 字段 Agent 不会向访客透露
- 敏感问题（如期望薪资）可配置为"请直接联系本人"

---

## 数据架构

所有个人数据存储在本地 `data/profile.json`，结构如下：

```json
{
  "basic": {
    "name": "张三",
    "title": "全栈工程师",
    "location": "上海",
    "bio": "热爱开源，专注 AI 应用开发",
    "avatar": "/avatar.jpg",
    "contact": {
      "email": "xxx@gmail.com",
      "github": "github.com/xxx",
      "visibility": "public"
    }
  },
  "experience": [
    {
      "company": "某公司",
      "role": "高级工程师",
      "period": "2022-2024",
      "reason_for_leaving": "寻求更有挑战性的机会",
      "highlights": ["主导重构了核心服务", "带领 5 人小组"],
      "visibility": "public"
    }
  ],
  "skills": ["React", "Node.js", "Python", "LLM应用开发"],
  "values": ["自主性", "持续学习", "有影响力的工作"],
  "current_goals": "在 AI 方向深耕，寻找 0-1 产品机会",
  "decisions_context": "可以在这里描述你的人生阶段、价值观排序等，供决策器使用"
}
```

---

## 技术架构

### 技术栈

| 层次 | 技术选型 | 理由 |
|------|----------|------|
| 前端框架 | Next.js 15 (App Router) | 全栈、易部署、生态好 |
| UI 组件 | Tailwind CSS + shadcn/ui | 美观、零配置 |
| 数据库 | SQLite (better-sqlite3) | 本地文件，无需安装服务 |
| AI 模型层 | 统一 LLM 接口 | 支持多 provider |
| 运行时 | Node.js | 本地直接跑 |

### 模型配置

通过 `.env` 文件一行切换模型：

```env
# 选择 provider: openai | anthropic | ollama
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

# 按需填写
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

### 目录结构

```
personal-agent/
├── app/
│   ├── page.tsx              # 重定向到 dashboard
│   ├── dashboard/page.tsx    # 看板
│   ├── decisions/page.tsx    # 人生抉择器
│   └── [username]/page.tsx   # 公开简历页
├── components/
│   ├── dashboard/
│   ├── decisions/
│   └── profile/
├── lib/
│   ├── llm.ts                # 统一模型调用层
│   ├── db.ts                 # SQLite 操作
│   └── profile.ts            # profile.json 读取与过滤
├── data/
│   └── profile.json          # 用户个人信息（本地编辑）
├── public/
├── .env.example
├── prd.md
└── README.md
```

---

## 本地启动流程（目标体验）

```bash
git clone https://github.com/xxx/personal-agent
cd personal-agent
cp .env.example .env        # 配置模型
cp data/profile.example.json data/profile.json  # 填写个人信息
npm install
npm run dev                  # 访问 http://localhost:3000
```

---

## 开发阶段规划

### Phase 1 — MVP
- [ ] 项目初始化（Next.js + Tailwind + shadcn）
- [ ] profile.json 数据结构定义
- [ ] 统一 LLM 接口层（支持 OpenAI / Anthropic / Ollama）
- [ ] Dashboard 基础版
- [ ] 简历页 Agent 对话功能
- [ ] 人生抉择器基础版

### Phase 2 — 完善
- [ ] Dashboard 可视化增强（技能雷达图、时间线）
- [ ] 决策历史记录
- [ ] 信息边界控制（public/private 字段）
- [ ] README + 部署文档

### Phase 3 — 生态
- [ ] profile.json 可视化编辑 UI（不用手写 JSON）
- [ ] 主题切换
- [ ] 多语言支持

---

## 非功能需求

- **隐私**：所有数据本地存储，不上传任何服务器
- **易用性**：clone 后 3 步跑起来
- **可扩展**：LLM 层解耦，方便接入新模型
- **开源协议**：MIT License
