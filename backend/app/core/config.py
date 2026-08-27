"""Application configuration.

All settings are loaded from environment variables (12-factor app). A local
``.env`` file is read for convenience during development. In production,
variables are injected by the platform (e.g. Timeweb Cloud Apps).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

_DEFAULT_SECRET_KEY = "change-me-in-production-please-use-a-long-random-string"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application ---
    app_name: str = "Mevratek"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = True
    api_v1_prefix: str = "/api/v1"

    # --- Security ---
    # Secret used to sign robot API tokens (JWT). MUST be overridden in prod.
    secret_key: str = _DEFAULT_SECRET_KEY
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

    # Seconds after which a robot is considered offline if no heartbeat.
    # Presence is tracked in Postgres (robots.last_seen_at) — no Redis needed.
    heartbeat_ttl_seconds: int = 30

    # --- Object storage (S3 / MinIO) — OPTIONAL ---
    # Leave the endpoint/credentials empty to run without object storage:
    # camera frames simply won't be persisted (decisions still work). Set them
    # to enable frame storage on any S3-compatible store (AWS S3, R2, MinIO).
    s3_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key: str = ""
    s3_secret_key: str = ""
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

    # --- Model Router (LLM provider selection) ---
    # The Decision Engine is provider-agnostic. "auto" picks a provider from
    # the configured credentials (Claude → OpenAI/local → mock). Force a
    # specific one with claude | openai | local | mock.
    # Supported engines: Claude, OpenAI, YandexGPT, GigaChat and any local /
    # OpenAI-compatible model. yandexgpt & gigachat are reached through an
    # OpenAI-compatible gateway (set OPENAI_BASE_URL / OPENAI_MODEL).
    llm_provider: Literal[
        "auto", "claude", "openai", "yandexgpt", "gigachat", "local", "mock"
    ] = "auto"
    # OpenAI / OpenAI-compatible (also used for local & Russian models via
    # base_url, e.g. Ollama/vLLM/LM Studio or a GigaChat/YandexGPT gateway).
    openai_api_key: str = ""
    openai_base_url: str | None = None
    openai_model: str = "gpt-4o-mini"

    # --- Demo mode ---
    # Seeds a simulated "Demo" device with live-changing telemetry and a few
    # decision logs so the dashboard is never empty. Disable in production with
    # DEMO_MODE=false.
    demo_mode: bool = True
    demo_interval_seconds: int = 5

    # --- CORS ---
    # NoDecode stops pydantic-settings from trying json.loads() on the env
    # value (so CORS_ORIGINS=* or a comma-separated list is accepted) — our
    # validator below turns the raw string into a list.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["*"]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> Settings:
        """Fail fast if the placeholder SECRET_KEY is used in production.

        The default key is a public placeholder — signing robot tokens with it
        in production would let anyone forge tokens. Force operators to set a
        real secret (as documented in .env.example / README).
        """
        if self.environment == "production" and self.secret_key == _DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a strong random value in production "
                "(the default placeholder is not allowed)."
            )
        return self

    @property
    def storage_enabled(self) -> bool:
        """Object storage is on only when an endpoint + credentials are set."""
        return bool(
            self.s3_access_key and self.s3_secret_key and self.s3_bucket
        )

    @property
    def _claude_configured(self) -> bool:
        return bool(self.anthropic_api_key or self.anthropic_base_url)

    @property
    def _openai_configured(self) -> bool:
        return bool(self.openai_api_key or self.openai_base_url)

    @property
    def resolved_provider(self) -> str:
        """Which LLM provider the Decision Engine will use."""
        if self.llm_provider != "auto":
            return self.llm_provider
        if self._claude_configured:
            return "claude"
        if self._openai_configured:
            return "openai"
        return "mock" if self.claude_allow_mock else "claude"

    @property
    def use_claude_mock(self) -> bool:
        # Backwards-compatible alias: true when no real provider is selected.
        return self.resolved_provider == "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
