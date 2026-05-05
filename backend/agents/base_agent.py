"""
AXIOM — Base Agent
Abstract class all domain agents inherit.
Provides: Groq inference, tool execution, structured output, logging.
"""
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Optional
import time
import structlog

from services.groq.client import groq_client
from db.models.schemas import AgentResult, AgentDomain, ToolDefinition
from core.registry.tool_registry import tool_registry

log = structlog.get_logger(__name__)


class BaseAgent(ABC):
    """
    Every AXIOM domain agent extends this class.
    Provides standardized inference, tool use, and result packaging.
    """

    domain: AgentDomain
    name: str
    description: str

    # Subclasses declare their tools
    tools: list[str] = []

    @property
    def system_prompt(self) -> str:
        """Override in subclass to define agent personality + capabilities."""
        return (
            f"You are the {self.name} agent in AXIOM, an AI operating system. "
            f"Domain: {self.domain.value}. "
            f"Be precise, technical, and results-oriented. "
            f"Available tools: {', '.join(self.tools) or 'none'}."
        )

    async def run(
        self,
        message: str,
        context: dict = None,
        session_id: str = "",
    ) -> AgentResult:
        """
        Main entry point. Runs the agent and returns a structured result.
        Subclasses can override or use this default implementation.
        """
        start = time.time()
        tools_used = []

        try:
            messages = self._build_messages(message, context or {})
            output = await groq_client.invoke(
                messages=messages,
                system=self.system_prompt,
                max_tokens=2048,
                temperature=0.7,
            )

            # Execute any tool calls found in output
            output, tools_used = await self._process_tool_calls(output, message)

            duration_ms = int((time.time() - start) * 1000)
            log.info(
                "agent_run_complete",
                agent=self.name,
                domain=self.domain,
                duration_ms=duration_ms,
                tools_used=tools_used,
            )

            return AgentResult(
                domain=self.domain,
                output=output,
                tools_used=tools_used,
                duration_ms=duration_ms,
                success=True,
            )

        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            log.error("agent_run_failed", agent=self.name, error=str(e))
            return AgentResult(
                domain=self.domain,
                output="",
                tools_used=tools_used,
                duration_ms=duration_ms,
                success=False,
                error=str(e),
            )

    async def stream(
        self,
        message: str,
        context: dict = None,
        session_id: str = "",
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from this agent."""
        messages = self._build_messages(message, context or {})
        async for token in groq_client.stream(
            messages=messages,
            system=self.system_prompt,
        ):
            yield token

    def _build_messages(self, message: str, context: dict) -> list[dict]:
        """Build the message list, injecting context if available."""
        messages = []

        # Inject relevant memory context
        if context.get("memories"):
            memory_text = "\n".join(
                f"- {m['content']}" for m in context["memories"][:3]
            )
            messages.append({
                "role": "user",
                "content": f"[Context from memory]\n{memory_text}",
            })
            messages.append({
                "role": "assistant",
                "content": "Understood. I have that context.",
            })

        # Inject session history
        for msg in context.get("history", [])[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": message})
        return messages

    async def _process_tool_calls(
        self, output: str, original_query: str
    ) -> tuple[str, list[str]]:
        """
        Detect and execute tool calls in agent output.
        Tools are called via [TOOL:tool_name:{"param": "value"}] syntax.
        """
        import re
        import json

        tools_used = []
        pattern = r'\[TOOL:(\w+):(\{.*?\})\]'

        async def replace_tool_call(match):
            tool_name = match.group(1)
            try:
                params = json.loads(match.group(2))
            except Exception:
                params = {}

            tool_fn = tool_registry.get_tool_fn(tool_name)
            if tool_fn:
                tools_used.append(tool_name)
                try:
                    result = await tool_fn(**params)
                    return f"[Tool Result: {tool_name}]\n{result}"
                except Exception as e:
                    return f"[Tool Error: {tool_name}: {str(e)}]"
            return match.group(0)

        # Process all tool calls
        matches = list(re.finditer(pattern, output))
        for match in matches:
            replacement = await replace_tool_call(match)
            output = output.replace(match.group(0), replacement)

        return output, tools_used

    def get_info(self) -> dict:
        return {
            "name": self.name,
            "domain": self.domain,
            "description": self.description,
            "tools": self.tools,
        }
