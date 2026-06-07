"""Application configuration.

All settings are loaded from environment variables (12-factor app). A local
``.env`` file is read for convenience during development. In production,
variables are injected by the platform (e.g. Railway).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application ---
    app_name: str = "Cloud Brain for Robots"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True
    api_v1_prefix: str = "/api/v1"

    # --- Security ---
    # Secret used to sign robot API tokens (JWT). MUST be overridden in prod.
    secret_key: str = "change-me-in-production-please-use-a-long-random-string"
    jwt_algorithm: str = "HS256"
    # Robot access tokens are long-lived; rotate via re-registration.
    robot_token_ttl_days: int = 365

    # --- Database ---
    database_url: str = (
        "postgresql+asyncpg://brain:brain@postgres:5432/brain"
    )
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_echo: bool = False

    # --- Redis (cache + heartbeat presence) ---
    redis_url: str = "redis://redis:6379/0"
    # Seconds after which a robot is considered offline if no heartbeat.
    heartbeat_ttl_seconds: int = 30

    # --- Object storage (S3 / MinIO) ---
    s3_endpoint_url: str | None = "http://minio:9000"
    s3_region: str = "us-east-1"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "robot-frames"
    s3_public_url: str | None = None  # public base url for presigned/serving

    # --- Claude / Anthropic ---
    anthropic_api_key: str = ""
    # Optional override of the API endpoint. Leave empty to call Claude
    # directly. Set it to route every request through an AI tunnel / proxy
    # (any Anthropic-compatible endpoint). Both modes work transparently —
    # only the value of this variable decides which is used.
    anthropic_base_url: str | None = None
    # Default to the most capable model. For high-throughput / low-latency
    # fleets, operators may switch to claude-sonnet-4-6 or claude-haiku-4-5
    # via the CLAUDE_MODEL env var (see README) — the decision contract is
    # identical across models.
    claude_model: str = "claude-opus-4-8"
    claude_max_tokens: int = 1024
    claude_timeout_seconds: float = 30.0
    # Thinking adds latency; for real-time robot control it is disabled by
    # default. Set to "adaptive" for harder reasoning at the cost of latency.
    claude_thinking: Literal["disabled", "adaptive"] = "disabled"
    # If true and no API key is configured, the brain returns a deterministic
    # mock decision instead of calling the API. Useful for local dev / CI.
    claude_allow_mock: bool = True

    # --- CORS ---
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def use_claude_mock(self) -> bool:
        # Real mode if a key OR a tunnel endpoint is configured; otherwise
        # fall back to the deterministic mock (when allowed).
        configured = bool(self.anthropic_api_key or self.anthropic_base_url)
        return not configured and self.claude_allow_mock


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
