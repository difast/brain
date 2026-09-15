"""OAuth 2.0 clients and authorization codes.

Only two tables are needed on top of the existing session machinery, because
the access token an MCP client ends up holding *is* a dashboard session token
with a narrowed scope: it carries a ``sid`` pointing at a ``user_sessions``
row, so revoking that session in the account page disconnects the connector
too, and the connection shows up in the same list as any other device.

What is genuinely new is the front half of the flow — who asked for access
(the client) and the one-time code that proves the user agreed (the code).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin

# Postgres gets JSONB; SQLite (tests, local stand) gets plain JSON.
_JSON = JSON().with_variant(JSONB(), "postgresql")


class OAuthClient(UUIDMixin, TimestampMixin, Base):
    """An MCP client that registered itself through RFC 7591.

    Claude and ChatGPT do not use pre-provisioned credentials: on first
    connect they POST their metadata to the registration endpoint and receive
    a ``client_id``. Every such client is public (no secret) and therefore
    must use PKCE — there is nowhere in a browser-driven flow to keep a
    secret, and pretending otherwise would be security theatre.
    """

    __tablename__ = "oauth_clients"

    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Exact-match allowlist. An attacker who can register a client cannot use
    # it to steal a code unless the victim also approves the consent screen
    # for that client's own name, and the code only ever goes to a URI listed
    # here at registration time.
    redirect_uris: Mapped[list[str]] = mapped_column(
        _JSON, default=list, nullable=False
    )
    grant_types: Mapped[list[str]] = mapped_column(
        _JSON, default=list, nullable=False
    )
    response_types: Mapped[list[str]] = mapped_column(
        _JSON, default=list, nullable=False
    )
    scope: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    client_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    logo_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # Kept for the audit trail: which software claimed this registration.
    software_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta: Mapped[dict[str, Any]] = mapped_column(_JSON, default=dict, nullable=False)


class OAuthCode(UUIDMixin, TimestampMixin, Base):
    """A one-time authorization code, plus the PKCE challenge that binds it.

    The code itself is never stored — only its SHA-256. A dump of this table
    therefore does not let anyone redeem outstanding codes, which matters
    because a code is a bearer credential for the seconds it lives.
    """

    __tablename__ = "oauth_codes"

    code_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("oauth_clients.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    redirect_uri: Mapped[str] = mapped_column(String(1024), nullable=False)
    scope: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    # RFC 7636. Only S256 is accepted — "plain" defeats the point.
    code_challenge: Mapped[str] = mapped_column(String(255), nullable=False)
    code_challenge_method: Mapped[str] = mapped_column(
        String(16), default="S256", nullable=False
    )
    # RFC 8707: which resource the token is for. Stored so the issued token
    # cannot be replayed against a different audience.
    resource: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Single use. Redeeming sets this; a second attempt is refused *and*
    # revokes the session already issued, per OAuth security BCP.
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    issued_session_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    state: Mapped[str | None] = mapped_column(Text, nullable=True)
