"""
AXIOM — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from core.config import settings
from api.routes import chat, agents, memory
from api.websocket.handler import router as ws_router

log = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="AXIOM",
        description="Self-Orchestrating Multi-Domain AI OS",
        version="1.0.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(chat.router, prefix="/api/v1")
    app.include_router(agents.router, prefix="/api/v1")
    app.include_router(memory.router, prefix="/api/v1")
    app.include_router(ws_router)

    @app.get("/health")
    async def health():
        from services.bedrock.client import bedrock_client
        from services.groq.client import groq_client
        from services.redis.client import redis_service
        from services.supabase.client import supabase_service

        return {
            "status": "ok",
            "version": "1.0.0",
            "environment": settings.environment,
            "services": {
                "bedrock": await bedrock_client.health_check(),
                "groq": await groq_client.health_check(),
                "redis": await redis_service.health_check(),
                "supabase": await supabase_service.health_check(),
            }
        }

    @app.on_event("startup")
    async def startup():
        log.info("axiom_starting", environment=settings.environment)

    @app.on_event("shutdown")
    async def shutdown():
        from services.redis.client import redis_service
        await redis_service.close()
        log.info("axiom_shutdown")

    return app


app = create_app()
