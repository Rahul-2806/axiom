"""
AXIOM — Groq Service Client
Sub-agent inference engine: LLaMA 3.3 70B via Groq.
Fast, cheap, parallel — used by all domain agents.
"""
import asyncio
from typing import AsyncGenerator
from groq import AsyncGroq
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

from core.config import settings

log = structlog.get_logger(__name__)


class GroqClient:
    """
    Async Groq client wrapping LLaMA 3.3 70B.
    All domain sub-agents use this for inference.
    Supports parallel invocations — Groq's rate limits allow burst.
    """

    def __init__(self):
        self._client = AsyncGroq(api_key=settings.groq_api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
    )
    async def invoke(
        self,
        messages: list[dict],
        system: str = "",
        max_tokens: int = 2048,
        temperature: float = 0.7,
        json_mode: bool = False,
    ) -> str:
        """Invoke LLaMA 3.3 70B on Groq."""
        all_messages = []
        if system:
            all_messages.append({"role": "system", "content": system})
        all_messages.extend(messages)

        kwargs = {
            "model": settings.groq_model_id,
            "messages": all_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._client.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    async def stream(
        self,
        messages: list[dict],
        system: str = "",
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from LLaMA 3.3 70B."""
        all_messages = []
        if system:
            all_messages.append({"role": "system", "content": system})
        all_messages.extend(messages)

        async with await self._client.chat.completions.create(
            model=settings.groq_model_id,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

    async def invoke_parallel(
        self,
        tasks: list[dict],  # Each: {messages, system, max_tokens, temperature}
    ) -> list[str]:
        """Run multiple agent invocations in parallel — AXIOM's superpower."""
        coroutines = [self.invoke(**task) for task in tasks]
        return await asyncio.gather(*coroutines, return_exceptions=True)

    async def health_check(self) -> bool:
        try:
            result = await self.invoke(
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
            )
            return bool(result)
        except Exception as e:
            log.error("groq_health_check_failed", error=str(e))
            return False


# Singleton
groq_client = GroqClient()
