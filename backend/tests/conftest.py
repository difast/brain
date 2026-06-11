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
from app.main import create_app
from app.services.decision_engine import DecisionEngine


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
async def client(engine) -> AsyncIterator[AsyncClient]:
    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

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

    app = create_app()
    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_brain] = lambda: brain

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


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
