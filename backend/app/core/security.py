"""Security helpers: robot API token issuing/verification and key hashing.

Robots authenticate with a bearer token (JWT) issued at registration time.
The token embeds the ``robot_id`` and is signed with the application secret.
A hashed API key is also stored so tokens can be revoked / rotated later.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

# pbkdf2_sha256 is pure-Python (no native bcrypt dependency) and has no
# 72-byte input limit — well-suited to hashing opaque API keys.
_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def generate_api_key() -> str:
    """Generate a random opaque API key (shown once to the robot owner)."""
    return f"rbt_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    return _pwd_context.hash(api_key)


def verify_api_key(api_key: str, hashed: str) -> bool:
    return _pwd_context.verify(api_key, hashed)


def create_robot_token(robot_id: str, extra: dict[str, Any] | None = None) -> str:
    """Issue a signed JWT bearer token for a robot."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": robot_id,
        "type": "robot",
        "iat": now,
        "exp": now + timedelta(days=settings.robot_token_ttl_days),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_robot_token(token: str) -> dict[str, Any]:
    """Decode and validate a robot JWT. Raises ``jwt.PyJWTError`` on failure."""
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
    )


# --- Dashboard user tokens -------------------------------------------------

# Dashboard sessions are shorter-lived than robot tokens.
USER_TOKEN_TTL_HOURS = 24 * 7


def create_user_token(
    user_id: str, organization_id: str, role: str
) -> str:
    """Issue a signed JWT session token for a dashboard user."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": user_id,
        "type": "user",
        "org": organization_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=USER_TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_user_token(token: str) -> dict[str, Any]:
    """Decode and validate a user session JWT. Raises on failure."""
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
    )
