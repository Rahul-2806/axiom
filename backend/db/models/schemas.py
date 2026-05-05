"""
AXIOM — Data Models
All Pydantic models used across the API, agents, and orchestrator.
"""
from enum import Enum
from typing import Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


# ── Enums ──────────────────────────────────────────────────────

class AgentDomain(str, Enum):
    FINANCE = "finance"
    CODE = "code"
    RESEARCH = "research"
    WEB = "web"
    SYSTEM = "system"
    ORCHESTRATOR = "orchestrator"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    AGENT = "agent"


class RunStatus(str, Enum):
    PENDING = "pending"
    ROUTING = "routing"
    RUNNING = "running"
    SYNTHESIZING = "synthesizing"
    COMPLETE = "complete"
    FAILED = "failed"


class MemoryType(str, Enum):
    CONVERSATION = "conversation"
    FACT = "fact"
    PREFERENCE = "preference"
    TASK = "task"


# ── Request Models ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stream: bool = Field(default=True)
    domains: Optional[list[AgentDomain]] = Field(
        default=None,
        description="Force specific domains. If None, orchestrator decides."
    )


class AgentInvokeRequest(BaseModel):
    domain: AgentDomain
    message: str
    context: dict = Field(default_factory=dict)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


# ── Response Models ────────────────────────────────────────────

class AgentResult(BaseModel):
    domain: AgentDomain
    output: str
    tools_used: list[str] = Field(default_factory=list)
    duration_ms: int = 0
    success: bool = True
    error: Optional[str] = None


class OrchestratorPlan(BaseModel):
    intent: str
    domains: list[AgentDomain]
    parallel: bool = True
    reasoning: str


class ChatResponse(BaseModel):
    session_id: str
    run_id: str
    status: RunStatus
    plan: Optional[OrchestratorPlan] = None
    agent_results: list[AgentResult] = Field(default_factory=list)
    final_output: str = ""
    tokens_used: int = 0
    duration_ms: int = 0


# ── WebSocket Event Models ─────────────────────────────────────

class WSEventType(str, Enum):
    CONNECTED = "connected"
    PLAN = "plan"
    AGENT_START = "agent_start"
    AGENT_TOKEN = "agent_token"
    AGENT_COMPLETE = "agent_complete"
    SYNTHESIS_START = "synthesis_start"
    SYNTHESIS_TOKEN = "synthesis_token"
    COMPLETE = "complete"
    ERROR = "error"


class WSEvent(BaseModel):
    type: WSEventType
    session_id: str
    data: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ── Memory Models ──────────────────────────────────────────────

class Memory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    memory_type: MemoryType = MemoryType.CONVERSATION
    metadata: dict = Field(default_factory=dict)
    similarity: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Tool Registry Models ───────────────────────────────────────

class ToolDefinition(BaseModel):
    name: str
    description: str
    domain: AgentDomain
    parameters: dict = Field(default_factory=dict)
    enabled: bool = True
    version: str = "1.0.0"


class ToolRegistry(BaseModel):
    tools: dict[str, ToolDefinition] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    def register(self, tool: ToolDefinition) -> None:
        self.tools[tool.name] = tool
        self.last_updated = datetime.utcnow()

    def get_for_domain(self, domain: AgentDomain) -> list[ToolDefinition]:
        return [t for t in self.tools.values() if t.domain == domain and t.enabled]


# ── Health Check ──────────────────────────────────────────────

class HealthStatus(BaseModel):
    status: str
    services: dict[str, bool]
    version: str = "1.0.0"
    environment: str = "development"
