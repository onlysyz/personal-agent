# Personal Agent

An open-source personal AI assistant that runs locally. Powered by your own data, with configurable AI models.

## Features

- **Dashboard** — Overview of your profile, skills, experience, and current focus
- **Life Decision Maker** — Describe your dilemma, AI analyzes pros/cons based on your values and goals
- **Public Profile** — Share a page where visitors can chat with your AI agent to learn about you
- **Data Editor** — Edit your profile data via forms or raw JSON
- **Privacy First** — All data stored locally, API keys never leave your machine
- **Multi-LLM** — Supports OpenAI, Anthropic, Google Gemini, and local Ollama

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 + Framer Motion |
| Backend | Express + SQLite (better-sqlite3) |
| AI | Unified LLM interface (Gemini / OpenAI / Anthropic / Ollama) |
| Language | TypeScript |

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

Edit `.env` to select your AI provider:

```env
# Choose: gemini | openai | anthropic | ollama
LLM_PROVIDER=ollama

# Fill in as needed
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

## Project Structure

```
personal-agent/
├── src/                    # Frontend (Vite)
│   ├── views/              # Page components
│   ├── components/         # Layout, Sidebar, TopBar
│   └── services/           # API client
├── server/                 # Backend (Express)
│   ├── routes/             # API endpoints
│   └── lib/                # LLM, DB, profile logic
├── data/
│   └── profile.json        # Your personal data
├── design.md               # Design document
└── prd.md                  # Product requirements
```

## License

MIT
