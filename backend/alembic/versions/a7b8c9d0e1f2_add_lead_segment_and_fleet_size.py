"""add contact_leads.segment and contact_leads.fleet_size

Revision ID: a7b8c9d0e1f2
Revises: f6a9b2c3d4e5
Create Date: 2026-09-01 18:00:00.000000

Qualifies an inbound lead before the first call: which of the four audiences
is writing, and how large their fleet is — the two things that decide both the
conversation and the price. Both are nullable: leads submitted before this
migration have neither, and the fields stay optional on the form.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a9b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contact_leads", sa.Column("segment", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "contact_leads",
        sa.Column("fleet_size", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("contact_leads", "fleet_size")
    op.drop_column("contact_leads", "segment")
