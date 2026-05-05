"""
AXIOM — AWS Bedrock Service Client
Orchestrator brain: Claude Opus 4.5 via Bedrock (eu-north-1).
Handles invocation, streaming, and retry logic.
"""
import json
import asyncio
from typing import AsyncGenerator, Any
import boto3
from botocore.config import Config
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

from core.config import settings

log = structlog.get_logger(__name__)


class BedrockClient:
    """
    Async wrapper around AWS Bedrock for Claude Opus 4.5.
    Used exclusively by the AXIOM orchestrator (not sub-agents).
    """

    def __init__(self):
        self._client = None
        self._runtime_client = None

    def _get_client(self):
        if self._client is None:
            self._client = boto3.client(
                "bedrock",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                config=Config(
                    retries={"max_attempts": 3, "mode": "adaptive"},
                    connect_timeout=10,
                    read_timeout=120,
                ),
            )
        return self._client

    def _get_runtime_client(self):
        if self._runtime_client is None:
            self._runtime_client = boto3.client(
                "bedrock-runtime",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                config=Config(
                    retries={"max_attempts": 3, "mode": "adaptive"},
                    connect_timeout=10,
                    read_timeout=300,
                ),
            )
        return self._runtime_client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def invoke(
        self,
        messages: list[dict],
        system: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        """Invoke Claude Opus via Bedrock — synchronous (run in executor)."""

        def _invoke():
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }
            if system:
                body["system"] = system

            response = self._get_runtime_client().invoke_model(
                modelId=settings.bedrock_model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )
            result = json.loads(response["body"].read())
            return result["content"][0]["text"]

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _invoke)

    async def stream(
        self,
        messages: list[dict],
        system: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Claude Opus via Bedrock."""

        def _stream():
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }
            if system:
                body["system"] = system

            return self._get_runtime_client().invoke_model_with_response_stream(
                modelId=settings.bedrock_model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _stream)

        for event in response["body"]:
            chunk = json.loads(event["chunk"]["bytes"])
            if chunk.get("type") == "content_block_delta":
                delta = chunk.get("delta", {})
                if delta.get("type") == "text_delta":
                    yield delta.get("text", "")

    async def health_check(self) -> bool:
        """Verify Bedrock connectivity."""
        try:
            result = await self.invoke(
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=10,
            )
            return bool(result)
        except Exception as e:
            log.error("bedrock_health_check_failed", error=str(e))
            return False


# Singleton
bedrock_client = BedrockClient()
