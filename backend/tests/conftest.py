"""Pytest fixtures.

Tests run fully offline: a SQLite in-memory database replaces Postgres, a no-op
replaces S3, and the Claude brain runs in mock mode (no ANTHROPIC_API_KEY).
Presence is DB-based (no Redis). This keeps unit tests fast and hermetic while
exercising the real service/route code paths.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

# Force hermetic mock mode before importing the app/config. The execution
# environment may inject ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL — clear them so
# tests never hit a real endpoint.
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["ANTHROPIC_BASE_URL"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["OPENAI_BASE_URL"] = ""
os.environ["LLM_PROVIDER"] = "auto"
os.environ["DEMO_MODE"] = "false"
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.deps import get_brain, get_storage
from app.core.database import Base, get_session
from app.core.security import create_user_token, hash_password
from app.main import create_app
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.services.decision_engine import DecisionEngine
from app.services.seed_service import (
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_ID,
    SEED_ADMIN_PASSWORD,
    SEED_ORG_ID,
    SEED_ORG_NAME,
)


class FakeStorage:
    async def ensure_bucket(self) -> None:
        pass

    async def upload_frame(self, robot_id, data, content_type="image/jpeg"):
        return f"memory://frames/{robot_id}/test.jpg"

    async def presign(self, key, expires=3600):
        return f"memory://{key}"


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session_factory(engine):
    """A session factory bound to the test engine (for direct DB setup)."""
    return async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )


@pytest_asyncio.fixture
async def app(engine, session_factory):
    """The configured FastAPI app with a seeded org + admin user."""

    async def _get_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    storage = FakeStorage()
    brain = DecisionEngine()  # mock mode (no provider configured)

    # Seed the tenant identity (org + admin) on the test engine, mirroring what
    # the app does at startup, so login and data isolation can be exercised.
    async with session_factory() as s:
        s.add(Organization(id=SEED_ORG_ID, name=SEED_ORG_NAME))
        await s.flush()
        s.add(
            User(
                id=SEED_ADMIN_ID,
                email=SEED_ADMIN_EMAIL,
                password=hash_password(SEED_ADMIN_PASSWORD),
                organization_id=SEED_ORG_ID,
                role=UserRole.admin,
            )
        )
        await s.commit()

    application = create_app()
    application.dependency_overrides[get_session] = _get_session
    application.dependency_overrides[get_storage] = lambda: storage
    application.dependency_overrides[get_brain] = lambda: brain
    return application


@pytest_asyncio.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    # Default all dashboard requests to the seeded admin (org: Mevratek). Device
    # endpoints receive an explicit robot-token header per request, which
    # overrides this default — so device auth is still exercised, and a user
    # token presented to a device endpoint is correctly rejected (not a robot).
    admin_token = create_user_token(SEED_ADMIN_ID, SEED_ORG_ID, "admin")
    default_headers = {"Authorization": f"Bearer {admin_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://test", headers=default_headers
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def anon_client(app) -> AsyncIterator[AsyncClient]:
    """A client that sends no Authorization header by default."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth() -> dict[str, str]:
    """Explicit Authorization header for the seeded admin (org: Mevratek)."""
    token = create_user_token(SEED_ADMIN_ID, SEED_ORG_ID, "admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def rover_payload() -> dict:
    return {
        "name": "scout-01",
        "robot_type": "rover",
        "capabilities": [
            {
                "type": "move_forward",
                "description": "Drive forward",
                "value": {"type": "number", "min": 0, "max": 1, "unit": "m"},
            },
            {
                "type": "turn_left",
                "description": "Turn left in degrees",
                "value": {"type": "number", "min": 0, "max": 180, "unit": "deg"},
            },
        ],
        "meta": {"firmware": "1.0.0"},
    }


API = "/api/v1"


@pytest.fixture
def mailbox(monkeypatch) -> list[dict]:
    """Turn email on and capture every message instead of sending it.

    Returns the list messages land in: {to, subject, html, text}.
    """
    from app.core.config import settings
    from app.services import mailer

    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(settings, "smtp_user", "info@mevratek.ru")
    monkeypatch.setattr(settings, "smtp_password", "secret")

    sent: list[dict] = []

    async def _capture(to: str, subject: str, html: str, text: str) -> None:
        sent.append({"to": to, "subject": subject, "html": html, "text": text})

    monkeypatch.setattr(mailer, "send_email", _capture)

    async def _capture_quietly(to: str, subject: str, html: str, text: str) -> bool:
        await _capture(to, subject, html, text)
        return True

    monkeypatch.setattr(mailer, "send_email_quietly", _capture_quietly)
    return sent


@pytest.fixture
def broken_mailbox(monkeypatch) -> None:
    """Email configured, but the SMTP server refuses every message."""
    from app.core.config import settings
    from app.services import mailer

    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(settings, "smtp_user", "info@mevratek.ru")
    monkeypatch.setattr(settings, "smtp_password", "secret")

    async def _fail(to: str, subject: str, html: str, text: str) -> None:
        raise mailer.EmailDeliveryError("connection refused")

    monkeypatch.setattr(mailer, "send_email", _fail)
