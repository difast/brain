"""add contact_leads.phone

Revision ID: f1a2b3c4d5e6
Revises: d3c4e5f6a7b8
Create Date: 2026-08-31 15:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: str | None = "d3c4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "contact_leads", sa.Column("phone", sa.String(length=32), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("contact_leads", "phone")
