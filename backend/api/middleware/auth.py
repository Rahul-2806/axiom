"""
AXIOM — Auth Middleware
Validates Supabase JWT tokens. Injects user_id into request state.
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase.client import supabase_service
import structlog

log = structlog.get_logger(__name__)
security = HTTPBearer()


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency: validates Bearer token, returns user dict.
    Usage: user = Depends(get_current_user)
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.split(" ", 1)[1]
    user = await supabase_service.get_user(token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return user


async def get_optional_user(request: Request) -> dict | None:
    """Like get_current_user but doesn't raise — returns None if unauth."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
