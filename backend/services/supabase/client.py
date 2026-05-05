"""
AXIOM — Supabase Service Client
Handles: persistent memory, pgvector embeddings, auth validation, user data.
"""
from supabase import create_client, Client
from typing import Any, Optional
import structlog

from core.config import settings

log = structlog.get_logger(__name__)


class SupabaseService:
    def __init__(self):
        self._client: Client = create_client(
            settings.supabase_url, settings.supabase_service_key
        )
        self._anon_client: Client = create_client(
            settings.supabase_url, settings.supabase_anon_key
        )

    @property
    def client(self) -> Client:
        return self._client

    # ── Memory Operations ──────────────────────────────────────

    async def store_memory(
        self,
        user_id: str,
        content: str,
        embedding: list[float],
        memory_type: str = "conversation",
        metadata: dict = None,
    ) -> dict:
        """Store a memory with its vector embedding."""
        data = {
            "user_id": user_id,
            "content": content,
            "embedding": embedding,
            "memory_type": memory_type,
            "metadata": metadata or {},
        }
        result = self._client.table("axiom_memories").insert(data).execute()
        return result.data[0] if result.data else {}

    async def search_memories(
        self,
        user_id: str,
        query_embedding: list[float],
        limit: int = 5,
        threshold: float = 0.7,
    ) -> list[dict]:
        """Semantic search over user memories using pgvector."""
        result = self._client.rpc(
            "search_memories",
            {
                "query_embedding": query_embedding,
                "match_user_id": user_id,
                "match_threshold": threshold,
                "match_count": limit,
            },
        ).execute()
        return result.data or []

    async def get_conversation_history(
        self, session_id: str, limit: int = 20
    ) -> list[dict]:
        result = (
            self._client.table("axiom_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def save_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        metadata: dict = None,
    ) -> dict:
        data = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
        }
        result = self._client.table("axiom_messages").insert(data).execute()
        return result.data[0] if result.data else {}

    # ── Agent Runs ────────────────────────────────────────────

    async def log_agent_run(
        self,
        user_id: str,
        session_id: str,
        agents_used: list[str],
        input_text: str,
        output_text: str,
        tokens_used: int = 0,
        duration_ms: int = 0,
    ) -> dict:
        data = {
            "user_id": user_id,
            "session_id": session_id,
            "agents_used": agents_used,
            "input_text": input_text,
            "output_text": output_text,
            "tokens_used": tokens_used,
            "duration_ms": duration_ms,
        }
        result = self._client.table("axiom_runs").insert(data).execute()
        return result.data[0] if result.data else {}

    # ── Auth ──────────────────────────────────────────────────

    async def get_user(self, jwt: str) -> Optional[dict]:
        """Validate JWT and return user data."""
        try:
            response = self._client.auth.get_user(jwt)
            return response.user.__dict__ if response.user else None
        except Exception as e:
            log.error("supabase_get_user_failed", error=str(e))
            return None

    # ── Health ────────────────────────────────────────────────

    async def health_check(self) -> bool:
        try:
            self._client.table("axiom_memories").select("id").limit(1).execute()
            return True
        except Exception as e:
            log.error("supabase_health_check_failed", error=str(e))
            return False


# Singleton
supabase_service = SupabaseService()
