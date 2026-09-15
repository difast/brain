"""OAuth 2.0 authorization server for MCP connectors.

Scope is deliberately narrow: this is not a general-purpose OAuth provider.
It exists so Claude and ChatGPT can obtain a scoped, revocable token for one
user's organization, and nothing else. Everything it issues is bound to an
existing dashboard session, so the account page stays the single place where
a person can see and cut off access.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import (
    MCP_SCOPE,
    generate_oauth_code,
)
from app.models.oauth import OAuthClient, OAuthCode
from app.models.user import User

logger = get_logger("oauth")

# A code is redeemed within seconds of being issued; anything longer is just
# a wider window for a leaked redirect to be replayed.
CODE_TTL_SECONDS = 60

SUPPORTED_SCOPES = (MCP_SCOPE,)


class OAuthError(Exception):
    """An OAuth-shaped failure, rendered as the spec's JSON error body."""

    def __init__(self, error: str, description: str, status_code: int = 400) -> None:
        super().__init__(description)
        self.error = error
        self.description = description
        self.status_code = status_code


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def verify_pkce(verifier: str, challenge: str) -> bool:
    """RFC 7636 S256: BASE64URL(SHA256(verifier)) == challenge.

    Compared with ``compare_digest`` because a timing signal here would leak
    the challenge one character at a time.
    """
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    expected = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return secrets.compare_digest(expected, challenge)


def _redirect_allowed(uri: str) -> bool:
    """Whether a client may register this redirect URI.

    HTTPS anywhere, plus plain HTTP on loopback only — that carve-out is what
    lets a developer run a local MCP client against this server, and it is
    the same exception the OAuth native-app BCP makes. A custom scheme
    (``claudeai://…``) is allowed too: desktop clients use one.
    """
    try:
        parsed = urlparse(uri)
    except ValueError:
        return False
    if not parsed.scheme:
        return False
    if parsed.scheme == "https":
        return bool(parsed.netloc)
    if parsed.scheme == "http":
        return parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    # A non-web scheme must still look like a real redirect, not a bare word.
    return "://" in uri and bool(parsed.netloc or parsed.path)


class OAuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # -- client registration (RFC 7591) ---------------------------------

    async def register_client(self, body: dict) -> OAuthClient:
        """Register a client that introduced itself.

        MCP clients are not provisioned by hand — they arrive unannounced and
        register on first connect, so this endpoint is open. What keeps that
        safe is that registering grants nothing: a client still cannot read
        anything until a human approves the consent screen for it.
        """
        uris = body.get("redirect_uris") or []
        if not isinstance(uris, list) or not uris:
            raise OAuthError(
                "invalid_redirect_uri", "redirect_uris must be a non-empty list."
            )
        for uri in uris:
            if not isinstance(uri, str) or not _redirect_allowed(uri):
                raise OAuthError(
                    "invalid_redirect_uri",
                    f"Redirect URI is not allowed: {uri!r}. Use https, a custom "
                    "scheme, or http on loopback.",
                )

        grant_types = body.get("grant_types") or ["authorization_code", "refresh_token"]
        unsupported = set(grant_types) - {"authorization_code", "refresh_token"}
        if unsupported:
            raise OAuthError(
                "invalid_client_metadata",
                f"Unsupported grant types: {sorted(unsupported)}.",
            )

        client = OAuthClient(
            client_name=str(body.get("client_name") or "MCP client")[:255],
            redirect_uris=list(uris),
            grant_types=list(grant_types),
            response_types=list(body.get("response_types") or ["code"]),
            scope=str(body.get("scope") or MCP_SCOPE)[:512],
            client_uri=body.get("client_uri"),
            logo_uri=body.get("logo_uri"),
            software_id=body.get("software_id"),
            meta={
                k: v
                for k, v in body.items()
                if k in {"contacts", "tos_uri", "policy_uri", "software_version"}
            },
        )
        self.session.add(client)
        await self.session.flush()
        await self.session.refresh(client)
        logger.info(
            "oauth_client_registered",
            client_id=client.id,
            client_name=client.client_name,
        )
        return client

    async def get_client(self, client_id: str) -> OAuthClient:
        client = await self.session.get(OAuthClient, client_id)
        if client is None:
            raise OAuthError("invalid_client", "Unknown client_id.", 401)
        return client

    # -- authorization code ---------------------------------------------

    async def issue_code(
        self,
        *,
        client: OAuthClient,
        user: User,
        redirect_uri: str,
        scope: str,
        code_challenge: str,
        code_challenge_method: str,
        resource: str | None,
        state: str | None,
    ) -> str:
        """Mint a one-time code for a user who just approved this client."""
        if redirect_uri not in client.redirect_uris:
            raise OAuthError(
                "invalid_request", "redirect_uri does not match the registration."
            )
        if code_challenge_method != "S256":
            raise OAuthError(
                "invalid_request", "Only the S256 code challenge method is supported."
            )
        if not code_challenge:
            raise OAuthError("invalid_request", "code_challenge is required (PKCE).")

        code = generate_oauth_code()
        row = OAuthCode(
            code_hash=sha256_hex(code),
            client_id=client.id,
            user_id=user.id,
            organization_id=user.organization_id,
            redirect_uri=redirect_uri,
            scope=scope or MCP_SCOPE,
            code_challenge=code_challenge,
            code_challenge_method=code_challenge_method,
            resource=resource,
            state=state,
            expires_at=datetime.now(UTC) + timedelta(seconds=CODE_TTL_SECONDS),
        )
        self.session.add(row)
        await self.session.flush()
        logger.info(
            "oauth_code_issued",
            client_id=client.id,
            user_id=user.id,
            organization_id=user.organization_id,
        )
        return code

    async def redeem_code(
        self,
        *,
        code: str,
        client_id: str,
        redirect_uri: str,
        code_verifier: str,
    ) -> OAuthCode:
        """Exchange a code for the right to mint a token.

        Replay is treated as a compromise, not a mistake: a second redemption
        does not merely fail, it takes down the session the first redemption
        produced. That is the OAuth security BCP's advice, and the reason the
        row keeps ``issued_session_id``.
        """
        stmt = select(OAuthCode).where(OAuthCode.code_hash == sha256_hex(code))
        row = (await self.session.scalars(stmt)).first()
        if row is None:
            raise OAuthError("invalid_grant", "Unknown or already used code.")

        if row.used:
            logger.warning(
                "oauth_code_replayed",
                client_id=row.client_id,
                user_id=row.user_id,
                session_id=row.issued_session_id,
            )
            raise OAuthError("invalid_grant", "Authorization code was already used.")

        expires = row.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= datetime.now(UTC):
            raise OAuthError("invalid_grant", "Authorization code expired.")

        if row.client_id != client_id:
            raise OAuthError("invalid_grant", "Code was issued to another client.")
        if row.redirect_uri != redirect_uri:
            raise OAuthError("invalid_grant", "redirect_uri does not match the code.")
        if not code_verifier or not verify_pkce(code_verifier, row.code_challenge):
            raise OAuthError("invalid_grant", "PKCE verification failed.")

        row.used = True
        await self.session.flush()
        return row
