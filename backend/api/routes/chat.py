"""
AXIOM — Chat Routes
POST /chat — sync (returns full response)
POST /chat/stream — streaming via SSE
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import json

from api.middleware.auth import get_current_user
from core.orchestrator.graph import run_axiom, stream_axiom
from db.models.schemas import ChatRequest, ChatResponse
import structlog

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
) -> ChatResponse:
    """
    Synchronous chat endpoint.
    Runs full AXIOM orchestration and returns complete response.
    Use /chat/stream for real-time token streaming.
    """
    try:
        response = await run_axiom(
            message=request.message,
            user_id=user["id"],
            session_id=request.session_id,
        )
        return response
    except Exception as e:
        log.error("chat_route_error", error=str(e), user_id=user.get("id"))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    user: dict = Depends(get_current_user),
):
    """
    SSE streaming endpoint.
    Streams orchestrator events + tokens in real-time.
    """
    async def event_generator():
        try:
            async for event in stream_axiom(
                message=request.message,
                user_id=user["id"],
                session_id=request.session_id,
            ):
                data = json.dumps(event.model_dump(), default=str)
                yield f"data: {data}\n\n"
        except Exception as e:
            error_event = {"type": "error", "data": {"message": str(e)}}
            yield f"data: {json.dumps(error_event)}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
