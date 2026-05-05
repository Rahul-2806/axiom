"""
AXIOM — LangGraph Orchestrator
The central brain: classifies intent, routes to agents, runs parallel/sequential
execution, synthesizes outputs into a unified response.
Brain: AWS Bedrock Claude Opus 4.5
"""
import time
import json
import uuid
import asyncio
from typing import TypedDict, Annotated, AsyncGenerator
import operator
from langgraph.graph import StateGraph, END
import structlog

from services.bedrock.client import bedrock_client
from services.groq.client import groq_client
from core.memory.memory_os import get_memory
from db.models.schemas import (
    AgentDomain, AgentResult, OrchestratorPlan,
    ChatResponse, RunStatus, WSEvent, WSEventType
)

log = structlog.get_logger(__name__)


# ── Agent Factory ─────────────────────────────────────────────

def _get_agent(domain: AgentDomain):
    """Lazy import agents to avoid circular dependencies."""
    if domain == AgentDomain.FINANCE:
        from agents.finance.agent import FinanceAgent
        return FinanceAgent()
    elif domain == AgentDomain.CODE:
        from agents.code.agent import CodeAgent
        return CodeAgent()
    elif domain == AgentDomain.RESEARCH:
        from agents.research.agent import ResearchAgent
        return ResearchAgent()
    elif domain == AgentDomain.WEB:
        from agents.web.agent import WebAgent
        return WebAgent()
    elif domain == AgentDomain.SYSTEM:
        from agents.system.agent import SystemAgent
        return SystemAgent()
    raise ValueError(f"Unknown domain: {domain}")


# ── Graph State ────────────────────────────────────────────────

class OrchestratorState(TypedDict):
    user_id: str
    session_id: str
    run_id: str
    message: str
    context: dict
    plan: dict
    agent_results: Annotated[list, operator.add]
    final_output: str
    status: str
    events: Annotated[list, operator.add]
    start_time: float


# ── Graph Nodes ────────────────────────────────────────────────

async def node_load_context(state: OrchestratorState) -> dict:
    """Load session memory and context from MemoryOS."""
    memory = get_memory(state["user_id"])
    context = await memory.get_session_context(
        session_id=state["session_id"],
        include_memories=True,
        query=state["message"],
    )
    return {
        "context": context,
        "status": RunStatus.ROUTING,
        "events": [{
            "type": WSEventType.CONNECTED,
            "data": {"message": "Context loaded, planning execution..."}
        }]
    }


async def node_plan(state: OrchestratorState) -> dict:
    """
    Orchestrator brain (Bedrock Claude Opus) classifies intent
    and produces an execution plan: which agents, parallel or sequential.
    """
    system = """You are AXIOM's orchestrator. Analyze the user query and produce an execution plan.

Available agents:
- finance: stock/crypto prices, market analysis, portfolio, arbitrage
- code: programming, debugging, architecture, DevOps, code review
- research: web research, academic papers, fact-checking, knowledge synthesis
- web: web scraping, news monitoring, URL analysis, trend detection
- system: file operations, scheduling, notifications, automation

Respond with ONLY valid JSON (no markdown):
{
  "intent": "brief description of what the user wants",
  "domains": ["domain1", "domain2"],
  "parallel": true,
  "reasoning": "why these agents"
}

Rules:
- Select minimum necessary agents
- Use parallel=true if agents are independent
- Use parallel=false if later agents need earlier results
- Always include at least one domain"""

    messages = [{"role": "user", "content": state["message"]}]

    try:
        raw = await bedrock_client.invoke(
            messages=messages,
            system=system,
            max_tokens=512,
            temperature=0.3,
        )
        plan_data = json.loads(raw.strip())
        plan = OrchestratorPlan(
            intent=plan_data.get("intent", ""),
            domains=[AgentDomain(d) for d in plan_data.get("domains", ["research"])],
            parallel=plan_data.get("parallel", True),
            reasoning=plan_data.get("reasoning", ""),
        )
    except Exception as e:
        log.error("orchestrator_plan_failed", error=str(e))
        # Smart fallback based on keywords
        msg_lower = state["message"].lower()
        if any(w in msg_lower for w in ["code", "write", "build", "implement", "function", "class", "api", "python", "javascript", "typescript", "sql", "debug", "fix", "error", "program", "script", "website", "flask", "fastapi", "react", "next"]):
            fallback_domain = AgentDomain.CODE
        elif any(w in msg_lower for w in ["price", "stock", "crypto", "bitcoin", "ethereum", "market", "trade", "portfolio", "finance", "invest"]):
            fallback_domain = AgentDomain.FINANCE
        elif any(w in msg_lower for w in ["scrape", "website", "url", "news", "trending", "monitor"]):
            fallback_domain = AgentDomain.WEB
        else:
            fallback_domain = AgentDomain.RESEARCH
        plan = OrchestratorPlan(
            intent=state["message"][:100],
            domains=[fallback_domain],
            parallel=True,
            reasoning=f"Keyword-based routing to {fallback_domain.value}.",
        )

    log.info("plan_created", domains=[d.value for d in plan.domains], parallel=plan.parallel)

    return {
        "plan": plan.model_dump(),
        "status": RunStatus.RUNNING,
        "events": [{
            "type": WSEventType.PLAN,
            "data": {
                "intent": plan.intent,
                "domains": [d.value for d in plan.domains],
                "parallel": plan.parallel,
                "reasoning": plan.reasoning,
            }
        }]
    }


async def node_run_agents(state: OrchestratorState) -> dict:
    """Run domain agents — parallel or sequential based on plan."""
    plan = state["plan"]
    domains = [AgentDomain(d) for d in plan["domains"]]
    parallel = plan.get("parallel", True)

    events = []
    results = []

    for domain in domains:
        events.append({
            "type": WSEventType.AGENT_START,
            "data": {"domain": domain.value}
        })

    if parallel:
        # Run all agents simultaneously — AXIOM's superpower
        tasks = [
            _run_single_agent(domain, state["message"], state["context"])
            for domain in domains
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        results = [
            r if isinstance(r, AgentResult) else AgentResult(
                domain=domains[i], output="", success=False,
                error=str(results[i])
            )
            for i, r in enumerate(results)
        ]
    else:
        # Sequential: each agent builds on previous results
        accumulated_context = dict(state["context"])
        for domain in domains:
            result = await _run_single_agent(domain, state["message"], accumulated_context)
            results.append(result)
            # Inject previous output into context for next agent
            accumulated_context["previous_agent_output"] = result.output

    for result in results:
        events.append({
            "type": WSEventType.AGENT_COMPLETE,
            "data": {
                "domain": result.domain.value,
                "success": result.success,
                "duration_ms": result.duration_ms,
                "tools_used": result.tools_used,
            }
        })

    return {
        "agent_results": [r.model_dump() for r in results],
        "status": RunStatus.SYNTHESIZING,
        "events": events,
    }


async def _run_single_agent(
    domain: AgentDomain, message: str, context: dict
) -> AgentResult:
    agent = _get_agent(domain)
    return await agent.run(message=message, context=context)


async def node_synthesize(state: OrchestratorState) -> dict:
    """
    Orchestrator brain synthesizes all agent outputs into one
    coherent, unified response.
    """
    results = state["agent_results"]

    if len(results) == 1 and results[0].get("success"):
        # Single agent: return directly without synthesis overhead
        return {
            "final_output": results[0]["output"],
            "status": RunStatus.COMPLETE,
            "events": [{"type": WSEventType.COMPLETE, "data": {}}]
        }

    # Multi-agent: synthesize
    agent_outputs = "\n\n".join(
        f"=== {r['domain'].upper()} AGENT ===\n{r['output']}"
        for r in results if r.get("success") and r.get("output")
    )

    system = """You are AXIOM's synthesis engine. Multiple specialized AI agents have responded to the user's query.
Synthesize their outputs into ONE unified, coherent response.

Rules:
- Combine insights naturally — do not reference the individual agents by name
- Eliminate redundancy
- Maintain all key data points, code blocks, and citations
- Use the most appropriate format (markdown, tables, code blocks)
- Be comprehensive but not verbose
- Lead with the most directly useful information"""

    messages = [
        {"role": "user", "content": f"User query: {state['message']}\n\nAgent outputs:\n{agent_outputs}"}
    ]

    final_output = await bedrock_client.invoke(
        messages=messages,
        system=system,
        max_tokens=4096,
        temperature=0.5,
    )

    return {
        "final_output": final_output,
        "status": RunStatus.COMPLETE,
        "events": [{"type": WSEventType.COMPLETE, "data": {}}]
    }


async def node_save_memory(state: OrchestratorState) -> dict:
    try:
        memory = get_memory(state["user_id"])
        await memory.save_message(
            session_id=state["session_id"], role="user", content=state["message"]
        )
        await memory.save_message(
            session_id=state["session_id"], role="assistant", content=state["final_output"]
        )
    except Exception:
        pass
    return {}

# ── Build Graph ────────────────────────────────────────────────

def build_orchestrator() -> StateGraph:
    graph = StateGraph(OrchestratorState)

    graph.add_node("load_context", node_load_context)
    graph.add_node("plan", node_plan)
    graph.add_node("run_agents", node_run_agents)
    graph.add_node("synthesize", node_synthesize)
    graph.add_node("save_memory", node_save_memory)

    graph.set_entry_point("load_context")
    graph.add_edge("load_context", "plan")
    graph.add_edge("plan", "run_agents")
    graph.add_edge("run_agents", "synthesize")
    graph.add_edge("synthesize", "save_memory")
    graph.add_edge("save_memory", END)

    return graph.compile()


# Compiled graph singleton
orchestrator = build_orchestrator()


# ── Public Interface ───────────────────────────────────────────

async def run_axiom(
    message: str,
    user_id: str,
    session_id: str,
) -> ChatResponse:
    """Execute a full AXIOM run and return the complete response."""
    run_id = str(uuid.uuid4())
    start = time.time()

    initial_state = OrchestratorState(
        user_id=user_id,
        session_id=session_id,
        run_id=run_id,
        message=message,
        context={},
        plan={},
        agent_results=[],
        final_output="",
        status=RunStatus.PENDING,
        events=[],
        start_time=start,
    )

    final_state = await orchestrator.ainvoke(initial_state)
    duration_ms = int((time.time() - start) * 1000)

    return ChatResponse(
        session_id=session_id,
        run_id=run_id,
        status=RunStatus.COMPLETE,
        plan=OrchestratorPlan(**final_state["plan"]) if final_state.get("plan") else None,
        agent_results=[AgentResult(**r) for r in final_state.get("agent_results", [])],
        final_output=final_state.get("final_output", ""),
        duration_ms=duration_ms,
    )


async def stream_axiom(
    message: str,
    user_id: str,
    session_id: str,
) -> AsyncGenerator[WSEvent, None]:
    """Stream AXIOM events via WebSocket."""
    run_id = str(uuid.uuid4())
    start = time.time()

    initial_state = OrchestratorState(
        user_id=user_id,
        session_id=session_id,
        run_id=run_id,
        message=message,
        context={},
        plan={},
        agent_results=[],
        final_output="",
        status=RunStatus.PENDING,
        events=[],
        start_time=start,
    )

    async for chunk in orchestrator.astream(initial_state):
        for node_name, node_output in chunk.items():
            events = node_output.get("events", [])
            for event in events:
                yield WSEvent(
                    type=event["type"],
                    session_id=session_id,
                    data={**event.get("data", {}), "run_id": run_id, "node": node_name},
                )

