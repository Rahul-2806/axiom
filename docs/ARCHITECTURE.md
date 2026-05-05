# AXIOM — Architecture Deep Dive

## Overview

AXIOM is structured as a three-layer system:

1. **Orchestration Layer** — LangGraph state machine driven by AWS Bedrock Claude Opus 4.5
2. **Agent Layer** — Five domain specialists powered by Groq LLaMA 3.3 70B
3. **Memory Layer** — Three-tier MemoryOS (Redis → pgvector → NetworkX graph)

---

## Request Lifecycle

```
User sends message via WebSocket or REST

1. LOAD CONTEXT
   ↳ Redis: fetch last 20 messages (hot, sub-ms)
   ↳ pgvector: semantic search for relevant memories
   ↳ NetworkX: query knowledge graph

2. PLAN (Bedrock Claude Opus — orchestrator)
   ↳ Classifies intent
   ↳ Selects domain agents (1-5)
   ↳ Determines parallel vs. sequential execution

3. RUN AGENTS (Groq LLaMA 3.3 70B — parallel or sequential)
   ↳ Each agent gets: message + context + tools
   ↳ Agents emit tool calls via [TOOL:name:params] syntax
   ↳ Tool registry executes calls, injects results

4. SYNTHESIZE (Bedrock Claude Opus)
   ↳ If 1 agent: return directly (no synthesis overhead)
   ↳ If 2+ agents: synthesize into unified response

5. SAVE MEMORY
   ↳ Redis: append to session (hot)
   ↳ Supabase: persist to DB (warm)
   ↳ Graph: update entity relationships (cold)

6. STREAM TO CLIENT
   ↳ WebSocket events: plan → agent_start → tokens → complete
```

---

## LangGraph State

```python
OrchestratorState = {
    user_id:        str         # Supabase user ID
    session_id:     str         # Current conversation session
    run_id:         str         # Unique run identifier
    message:        str         # User's input
    context:        dict        # Loaded from MemoryOS
    plan:           dict        # Orchestrator's execution plan
    agent_results:  list        # Results from all agents (accumulated)
    final_output:   str         # Synthesized response
    status:         RunStatus   # Current state
    events:         list        # WS events to emit (accumulated)
    start_time:     float       # Unix timestamp
}
```

---

## MemoryOS Tiers

| Tier | Storage | Latency | Capacity | Use Case |
|------|---------|---------|----------|----------|
| Hot  | Redis   | <1ms    | ~50 msgs | Active session history |
| Warm | Supabase pgvector | 10-50ms | Unlimited | Long-term semantic memory |
| Cold | NetworkX (in-memory) | <5ms | Per-user | Entity relationships |

### Embedding Model
`all-MiniLM-L6-v2` (384 dimensions) — lightweight, runs locally, good quality.

### pgvector Search
HNSW index with cosine distance. Default threshold: 0.65 similarity.
Configured for M=16, ef_construction=64.

---

## Dynamic Tool Registry

Tools register themselves at module import time:

```python
tool_registry.register(
    name="web_search",
    description="Search the web",
    domain=AgentDomain.WEB,
    fn=_web_search,
    parameters={"query": "string"},
)
```

New tools can be added at runtime without restarts. The registry is:
- In-memory for fast lookup (O(1))
- Redis-cached for cross-process sharing
- Supabase-persisted for restart survival

---

## Agent Communication Protocol

Agents emit tool calls using structured syntax embedded in their text output:

```
[TOOL:tool_name:{"param": "value"}]
```

The `BaseAgent._process_tool_calls()` method detects these patterns using regex,
executes the corresponding async function from the registry, and substitutes the
result back into the output before returning.

This allows LLM outputs to naturally interleave reasoning with tool results.

---

## WebSocket Event Flow

```
Client                          AXIOM Backend
  │                                  │
  ├──── {"type": "chat", "message"} ─→
  │                                  │
  │ ←── {"type": "plan", "data": {...}}
  │ ←── {"type": "agent_start", "data": {"domain": "finance"}}
  │ ←── {"type": "agent_start", "data": {"domain": "research"}}
  │ ←── {"type": "agent_complete", "data": {"domain": "finance", ...}}
  │ ←── {"type": "agent_complete", "data": {"domain": "research", ...}}
  │ ←── {"type": "synthesis_token", "data": {"token": "Based"}}
  │ ←── {"type": "synthesis_token", "data": {"token": " on"}}
  │ ...
  │ ←── {"type": "complete", "data": {}}
```

---

## Security

- **Auth**: Supabase JWT validated on every request and WebSocket connection
- **RLS**: Row-level security isolates all user data in Supabase
- **Rate limiting**: Redis-based per-user rate limiting (100 req/min default)
- **CORS**: Restricted to configured origins
- **Code execution**: Python tool runs in subprocess with 10s timeout

---

## Deployment

### Backend → Hugging Face Spaces
Uses `Dockerfile.backend`. Port 7860. HF username: `RAHULSR2806`.
Space name: `RAHULSR2806/axiom-backend`.

### Frontend → Vercel
Standard Next.js deployment. Region: `bom1` (Mumbai, closest to Kollam).
Set env vars in Vercel dashboard matching `.env.local.example`.
