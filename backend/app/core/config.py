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

    # Single password that unlocks the hidden admin panel (no email login).
    # Override in production via the ADMIN_PANEL_PASSWORD env var.
    admin_panel_password: str = "mevra2026"
    # How long an issued invite link stays valid.
    invite_ttl_hours: int = 72

    # --- Yandex SmartCaptcha (dashboard login) ---
    # Server-side secret used to validate the captcha token. When empty, the
    # captcha check is disabled (dev / tests) and login proceeds without it.
    yandex_captcha_server_key: str = ""
    # Public client (site) key. Exposed to the dashboard via /auth/config so the
    # widget works without rebuilding the frontend (NEXT_PUBLIC_* is baked in at
    # build time; a backend env var is read at runtime).
    yandex_captcha_site_key: str = ""
    yandex_captcha_validate_url: str = (
        "https://smartcaptcha.yandexcloud.net/validate"
    )

    # --- Email (SMTP) ---
    # When host/user/password are all set, email is "enabled": login requires a
    # emailed code, account changes are confirmed by code, and welcome/lead/
    # newsletter mail is sent. Leave them empty (dev / tests) and the app runs
    # exactly as before — codes are skipped and mail is logged, not sent.
    smtp_host: str = ""
    # 465 = implicit TLS (SMTPS, encryption=ssl); 587 = STARTTLS.
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_encryption: Literal["ssl", "starttls", "none"] = "ssl"
    # Envelope sender. Defaults to smtp_user when unset.
    smtp_from: str = ""
    smtp_from_name: str = "Mevratek"
    smtp_timeout_seconds: float = 20.0

    # Emailed confirmation codes (login, password change, email change).
    code_length: int = 5
    code_ttl_minutes: int = 10
    code_max_attempts: int = 3
    code_lockout_minutes: int = 60
    # Don't issue a fresh code more often than this for the same purpose.
    code_resend_cooldown_seconds: int = 60

    # --- Device alerts ---
    # A background watcher emails an organization's users when one of their
    # devices goes offline, reports an error, or comes back. Needs SMTP; each
    # user can turn their own alerts off on the account page.
    alerts_enabled: bool = True
    alerts_interval_seconds: int = 60

    # --- Login throttling (brute-force protection) ---
    # Counted per account and, separately, per source IP: the first stops a
    # single password being guessed, the second stops one guess being sprayed
    # across many accounts. A successful login clears its own counters.
    login_window_minutes: int = 15
    login_max_attempts: int = 5
    login_ip_max_attempts: int = 20
    login_lockout_minutes: int = 15
    # The admin panel is one shared password, so it gets its own IP budget.
    admin_login_max_attempts: int = 5

    # --- Observability ---
    # A Prometheus scrape endpoint at GET /metrics (outside the API prefix, as
    # the convention expects). It reports the whole installation, not one
    # organization: request rate and latency, the share of decisions that fell
    # back to the deterministic placeholder, fleet and queue sizes.
    metrics_enabled: bool = True
    # Scrapes must present `Authorization: Bearer <token>` — Prometheus has a
    # bearer_token option for exactly this. Leaving it empty is only allowed
    # outside production; in production an unset token disables the endpoint
    # rather than exposing operational data to the internet.
    metrics_token: str = ""

    # Sentry. Unset DSN = no SDK initialised, no network calls, no overhead —
    # the same opt-in shape as SMTP and object storage.
    sentry_dsn: str = ""
    # Share of requests traced for performance. 0 = errors only, which is what
    # a robot control loop wants; raise it temporarily when investigating.
    sentry_traces_sample_rate: float = 0.0
    # Defaults to `environment` when left empty.
    sentry_environment: str = ""
    # Bodies can carry camera frames and telemetry, so they are never attached.
    sentry_send_default_pii: bool = False

    @field_validator("smtp_encryption", mode="before")
    @classmethod
    def _lower_encryption(cls, v: object) -> object:
        # The platform's env var is written as SSL / STARTTLS.
        return v.lower() if isinstance(v, str) else v

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
    def captcha_enabled(self) -> bool:
        """Captcha is enforced only when a server key is configured."""
        return bool(self.yandex_captcha_server_key)

    @property
    def email_enabled(self) -> bool:
        """Email is on only when a full SMTP credential set is configured."""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def mail_from(self) -> str:
        return self.smtp_from or self.smtp_user

    @property
    def metrics_token_required(self) -> bool:
        """Whether a scrape has to authenticate.

        Always, when a token is configured. In production it is mandatory, so
        `metrics_available` refuses to serve without one.
        """
        return bool(self.metrics_token) or self.environment == "production"

    @property
    def metrics_available(self) -> bool:
        """Whether GET /metrics serves anything at all."""
        if not self.metrics_enabled:
            return False
        if self.environment == "production" and not self.metrics_token:
            return False
        return True

    @property
    def sentry_enabled(self) -> bool:
        return bool(self.sentry_dsn)

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
