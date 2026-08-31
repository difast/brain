"""Admin service — org/user provisioning and the invite lifecycle.

The admin panel is unlocked by a single shared password (no email login). Once
unlocked, an administrator creates organizations and issues invites; invited
people redeem their invite to create an account with a password of their own.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.security import (
    create_admin_token,
    create_user_token,
    generate_invite_token,
    hash_password,
)
from app.models.invite import Invite
from app.models.organization import Organization
from app.models.robot import Robot
from app.models.user import User, UserRole

logger = get_logger("admin")


class AdminService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Gate ---

    def authenticate(self, password: str) -> str:
        """Check the shared admin password; return an admin-panel token."""
        expected = settings.admin_panel_password
        if not password or password != expected:
            logger.info("admin_login_failed")
            raise AuthError("Invalid admin password.")
        logger.info("admin_login_ok")
        return create_admin_token()

    # --- Organizations ---

    async def list_organizations(self) -> list[Organization]:
        stmt = select(Organization).order_by(Organization.created_at.asc())
        return list((await self.session.scalars(stmt)).all())

    async def create_organization(self, name: str) -> Organization:
        org = Organization(name=name.strip())
        self.session.add(org)
        await self.session.flush()
        await self.session.refresh(org)
        logger.info("org_created", org_id=org.id, name=org.name)
        return org

    async def _org_or_404(self, organization_id: str) -> Organization:
        org = await self.session.get(Organization, organization_id)
        if org is None:
            raise NotFoundError("Organization not found.")
        return org

    async def delete_organization(self, organization_id: str) -> None:
        """Delete an organization — only once it has no users or devices left.

        A cascading delete of an entire tenant's fleet (robots, tasks,
        telemetry, decision history) is too destructive for a single click in
        the admin panel; require the operator to remove those first.
        """
        org = await self._org_or_404(organization_id)
        user_count = await self.session.scalar(
            select(func.count())
            .select_from(User)
            .where(User.organization_id == organization_id)
        )
        if user_count:
            raise ConflictError(
                "Cannot delete an organization that still has users. Remove "
                "them first."
            )
        robot_count = await self.session.scalar(
            select(func.count())
            .select_from(Robot)
            .where(Robot.organization_id == organization_id)
        )
        if robot_count:
            raise ConflictError(
                "Cannot delete an organization that still has devices. "
                "Remove them first."
            )
        # No users/devices left — safe to drop any leftover unused invites too.
        await self.session.execute(
            delete(Invite).where(Invite.organization_id == organization_id)
        )
        await self.session.delete(org)
        await self.session.flush()
        logger.info("org_deleted", org_id=organization_id)

    # --- Users ---

    async def list_users(self) -> list[User]:
        stmt = select(User).order_by(User.created_at.asc())
        return list((await self.session.scalars(stmt)).all())

    async def delete_user(self, user_id: str) -> None:
        user = await self.session.get(User, user_id)
        if user is None:
            raise NotFoundError("User not found.")
        await self.session.delete(user)
        await self.session.flush()
        logger.info("user_deleted", user_id=user_id)

    # --- Invites ---

    async def create_invite(
        self, email: str, organization_id: str, role: UserRole
    ) -> tuple[Invite, Organization]:
        org = await self._org_or_404(organization_id)
        existing = await self.session.scalar(
            select(func.count()).select_from(User).where(User.email == email)
        )
        if existing:
            raise ConflictError("A user with this email already exists.")
        invite = Invite(
            token=generate_invite_token(),
            email=email,
            organization_id=organization_id,
            role=role,
            expires_at=datetime.now(UTC)
            + timedelta(hours=settings.invite_ttl_hours),
        )
        self.session.add(invite)
        await self.session.flush()
        await self.session.refresh(invite)
        logger.info("invite_created", invite_id=invite.id, email=email)
        return invite, org

    async def list_invites(self) -> list[tuple[Invite, Organization]]:
        stmt = (
            select(Invite, Organization)
            .join(Organization, Invite.organization_id == Organization.id)
            .order_by(Invite.created_at.desc())
        )
        rows = await self.session.execute(stmt)
        return [(inv, org) for inv, org in rows.all()]

    async def delete_invite(self, invite_id: str) -> None:
        invite = await self.session.get(Invite, invite_id)
        if invite is None:
            raise NotFoundError("Invite not found.")
        await self.session.delete(invite)
        await self.session.flush()
        logger.info("invite_deleted", invite_id=invite_id)

    async def _live_invite(self, token: str) -> tuple[Invite, Organization]:
        row = (
            await self.session.execute(
                select(Invite, Organization)
                .join(Organization, Invite.organization_id == Organization.id)
                .where(Invite.token == token)
            )
        ).first()
        if row is None:
            raise NotFoundError("Invite not found.")
        return row[0], row[1]

    @staticmethod
    def _is_live(invite: Invite) -> bool:
        if invite.accepted_at is not None:
            return False
        expires = invite.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        return expires >= datetime.now(UTC)

    async def get_invite_public(
        self, token: str
    ) -> tuple[Invite, Organization, bool]:
        invite, org = await self._live_invite(token)
        return invite, org, self._is_live(invite)

    async def accept_invite(
        self, token: str, password: str
    ) -> tuple[User, Organization, str]:
        invite, org = await self._live_invite(token)
        if invite.accepted_at is not None:
            raise ConflictError("This invite has already been used.")
        if not self._is_live(invite):
            raise ConflictError("This invite has expired.")

        # Guard against a race where the email was provisioned meanwhile.
        clash = await self.session.scalar(
            select(func.count()).select_from(User).where(User.email == invite.email)
        )
        if clash:
            raise ConflictError("A user with this email already exists.")

        user = User(
            email=invite.email,
            password=hash_password(password),
            organization_id=invite.organization_id,
            role=invite.role,
        )
        self.session.add(user)
        invite.accepted_at = datetime.now(UTC)
        await self.session.flush()
        await self.session.refresh(user)

        token_str = create_user_token(
            user.id, user.organization_id, user.role.value
        )
        logger.info("invite_accepted", user_id=user.id, org_id=org.id)
        return user, org, token_str
