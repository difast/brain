"""Add oauth_clients and oauth_codes for the MCP connector.

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-09-15

Only the front half of the OAuth flow needs storage. The access token issued
at the end is a dashboard session token, so it lands in ``user_sessions``
alongside every other session and needs no table of its own.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "b8c9d0e1f2a3"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None

# Postgres in production, SQLite in tests — the column type follows.
JSON_TYPE = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "oauth_clients",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("client_name", sa.String(length=255), nullable=False),
        sa.Column("redirect_uris", JSON_TYPE, nullable=False),
        sa.Column("grant_types", JSON_TYPE, nullable=False),
        sa.Column("response_types", JSON_TYPE, nullable=False),
        sa.Column(
            "scope", sa.String(length=512), nullable=False, server_default=""
        ),
        sa.Column("client_uri", sa.String(length=1024), nullable=True),
        sa.Column("logo_uri", sa.String(length=1024), nullable=True),
        sa.Column("software_id", sa.String(length=255), nullable=True),
        sa.Column("meta", JSON_TYPE, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "oauth_codes",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "client_id",
            sa.String(length=32),
            sa.ForeignKey("oauth_clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(length=32),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            sa.String(length=32),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("redirect_uri", sa.String(length=1024), nullable=False),
        sa.Column(
            "scope", sa.String(length=512), nullable=False, server_default=""
        ),
        sa.Column("code_challenge", sa.String(length=255), nullable=False),
        sa.Column(
            "code_challenge_method",
            sa.String(length=16),
            nullable=False,
            server_default="S256",
        ),
        sa.Column("resource", sa.String(length=1024), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "used", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("issued_session_id", sa.String(length=32), nullable=True),
        sa.Column("state", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    # Unique: a code is looked up by its hash on every redemption, and two
    # rows sharing one hash would make "single use" unenforceable.
    op.create_index(
        "ix_oauth_codes_code_hash", "oauth_codes", ["code_hash"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_oauth_codes_code_hash", table_name="oauth_codes")
    op.drop_table("oauth_codes")
    op.drop_table("oauth_clients")
