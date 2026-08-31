"""hash any remaining plaintext user passwords

Revision ID: a1b2c3d4e5f7
Revises: f1a2b3c4d5e6
Create Date: 2026-08-31 16:00:00.000000

Login now verifies passwords with passlib's pbkdf2_sha256 instead of a plain
``==`` comparison. Every account provisioned before this change (the seed
admin, and anyone who accepted an invite) still has its raw password stored
in the ``users.password`` column — this migration hashes those in place, one
time, so they keep working under the new verification. A value that already
looks like a pbkdf2_sha256 hash is left untouched, which makes this safe to
run more than once.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from passlib.context import CryptContext

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
_HASH_PREFIX = "$pbkdf2-sha256$"


def upgrade() -> None:
    conn = op.get_bind()
    users = sa.table(
        "users", sa.column("id", sa.String), sa.column("password", sa.String)
    )
    rows = conn.execute(sa.select(users.c.id, users.c.password)).fetchall()
    for row in rows:
        if row.password and not row.password.startswith(_HASH_PREFIX):
            conn.execute(
                users.update()
                .where(users.c.id == row.id)
                .values(password=_pwd_context.hash(row.password))
            )


def downgrade() -> None:
    # Original plaintext passwords are not recoverable from their hashes.
    pass
