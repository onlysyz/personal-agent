# Personal Agent

An open-source personal AI assistant that runs locally. Powered by your own data, with configurable AI models.

## Features

- **Dashboard** — Overview of your profile, skills, experience, and current focus
- **Life Decision Maker** — Describe your dilemma, AI analyzes pros/cons based on your values and goals
- **Public Profile** — Share a page where visitors can chat with your AI agent to learn about you
- **Data Editor** — Edit your profile data via forms or raw JSON
- **Privacy First** — All data stored locally, API keys never leave your machine
- **Multi-LLM** — Supports OpenAI, Anthropic, Google Gemini, and local Ollama
- **Agent Memory** — Persistent cross-session memory via AGENTS.md

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 + Framer Motion |
| Backend | Express + SQLite (better-sqlite3) |
| AI Runtime | DeepAgents (LangChain) + LangGraph |
| Language | TypeScript |

## Agent Architecture

The agent runtime is built on [DeepAgents](https://github.com/langchain-ai/deepagents), a LangChain-powered agent harness:

```
┌─────────────────────────────────────────────────────┐
│                  Personal Agent                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Planner   │  │   Tools     │  │   Memory    │ │
│  │  (todo等)   │  │read_profile │  │ AGENTS.md  │ │
│  │             │  │save_decision│  │   SQLite    │ │
│  │             │  │query_decision│ │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                        │                            │
│              ┌─────────┴─────────┐                 │
│              │  Sub-Agents       │                 │
│              │ Decision Agent     │                 │
│              │ Profile Agent      │                 │
│              └───────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

**Tools**:
- `read_profile` — Read personal profile data
- `save_decision` — Save decision analysis to SQLite
- `query_decisions` — Query historical decisions
- `filter_public_info` — Filter sensitive information

**Memory**:
- SQLite for decision history persistence
- AGENTS.md for cross-session agent context
- MemorySaver checkpointer for session continuity

## Quick Start

```bash
git clone https://github.com/onlysyz/personal-agent.git
cd personal-agent
cp .env.example .env              # Configure your AI model
cp data/profile.example.json data/profile.json  # Fill in your info
npm install
npm run dev                       # Visit http://localhost:5173
```

## Configuration

Edit `.env` to configure your AI provider and model:

```env
# LLM Model (format: provider:model_name)
LLM_MODEL=anthropic:claude-sonnet-4-5-20250929

# API Keys (fill as needed)
ANTHROPIC_API_KEY=sk-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=
```

**Supported Providers**:
- `anthropic:claude-sonnet-4-5-20250929` (default)
- `openai:gpt-4o`
- `openai:gpt-4o-mini`
- `ollama:llama3.2` (requires local Ollama)

## Project Structure

```
personal-agent/
├── src/                    # Frontend (Vite + React 19)
│   ├── views/              # Page components (Dashboard, DecisionMaker, etc.)
│   ├── components/         # Layout, Sidebar, TopBar
│   └── services/           # API client
├── server/                 # Backend (Express)
│   ├── routes/             # API endpoints
│   │   ├── agent.ts        # POST /api/agent (SSE streaming)
│   │   ├── decisions.ts     # Decision CRUD
│   │   └── profile.ts      # Profile management
│   ├── agent/              # DeepAgents runtime
│   │   ├── index.ts        # Agent factory
│   │   ├── tools/          # Custom tools
│   │   └── subagents/      # Sub-agent prompts
│   └── lib/                # Utilities (profile, db)
├── data/
│   ├── profile.json        # Personal data
│   └── decisions.db        # SQLite decision history
├── design.md               # Design document
└── prd.md                  # Product requirements
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/profile` | GET/PUT | Get or update profile |
| `/api/agent` | POST | Chat with AI (SSE streaming) |
| `/api/decisions` | GET | List decision history |

### Agent SSE Streaming

```bash
curl -N -X POST http://localhost:3001/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"Should I join a startup or big tech?", "mode": "decision"}'
```

## License

MIT
