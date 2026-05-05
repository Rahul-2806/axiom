"""
AXIOM — Redis Service Client
Session memory (hot cache), pub/sub for WebSocket fanout, rate limiting.
"""
import json
import redis.asyncio as aioredis
from typing import Any, Optional
import structlog

from core.config import settings

log = structlog.get_logger(__name__)


class RedisService:
    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    async def get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = await aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
            )
        return self._client

    # ── Session Memory (Hot Cache) ─────────────────────────────

    async def set_session_context(
        self, session_id: str, context: dict, ttl: int = None
    ) -> None:
        client = await self.get_client()
        key = f"axiom:session:{session_id}:context"
        await client.setex(
            key, ttl or settings.redis_ttl_seconds, json.dumps(context)
        )

    async def get_session_context(self, session_id: str) -> Optional[dict]:
        client = await self.get_client()
        key = f"axiom:session:{session_id}:context"
        data = await client.get(key)
        return json.loads(data) if data else None

    async def append_to_session(
        self, session_id: str, message: dict, max_messages: int = 50
    ) -> None:
        client = await self.get_client()
        key = f"axiom:session:{session_id}:messages"
        await client.lpush(key, json.dumps(message))
        await client.ltrim(key, 0, max_messages - 1)
        await client.expire(key, settings.redis_ttl_seconds)

    async def get_session_messages(
        self, session_id: str, limit: int = 20
    ) -> list[dict]:
        client = await self.get_client()
        key = f"axiom:session:{session_id}:messages"
        messages = await client.lrange(key, 0, limit - 1)
        return [json.loads(m) for m in reversed(messages)]

    # ── Agent State Cache ──────────────────────────────────────

    async def cache_agent_result(
        self, cache_key: str, result: Any, ttl: int = 300
    ) -> None:
        client = await self.get_client()
        await client.setex(
            f"axiom:cache:{cache_key}", ttl, json.dumps(result)
        )

    async def get_cached_result(self, cache_key: str) -> Optional[Any]:
        client = await self.get_client()
        data = await client.get(f"axiom:cache:{cache_key}")
        return json.loads(data) if data else None

    # ── Pub/Sub (WebSocket fanout) ─────────────────────────────

    async def publish(self, channel: str, message: dict) -> None:
        client = await self.get_client()
        await client.publish(f"axiom:{channel}", json.dumps(message))

    async def subscribe(self, channel: str):
        client = await self.get_client()
        pubsub = client.pubsub()
        await pubsub.subscribe(f"axiom:{channel}")
        return pubsub

    # ── Rate Limiting ─────────────────────────────────────────

    async def check_rate_limit(self, user_id: str) -> tuple[bool, int]:
        """Returns (allowed, remaining_requests)."""
        client = await self.get_client()
        key = f"axiom:ratelimit:{user_id}"
        current = await client.incr(key)
        if current == 1:
            await client.expire(key, settings.rate_limit_window)
        remaining = max(0, settings.rate_limit_requests - current)
        return current <= settings.rate_limit_requests, remaining

    # ── Tool Registry Cache ───────────────────────────────────

    async def get_tool_registry(self) -> Optional[dict]:
        client = await self.get_client()
        data = await client.get("axiom:tool_registry")
        return json.loads(data) if data else None

    async def set_tool_registry(self, registry: dict) -> None:
        client = await self.get_client()
        await client.set("axiom:tool_registry", json.dumps(registry))

    # ── Health ────────────────────────────────────────────────

    async def health_check(self) -> bool:
        try:
            client = await self.get_client()
            await client.ping()
            return True
        except Exception as e:
            log.error("redis_health_check_failed", error=str(e))
            return False

    async def close(self) -> None:
        if self._client:
            await self._client.close()


# Singleton
redis_service = RedisService()
