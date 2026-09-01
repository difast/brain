"""add organizations + users and tenant scoping

Adds multi-tenancy:
  * ``organizations`` and ``users`` tables
  * ``organization_id`` on ``robots``, ``tasks`` and ``api_keys``
  * seeds the Mevratek organization + admin user (info@mevratek.ru)
  * backfills all existing devices / tasks / API keys onto that organization

The seed ids match app.services.seed_service so the runtime seed and this
migration converge on one row.

Revision ID: b1a2c3d4e5f6
Revises: 90c4530475f8
Create Date: 2026-08-29 17:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b1a2c3d4e5f6"
down_revision: str | None = "90c4530475f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SEED_ORG_ID = "00000000000000000000000000000001"
SEED_ADMIN_ID = "00000000000000000000000000000002"
SEED_ORG_NAME = "Mevratek"
SEED_ADMIN_EMAIL = "info@mevratek.ru"
SEED_ADMIN_PASSWORD = "11111111"

_SCOPED_TABLES = ("robots", "tasks", "api_keys")


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
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

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index(
        "ix_users_organization_id", "users", ["organization_id"], unique=False
    )

    # Add the tenant column to existing tables (nullable for the backfill).
    for table in _SCOPED_TABLES:
        op.add_column(
            table,
            sa.Column("organization_id", sa.String(length=32), nullable=True),
        )
        op.create_index(
            f"ix_{table}_organization_id", table, ["organization_id"], unique=False
        )

    # Seed the organization + admin user.
    org = sa.table(
        "organizations",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
    )
    users = sa.table(
        "users",
        sa.column("id", sa.String),
        sa.column("email", sa.String),
        sa.column("password", sa.String),
        sa.column("organization_id", sa.String),
        sa.column("role", sa.String),
    )
    op.bulk_insert(org, [{"id": SEED_ORG_ID, "name": SEED_ORG_NAME}])
    op.bulk_insert(
        users,
        [
            {
                "id": SEED_ADMIN_ID,
                "email": SEED_ADMIN_EMAIL,
                "password": SEED_ADMIN_PASSWORD,
                "organization_id": SEED_ORG_ID,
                "role": "admin",
            }
        ],
    )

    # Backfill existing rows onto the seed organization, then lock the column
    # and add the FK. batch_alter_table keeps this portable: a plain ALTER on
    # Postgres, a table-rebuild on SQLite (which cannot ALTER-add NOT NULL/FK).
    for table in _SCOPED_TABLES:
        op.execute(
            sa.text(
                f"UPDATE {table} SET organization_id = :org "
                "WHERE organization_id IS NULL"
            ).bindparams(org=SEED_ORG_ID)
        )
        with op.batch_alter_table(table) as batch:
            batch.alter_column(
                "organization_id",
                existing_type=sa.String(length=32),
                nullable=False,
            )
            batch.create_foreign_key(
                f"fk_{table}_organization_id",
                "organizations",
                ["organization_id"],
                ["id"],
                ondelete="CASCADE",
            )


def downgrade() -> None:
    for table in _SCOPED_TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(
                f"fk_{table}_organization_id", type_="foreignkey"
            )
        op.drop_index(f"ix_{table}_organization_id", table_name=table)
        op.drop_column(table, "organization_id")

    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("organizations")
