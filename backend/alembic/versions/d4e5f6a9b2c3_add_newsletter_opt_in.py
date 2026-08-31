"""add users.newsletter_opt_in

Revision ID: d4e5f6a9b2c3
Revises: c3d4e5f6a9b1
Create Date: 2026-08-31 20:00:00.000000

Consent starts on: the column defaults to true, so every existing account is
subscribed until its owner turns newsletters off on the account page.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a9b2c3"
down_revision: Union[str, None] = "c3d4e5f6a9b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "newsletter_opt_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "newsletter_opt_in")
