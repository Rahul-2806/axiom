"""
AXIOM — MemoryOS
Three-tier memory architecture:
  Hot  → Redis (session, last ~50 messages, sub-ms lookup)
  Warm → Supabase pgvector (long-term semantic memory, vector search)
  Cold → NetworkX graph (entity relationships, knowledge graph)
"""
import json
from typing import Optional
import networkx as nx
from sentence_transformers import SentenceTransformer
import structlog

from services.redis.client import redis_service
from services.supabase.client import supabase_service

log = structlog.get_logger(__name__)

# Lightweight embedding model — runs locally
_EMBED_MODEL = None


def get_embed_model() -> SentenceTransformer:
    global _EMBED_MODEL
    if _EMBED_MODEL is None:
        _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _EMBED_MODEL


class MemoryOS:
    """
    AXIOM's three-tier memory system.

    Usage:
        memory = MemoryOS(user_id="abc123")
        await memory.remember("User prefers dark mode", memory_type="preference")
        results = await memory.recall("interface preferences")
        context = await memory.get_session_context(session_id)
    """

    def __init__(self, user_id: str):
        self.user_id = user_id
        self._graph = nx.DiGraph()  # In-memory knowledge graph

    # ── Remember (Write) ───────────────────────────────────────

    async def remember(
        self,
        content: str,
        memory_type: str = "conversation",
        metadata: dict = None,
        session_id: str = "",
    ) -> None:
        """Store a memory across all tiers."""
        # Generate embedding
        embedding = get_embed_model().encode(content).tolist()

        # Warm: Supabase pgvector
        await supabase_service.store_memory(
            user_id=self.user_id,
            content=content,
            embedding=embedding,
            memory_type=memory_type,
            metadata=metadata or {},
        )

        # Cold: Add to knowledge graph if it contains entities
        await self._update_knowledge_graph(content, metadata or {})

        log.info("memory_stored", user_id=self.user_id, type=memory_type)

    async def save_message(
        self, session_id: str, role: str, content: str, metadata: dict = None
    ) -> None:
        """Save a chat message to hot (Redis) and warm (Supabase) tier."""
        message = {"role": role, "content": content, "metadata": metadata or {}}

        # Hot tier: Redis
        await redis_service.append_to_session(session_id, message)

        # Warm tier: Supabase
        await supabase_service.save_message(
            session_id=session_id,
            user_id=self.user_id,
            role=role,
            content=content,
            metadata=metadata,
        )

    # ── Recall (Read) ─────────────────────────────────────────

    async def recall(
        self, query: str, limit: int = 5, threshold: float = 0.65
    ) -> list[dict]:
        """Semantic search over long-term memories."""
        embedding = get_embed_model().encode(query).tolist()
        return await supabase_service.search_memories(
            user_id=self.user_id,
            query_embedding=embedding,
            limit=limit,
            threshold=threshold,
        )

    async def get_session_context(
        self, session_id: str, include_memories: bool = True, query: str = ""
    ) -> dict:
        """
        Assemble full context for an agent run:
        - Recent session history (Redis hot tier)
        - Relevant long-term memories (pgvector)
        - Entity graph context (NetworkX)
        """
        # Hot: recent messages
        history = await redis_service.get_session_messages(session_id, limit=20)

        context = {"history": history, "memories": [], "graph_context": {}}

        # Warm: semantic memories (if query provided)
        if include_memories and query:
            context["memories"] = await self.recall(query, limit=3)

        # Cold: relevant graph nodes
        if query:
            context["graph_context"] = self._query_graph(query)

        return context

    # ── Knowledge Graph ────────────────────────────────────────

    async def _update_knowledge_graph(
        self, content: str, metadata: dict
    ) -> None:
        """Extract entities and relationships, add to graph."""
        # Simple entity extraction (can be upgraded to NER later)
        entities = metadata.get("entities", [])
        relations = metadata.get("relations", [])

        for entity in entities:
            if not self._graph.has_node(entity):
                self._graph.add_node(entity, user_id=self.user_id)

        for relation in relations:
            if len(relation) == 3:
                src, rel, dst = relation
                self._graph.add_edge(src, dst, relation=rel, content=content)

    def _query_graph(self, query: str) -> dict:
        """Get graph context relevant to query."""
        # Simple keyword match against node names
        query_lower = query.lower()
        relevant_nodes = [
            n for n in self._graph.nodes
            if any(word in str(n).lower() for word in query_lower.split())
        ]

        context = {}
        for node in relevant_nodes[:5]:
            neighbors = list(self._graph.neighbors(node))
            context[node] = neighbors

        return context

    def add_entity_relation(
        self, source: str, relation: str, target: str
    ) -> None:
        """Manually add a relationship to the knowledge graph."""
        self._graph.add_node(source, user_id=self.user_id)
        self._graph.add_node(target, user_id=self.user_id)
        self._graph.add_edge(source, target, relation=relation)

    def get_graph_stats(self) -> dict:
        return {
            "nodes": self._graph.number_of_nodes(),
            "edges": self._graph.number_of_edges(),
            "density": nx.density(self._graph),
        }


# Factory: one MemoryOS instance per user (session-scoped)
_memory_instances: dict[str, MemoryOS] = {}


def get_memory(user_id: str) -> MemoryOS:
    if user_id not in _memory_instances:
        _memory_instances[user_id] = MemoryOS(user_id)
    return _memory_instances[user_id]
