"""
AXIOM — Core Configuration
Loads all environment variables with validation.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────
    app_name: str = "AXIOM"
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    secret_key: str = Field(..., env="SECRET_KEY")
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"], env="CORS_ORIGINS"
    )

    # ── AWS Bedrock ───────────────────────────────────
    aws_access_key_id: str = Field(..., env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str = Field(..., env="AWS_SECRET_ACCESS_KEY")
    aws_region: str = Field(default="eu-north-1", env="AWS_REGION")
    bedrock_model_id: str = Field(
        default="eu.anthropic.claude-opus-4-5-20251101-v1:0",
        env="BEDROCK_MODEL_ID",
    )

    # ── Groq ─────────────────────────────────────────
    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    groq_model_id: str = Field(
        default="llama-3.3-70b-versatile", env="GROQ_MODEL_ID"
    )

    # ── Supabase ─────────────────────────────────────
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_anon_key: str = Field(..., env="SUPABASE_ANON_KEY")
    supabase_service_key: str = Field(..., env="SUPABASE_SERVICE_KEY")

    # ── Redis ─────────────────────────────────────────
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_ttl_seconds: int = Field(default=3600, env="REDIS_TTL_SECONDS")

    # ── Logging ───────────────────────────────────────
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    # ── Rate Limiting ─────────────────────────────────
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
