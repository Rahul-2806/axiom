"""
AXIOM — Agents Routes
GET  /agents         — list all registered agents
GET  /agents/{domain} — get agent info + tools
POST /agents/{domain}/invoke — invoke a single agent directly
GET  /agents/tools   — list all registered tools
"""
from fastapi import APIRouter, Depends, HTTPException
from api.middleware.auth import get_current_user
from core.registry.tool_registry import tool_registry
from db.models.schemas import AgentDomain, AgentInvokeRequest, AgentResult
import structlog

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])

ALL_DOMAINS = [d for d in AgentDomain if d != AgentDomain.ORCHESTRATOR]

AGENT_META = {
    AgentDomain.FINANCE: {
        "name": "FinanceAgent",
        "description": "Market intelligence, stock/crypto prices, arbitrage, portfolio analysis",
        "icon": "🏦",
    },
    AgentDomain.CODE: {
        "name": "CodeAgent",
        "description": "Code generation, review, debugging, architecture, DevOps",
        "icon": "💻",
    },
    AgentDomain.RESEARCH: {
        "name": "ResearchAgent",
        "description": "Web research, academic papers, fact-checking, knowledge synthesis",
        "icon": "🔬",
    },
    AgentDomain.WEB: {
        "name": "WebAgent",
        "description": "Web scraping, news monitoring, URL analysis, trend detection",
        "icon": "🌐",
    },
    AgentDomain.SYSTEM: {
        "name": "SystemAgent",
        "description": "File operations, scheduling, notifications, workflow automation",
        "icon": "⚙️",
    },
}


@router.get("")
async def list_agents(user: dict = Depends(get_current_user)):
    """List all available domain agents."""
    return {
        "agents": [
            {
                "domain": domain.value,
                **AGENT_META.get(domain, {}),
                "tools": [t.name for t in tool_registry.get_for_domain(domain)],
            }
            for domain in ALL_DOMAINS
        ]
    }


@router.get("/tools")
async def list_tools(user: dict = Depends(get_current_user)):
    """List all registered tools in the dynamic tool registry."""
    return {
        "tools": [t.model_dump() for t in tool_registry.list_all()],
        "count": len(tool_registry.list_all()),
    }


@router.get("/{domain}")
async def get_agent(domain: str, user: dict = Depends(get_current_user)):
    """Get info about a specific domain agent."""
    try:
        domain_enum = AgentDomain(domain)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown agent domain: {domain}")

    if domain_enum == AgentDomain.ORCHESTRATOR:
        raise HTTPException(status_code=400, detail="Orchestrator is not a domain agent")

    meta = AGENT_META.get(domain_enum, {})
    tools = tool_registry.get_for_domain(domain_enum)

    return {
        "domain": domain,
        **meta,
        "tools": [t.model_dump() for t in tools],
    }


@router.post("/{domain}/invoke", response_model=AgentResult)
async def invoke_agent(
    domain: str,
    request: AgentInvokeRequest,
    user: dict = Depends(get_current_user),
) -> AgentResult:
    """Invoke a specific domain agent directly, bypassing the orchestrator."""
    try:
        domain_enum = AgentDomain(domain)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Unknown agent domain: {domain}")

    # Lazy import agent
    from core.orchestrator.graph import _get_agent
    agent = _get_agent(domain_enum)

    result = await agent.run(
        message=request.message,
        context=request.context,
        session_id=request.session_id,
    )
    return result
