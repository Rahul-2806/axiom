# AXIOM — Self-Orchestrating Multi-Domain AI OS

> *One brain. Infinite agents. Zero limits.*

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://axiom.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://axiom-backend.hf.space)
[![License](https://img.shields.io/badge/License-MIT-gold)](LICENSE)

---

## What is AXIOM?

AXIOM is a self-orchestrating multi-domain AI operating system. It dynamically spawns, routes, and coordinates specialized AI agents across domains — finance, code, research, web intelligence, and system operations — all from a single command center.

Unlike static AI assistants, AXIOM reasons about *which agent* to deploy, *in what sequence*, and *how to synthesize* their outputs into a unified response. It learns from every interaction, expanding its own tool registry and memory graph over time.

---

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────┐
│          AXIOM ORCHESTRATOR (LangGraph)          │
│   AWS Bedrock Claude (eu-north-1, Opus 4.5)     │
│   → Intent classification                        │
│   → Agent routing + parallelization             │
│   → Response synthesis                           │
└────────┬──────────┬──────────┬──────────┬───────┘
         │          │          │          │
    ┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
    │Finance │ │  Code  │ │Research│ │  Web   │
    │ Agent  │ │ Agent  │ │ Agent  │ │ Agent  │
    │(Groq)  │ │(Groq)  │ │(Groq)  │ │(Groq)  │
    └────────┘ └────────┘ └────────┘ └────────┘
         │          │          │          │
    ┌────▼──────────▼──────────▼──────────▼───────┐
    │              MEMORY OS                       │
    │   Supabase pgvector + Redis + Graph Store    │
    └──────────────────────────────────────────────┘
```

**Brain**: AWS Bedrock `eu.anthropic.claude-opus-4-5-20251101-v1:0` (orchestrator)  
**Sub-agents**: Groq LLaMA 3.3 70B (speed-optimized domain specialists)  
**Memory**: Supabase pgvector (long-term) + Redis (session/short-term) + NetworkX graph  
**Comms**: WebSocket (real-time streaming), FastAPI REST  
**Frontend**: Next.js 15 + D3.js agent visualization  
**Deploy**: Backend → Hugging Face Spaces | Frontend → Vercel  

---

## Domains

| Domain | Agent | Capabilities |
|--------|-------|--------------|
| 🏦 Finance | `FinanceAgent` | Market data, arbitrage, portfolio analysis, price forecasting |
| 💻 Code | `CodeAgent` | Code generation, review, debugging, PR analysis |
| 🔬 Research | `ResearchAgent` | Web research, paper analysis, summarization, fact-checking |
| 🌐 Web | `WebAgent` | Scraping, monitoring, news aggregation, trend detection |
| ⚙️ System | `SystemAgent` | File ops, scheduling, notifications, workflow automation |

---

## Stack

### Backend
- **FastAPI** — REST + WebSocket API
- **LangGraph** — Stateful multi-agent orchestration
- **AWS Bedrock** — Claude Opus 4.5 (orchestrator brain)
- **Groq** — LLaMA 3.3 70B (sub-agent inference)
- **Redis** — Session memory, pub/sub, rate limiting
- **Supabase** — pgvector embeddings, auth, persistent storage
- **Docker** — Containerized deployment

### Frontend
- **Next.js 15** — App router, server components
- **D3.js** — Live agent graph visualization
- **Tailwind CSS** — Utility-first styling
- **Supabase Auth** — Authentication
- **Zustand** — Client state management
- **Framer Motion** — Animations

---

## Project Structure

```
axiom/
├── backend/
│   ├── agents/           # Domain-specific agents
│   │   ├── finance/      # FinanceAgent
│   │   ├── code/         # CodeAgent
│   │   ├── research/     # ResearchAgent
│   │   ├── web/          # WebAgent
│   │   └── system/       # SystemAgent
│   ├── core/
│   │   ├── orchestrator/ # LangGraph orchestration engine
│   │   ├── memory/       # MemoryOS (graph + vector + session)
│   │   ├── tools/        # Shared tool implementations
│   │   └── registry/     # Dynamic tool/agent registry
│   ├── api/
│   │   ├── routes/       # FastAPI route handlers
│   │   ├── middleware/   # Auth, logging, rate limiting
│   │   └── websocket/    # Real-time WS handlers
│   ├── db/
│   │   ├── migrations/   # Supabase SQL migrations
│   │   └── models/       # Pydantic models
│   └── services/         # External service clients
│       ├── bedrock/      # AWS Bedrock client
│       ├── groq/         # Groq client
│       ├── redis/        # Redis client
│       └── supabase/     # Supabase client
├── frontend/
│   ├── app/              # Next.js 15 app router
│   │   ├── auth/         # Login/signup pages
│   │   ├── dashboard/    # Main AXIOM command center
│   │   ├── agents/       # Agent management UI
│   │   ├── memory/       # Memory graph explorer
│   │   └── settings/     # API keys, preferences
│   ├── components/       # React components
│   ├── lib/              # Utilities, hooks, store
│   └── public/           # Static assets
├── infrastructure/
│   ├── docker/           # Dockerfiles
│   ├── nginx/            # Nginx config
│   └── scripts/          # Setup/deploy scripts
└── docs/                 # Architecture docs
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- AWS credentials (Bedrock, eu-north-1)
- Groq API key
- Supabase project
- Redis instance (Upstash recommended)

### 1. Clone & Install

```bash
git clone https://github.com/RAHULSR2806/axiom.git
cd axiom
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Copy env
cp .env.example .env
# Fill in your keys (see Environment Variables section)

# Run migrations
python -m db.migrations.run

# Start
uvicorn api.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in Supabase + backend URL

npm run dev
```

### 4. Docker (Full Stack)

```bash
docker-compose up --build
```

---

## Environment Variables

### Backend `.env`

```env
# AWS Bedrock
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-north-1
BEDROCK_MODEL_ID=eu.anthropic.claude-opus-4-5-20251101-v1:0

# Groq
GROQ_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Redis
REDIS_URL=

# App
SECRET_KEY=
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Key Features

- **Dynamic Agent Factory** — Agents are spawned on-demand, not hardcoded
- **LangGraph Orchestration** — Stateful, conditional, parallel execution graphs
- **MemoryOS** — Three-tier memory: Redis (hot) → pgvector (warm) → graph (cold/relational)
- **Self-Expanding Registry** — New tools registered at runtime without restarts
- **Real-time Streaming** — WebSocket-based token streaming from all agents
- **D3 Agent Graph** — Live visualization of agent spawning and communication
- **Supabase Auth** — Row-level security, per-user memory isolation

---

## Roadmap

- [x] Project scaffold & architecture
- [ ] Core orchestrator (LangGraph)
- [ ] Agent factory + base agent class
- [ ] MemoryOS implementation
- [ ] Finance domain agent
- [ ] Code domain agent
- [ ] Research domain agent
- [ ] Web domain agent
- [ ] System domain agent
- [ ] WebSocket streaming
- [ ] Next.js command center UI
- [ ] D3 agent graph visualization
- [ ] Supabase Auth integration
- [ ] HF Spaces deployment
- [ ] Vercel deployment

---

## Author

**Rahul R** — Data Scientist & AI Engineer  
[rahulaiportfolio.online](https://rahulaiportfolio.online) · [GitHub](https://github.com/RAHULSR2806) · [LinkedIn](https://linkedin.com/in/rahulsr2806)

---

*AXIOM — Built to think at scale.*
