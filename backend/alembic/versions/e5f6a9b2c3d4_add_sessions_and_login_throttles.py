"""add user_sessions and login_throttles

Revision ID: e5f6a9b2c3d4
Revises: d4e5f6a9b2c3
Create Date: 2026-08-31 22:00:00.000000

Sessions become revocable: tokens issued from here on carry the id of a
``user_sessions`` row, which the auth dependency checks on every request.
Tokens issued before this migration carry no session id and keep working
until they expire on their own.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e5f6a9b2c3d4"
down_revision: str | None = "d4e5f6a9b2c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])

    op.create_table(
        "login_throttles",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("scope", sa.String(length=128), nullable=False),
        sa.Column("failures", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_login_throttles_scope", "login_throttles", ["scope"], unique=True
    )


def downgrade() -> None:
    op.drop_index("ix_login_throttles_scope", table_name="login_throttles")
    op.drop_table("login_throttles")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
