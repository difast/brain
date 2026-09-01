"""add users.alerts_opt_in and robots.alerted_status

Revision ID: f6a9b2c3d4e5
Revises: e5f6a9b2c3d4
Create Date: 2026-08-31 23:00:00.000000

Device alerts are on for every account by default; each user turns their own
off on the account page. ``robots.alerted_status`` remembers the state the
owners were last told about, so the watcher mails changes, not every pass.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f6a9b2c3d4e5"
down_revision: str | None = "e5f6a9b2c3d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "alerts_opt_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "robots", sa.Column("alerted_status", sa.String(length=16), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("robots", "alerted_status")
    op.drop_column("users", "alerts_opt_in")
