"""Identity seed — the initial organization, admin user and reviewer account.

Users never self-register, so the platform ships with one organization and one
administrator account already provisioned. This runs idempotently on startup
(dev, where tables are auto-created) and is mirrored by the Alembic migration
(prod). Both paths use the *same fixed ids* so they converge on one row.

Any pre-existing devices / tasks / API keys that have no organization yet are
backfilled onto the seed organization, so upgrading an existing deployment
keeps all current data visible to the admin.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.core.security import hash_password, verify_password
from app.models.api_key import ApiKey
from app.models.organization import Organization
from app.models.robot import Robot
from app.models.task import Task
from app.models.user import User, UserRole

logger = get_logger("seed")

# Deterministic ids so the lifespan seed and the migration agree on one row.
SEED_ORG_ID = "00000000000000000000000000000001"
SEED_ADMIN_ID = "00000000000000000000000000000002"
SEED_REVIEWER_ID = "00000000000000000000000000000003"

SEED_ORG_NAME = "Mevratek"
SEED_ADMIN_EMAIL = "info@mevratek.ru"
# The initial admin password — change it from the account page after first
# login. Stored hashed, like every other user's.
SEED_ADMIN_PASSWORD = "11111111"

# The account the connector directories review the MCP integration with.
#
# Its password is published, in website/public/mcp-docs.md — that is the point
# of it. What makes that acceptable is the role: a member can read the
# organization's devices, telemetry and decision journal, and queue a task or
# a simulation, and nothing else. It cannot manage the team, issue API keys,
# delete anything, or reach an admin route. Publishing the administrator's
# credentials instead, which is what the docs used to do, would have handed
# anyone who found the page the whole organization.
#
# Change it by setting REVIEWER_PASSWORD rather than by editing this line, and
# update mcp-docs.md to match.
SEED_REVIEWER_PASSWORD = "7_SE=?JQYiSWnE.M8bFF"  # noqa: S105 — published on purpose


async def seed_identity(session_factory: Any | None = None) -> None:
    """Create the seed org, admin and reviewer (idempotent); backfill orphans.

    ``session_factory`` exists for the tests, which run against their own
    engine: passing it lets them exercise this function rather than a
    hand-written copy of it that can drift out of step.
    """
    factory = session_factory or SessionLocal
    async with factory() as s:
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
                password=hash_password(SEED_ADMIN_PASSWORD),
                organization_id=org.id,
                role=UserRole.admin,
            )
            s.add(admin)
            logger.info("seed_admin_created", email=SEED_ADMIN_EMAIL)

        await _seed_reviewer(s, org.id)

        # Backfill any data that predates multi-tenancy onto the seed org.
        for model in (Robot, Task, ApiKey):
            await s.execute(
                update(model)
                .where(model.organization_id.is_(None))
                .values(organization_id=org.id)
            )

        await s.commit()


async def _seed_reviewer(s: AsyncSession, organization_id: str) -> None:
    """Provision (or rotate) the member-role account used for directory review.

    Create-only by default: an existing row is left alone, so a password
    changed from the account page survives a restart. Setting REVIEWER_PASSWORD
    is the operator saying otherwise, and then it is enforced on every start —
    that is the rotation path.
    """
    if not settings.reviewer_account_enabled:
        return

    email = settings.reviewer_email.strip().lower()
    if not email:
        return
    password = settings.reviewer_password or SEED_REVIEWER_PASSWORD

    reviewer = await s.scalar(select(User).where(User.email == email))
    if reviewer is None:
        s.add(
            User(
                id=SEED_REVIEWER_ID,
                email=email,
                password=hash_password(password),
                organization_id=organization_id,
                role=UserRole.member,
            )
        )
        logger.info("seed_reviewer_created", email=email)
        return

    if settings.reviewer_password and not verify_password(
        settings.reviewer_password, reviewer.password
    ):
        reviewer.password = hash_password(settings.reviewer_password)
        logger.info("seed_reviewer_password_rotated", email=email)
