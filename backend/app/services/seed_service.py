"""Identity seed — the initial organization + admin user.

Users never self-register, so the platform ships with one organization and one
administrator account already provisioned. This runs idempotently on startup
(dev, where tables are auto-created) and is mirrored by the Alembic migration
(prod). Both paths use the *same fixed ids* so they converge on one row.

Any pre-existing devices / tasks / API keys that have no organization yet are
backfilled onto the seed organization, so upgrading an existing deployment
keeps all current data visible to the admin.
"""

from __future__ import annotations

from sqlalchemy import select, update

from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.models.api_key import ApiKey
from app.models.organization import Organization
from app.models.robot import Robot
from app.models.task import Task
from app.models.user import User, UserRole

logger = get_logger("seed")

# Deterministic ids so the lifespan seed and the migration agree on one row.
SEED_ORG_ID = "00000000000000000000000000000001"
SEED_ADMIN_ID = "00000000000000000000000000000002"

SEED_ORG_NAME = "Mevratek"
SEED_ADMIN_EMAIL = "info@mevratek.ru"
# Plain-text by explicit request for this iteration (see User model docstring).
SEED_ADMIN_PASSWORD = "11111111"


async def seed_identity() -> None:
    """Create the seed org + admin (idempotent) and backfill orphan rows."""
    async with SessionLocal() as s:
        org = await s.get(Organization, SEED_ORG_ID)
        if org is None:
            org = Organization(id=SEED_ORG_ID, name=SEED_ORG_NAME)
            s.add(org)
            await s.flush()
            logger.info("seed_org_created", org_id=org.id)

        admin = await s.scalar(
            select(User).where(User.email == SEED_ADMIN_EMAIL)
        )
        if admin is None:
            admin = User(
                id=SEED_ADMIN_ID,
                email=SEED_ADMIN_EMAIL,
                password=SEED_ADMIN_PASSWORD,
                organization_id=org.id,
                role=UserRole.admin,
            )
            s.add(admin)
            logger.info("seed_admin_created", email=SEED_ADMIN_EMAIL)

        # Backfill any data that predates multi-tenancy onto the seed org.
        for model in (Robot, Task, ApiKey):
            await s.execute(
                update(model)
                .where(model.organization_id.is_(None))
                .values(organization_id=org.id)
            )

        await s.commit()
