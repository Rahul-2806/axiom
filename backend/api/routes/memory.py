"""
AXIOM — Memory Routes
GET  /memory/search?q=query  — semantic search over memories
GET  /memory/history?session_id=... — conversation history
DELETE /memory/{memory_id}  — delete a memory
GET  /memory/stats  — memory statistics
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from api.middleware.auth import get_current_user
from core.memory.memory_os import get_memory
import structlog

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/search")
async def search_memories(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=5, le=20),
    user: dict = Depends(get_current_user),
):
    """Semantic search over the user's long-term memories."""
    memory = get_memory(user["id"])
    results = await memory.recall(query=q, limit=limit)
    return {"query": q, "results": results, "count": len(results)}


@router.get("/history")
async def get_history(
    session_id: str = Query(...),
    limit: int = Query(default=20, le=100),
    user: dict = Depends(get_current_user),
):
    """Get conversation history for a session."""
    from services.supabase.client import supabase_service
    messages = await supabase_service.get_conversation_history(
        session_id=session_id, limit=limit
    )
    return {"session_id": session_id, "messages": messages, "count": len(messages)}


@router.get("/stats")
async def memory_stats(user: dict = Depends(get_current_user)):
    """Get memory statistics for the current user."""
    memory = get_memory(user["id"])
    graph_stats = memory.get_graph_stats()
    return {
        "user_id": user["id"],
        "graph": graph_stats,
    }
