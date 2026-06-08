"""API key management — generate, list, revoke and verify per-user keys."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.core.security import hash_api_key, verify_api_key
from app.models.api_key import ApiKey

logger = get_logger("api_keys")

_PREFIX_LEN = 12  # chars of the key surfaced in the UI ("cbk_" + 8)


def _generate_key() -> str:
    return f"cbk_{secrets.token_urlsafe(32)}"


class ApiKeyService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, name: str) -> tuple[ApiKey, str]:
        raw = _generate_key()
        api_key = ApiKey(
            name=name,
            prefix=raw[:_PREFIX_LEN],
            key_hash=hash_api_key(raw),
            revoked=False,
        )
        self.session.add(api_key)
        await self.session.flush()
        await self.session.refresh(api_key)
        logger.info("api_key_created", api_key_id=api_key.id, name=name)
        return api_key, raw

    async def list(self) -> list[ApiKey]:
        stmt = select(ApiKey).order_by(ApiKey.created_at.desc())
        return list((await self.session.scalars(stmt)).all())

    async def revoke(self, api_key_id: str) -> ApiKey:
        api_key = await self.session.get(ApiKey, api_key_id)
        if api_key is None:
            raise NotFoundError("API key not found.")
        api_key.revoked = True
        await self.session.flush()
        logger.info("api_key_revoked", api_key_id=api_key_id)
        return api_key

    async def verify(self, raw_key: str) -> ApiKey | None:
        """Validate a raw key; returns the active ApiKey or None."""
        if not raw_key:
            return None
        stmt = select(ApiKey).where(
            ApiKey.prefix == raw_key[:_PREFIX_LEN], ApiKey.revoked.is_(False)
        )
        for candidate in (await self.session.scalars(stmt)).all():
            if verify_api_key(raw_key, candidate.key_hash):
                candidate.last_used_at = datetime.now(UTC)
                await self.session.flush()
                return candidate
        return None
