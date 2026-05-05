from fastapi import WebSocket, WebSocketDisconnect
from fastapi import APIRouter
import json
import structlog
from core.orchestrator.graph import run_axiom
from services.supabase.client import supabase_service

log = structlog.get_logger(__name__)
router = APIRouter()
_connections: dict[str, list[WebSocket]] = {}

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    user_id = None
    try:
        auth_msg = await websocket.receive_json()
        token = auth_msg.get("token", "")
        if token == "dev-token":
            user_id = "00000000-0000-0000-0000-000000000001"
        else:
            user = await supabase_service.get_user(token)
            if not user:
                await websocket.send_json({"type": "error", "data": {"message": "Unauthorized"}})
                await websocket.close(code=4001)
                return
            user_id = user["id"]

        _connections.setdefault(user_id, []).append(websocket)
        await websocket.send_json({"type": "connected", "data": {"session_id": session_id, "user_id": user_id, "message": "AXIOM online. Ready."}})
        log.info("ws_connected", user_id=user_id, session_id=session_id)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "chat")

            if msg_type == "chat":
                message = data.get("message", "").strip()
                if not message:
                    continue

                try:
                    response = await run_axiom(
                        message=message,
                        user_id=user_id,
                        session_id=session_id,
                    )

                    domains_used = [r.domain for r in response.agent_results] if response.agent_results else ["research"]

                    await websocket.send_json({
                        "type": "plan",
                        "session_id": session_id,
                        "data": {
                            "intent": message,
                            "domains": domains_used,
                            "parallel": True,
                            "reasoning": "auto-routed by orchestrator"
                        },
                        "timestamp": ""
                    })

                    await websocket.send_json({
                        "type": "synthesis_token",
                        "session_id": session_id,
                        "data": {"token": response.final_output},
                        "timestamp": ""
                    })

                    await websocket.send_json({
                        "type": "complete",
                        "session_id": session_id,
                        "data": {},
                        "timestamp": ""
                    })

                except Exception as e:
                    log.error("axiom_run_error", error=str(e))
                    await websocket.send_json({
                        "type": "error",
                        "session_id": session_id,
                        "data": {"message": str(e)},
                        "timestamp": ""
                    })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        log.info("ws_disconnected", user_id=user_id, session_id=session_id)
    except Exception as e:
        log.error("ws_error", error=str(e), session_id=session_id)
        try:
            await websocket.send_json({"type": "error", "data": {"message": str(e)}})
        except Exception:
            pass
    finally:
        if user_id and user_id in _connections:
            _connections[user_id] = [ws for ws in _connections[user_id] if ws != websocket]


async def broadcast_to_user(user_id: str, event: dict) -> None:
    connections = _connections.get(user_id, [])
    dead = []
    for ws in connections:
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connections.remove(ws)
