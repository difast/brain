"""Team management inside one organization.

Distinct from :mod:`app.services.admin_service`, which is the *operator's*
hidden panel and can reach across every tenant. This is the customer's own
view: an organization administrator adds and removes their colleagues, and can
never see or touch another organization.

Every method takes the acting user, so the guards that matter — you may not
remove yourself, and an organization may not be left without an administrator —
are enforced in one place rather than at each call site.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.security import generate_invite_token
from app.models.invite import Invite
from app.models.organization import Organization
from app.models.user import User, UserRole

logger = get_logger("team")


class TeamService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # -- guards ----------------------------------------------------------

    @staticmethod
    def require_admin(actor: User) -> None:
        """Only an organization administrator may change the team."""
        if actor.role != UserRole.admin:
            raise AuthError(
                "Только администратор организации может управлять командой."
            )

    async def _admin_count(self, organization_id: str, *, excluding: str = "") -> int:
        stmt = (
            select(func.count())
            .select_from(User)
            .where(
                User.organization_id == organization_id,
                User.role == UserRole.admin,
            )
        )
        if excluding:
            stmt = stmt.where(User.id != excluding)
        return int(await self.session.scalar(stmt) or 0)

    # -- members ---------------------------------------------------------

    async def list_members(self, organization_id: str) -> list[User]:
        stmt = (
            select(User)
            .where(User.organization_id == organization_id)
            .order_by(User.created_at.asc())
        )
        return list((await self.session.scalars(stmt)).all())

    async def _member(self, user_id: str, organization_id: str) -> User:
        user = await self.session.get(User, user_id)
        # A user in another organization is reported as missing rather than
        # forbidden, so this cannot be used to probe for accounts elsewhere.
        if user is None or user.organization_id != organization_id:
            raise NotFoundError("Участник не найден.")
        return user

    async def remove_member(self, actor: User, user_id: str) -> User:
        """Remove a colleague from the organization (deletes their account)."""
        self.require_admin(actor)
        if user_id == actor.id:
            raise ConflictError(
                "Нельзя удалить себя. Передайте роль администратора коллеге."
            )

        member = await self._member(user_id, actor.organization_id)
        if (
            member.role == UserRole.admin
            and await self._admin_count(actor.organization_id, excluding=member.id) == 0
        ):
            raise ConflictError(
                "В организации должен остаться хотя бы один администратор."
            )

        await self.session.delete(member)
        await self.session.flush()
        logger.info(
            "team_member_removed",
            organization_id=actor.organization_id,
            removed_user_id=user_id,
            by_user_id=actor.id,
        )
        return member

    async def set_role(self, actor: User, user_id: str, role: UserRole) -> User:
        """Promote a colleague to administrator, or demote one."""
        self.require_admin(actor)
        member = await self._member(user_id, actor.organization_id)

        if (
            member.role == UserRole.admin
            and role != UserRole.admin
            and await self._admin_count(actor.organization_id, excluding=member.id) == 0
        ):
            raise ConflictError(
                "В организации должен остаться хотя бы один администратор."
            )

        member.role = role
        await self.session.flush()
        logger.info(
            "team_role_changed",
            organization_id=actor.organization_id,
            user_id=user_id,
            role=role.value,
            by_user_id=actor.id,
        )
        return member

    # -- the organization itself -----------------------------------------

    async def rename_organization(self, actor: User, name: str) -> Organization:
        """Rename the caller's own organization."""
        self.require_admin(actor)
        cleaned = name.strip()
        if not cleaned:
            raise ConflictError("Название организации не может быть пустым.")

        org = await self.session.get(Organization, actor.organization_id)
        if org is None:  # pragma: no cover - integrity safety net
            raise NotFoundError("Организация не найдена.")

        org.name = cleaned
        await self.session.flush()
        logger.info(
            "organization_renamed",
            organization_id=org.id,
            by_user_id=actor.id,
        )
        return org

    # -- leaving ---------------------------------------------------------

    async def can_delete_self(self, actor: User) -> tuple[bool, str, bool]:
        """May this user delete their own account?

        Returns ``(allowed, reason, is_last_member)``. The last member of an
        organization takes the whole organization with them — devices, decisions
        and all — so the caller has to be told that before, not after.
        """
        members = await self.list_members(actor.organization_id)
        is_last_member = len(members) == 1

        if is_last_member:
            return True, "", True

        # Otherwise the organization must keep an administrator.
        if (
            actor.role == UserRole.admin
            and await self._admin_count(actor.organization_id, excluding=actor.id) == 0
        ):
            return (
                False,
                "Вы единственный администратор. Назначьте администратором "
                "коллегу, прежде чем удалять свой аккаунт.",
                False,
            )
        return True, "", False

    async def delete_self(self, actor: User) -> bool:
        """Delete the caller's own account. Returns whether the organization
        went with it.

        Deleting the last member removes the organization too: leaving an
        ownerless tenant behind would strand its devices and data with nobody
        able to reach them.
        """
        allowed, reason, is_last_member = await self.can_delete_self(actor)
        if not allowed:
            raise ConflictError(reason)

        organization_id = actor.organization_id
        await self.session.delete(actor)
        await self.session.flush()

        if is_last_member:
            org = await self.session.get(Organization, organization_id)
            if org is not None:
                # Devices, decisions, telemetry and keys cascade from here.
                await self.session.delete(org)
                await self.session.flush()
            logger.info(
                "organization_deleted_with_last_member",
                organization_id=organization_id,
            )
        else:
            logger.info(
                "account_self_deleted",
                organization_id=organization_id,
                user_id=actor.id,
            )
        return is_last_member

    # -- invites ---------------------------------------------------------

    async def list_invites(self, organization_id: str) -> list[Invite]:
        """Pending invites only — a spent or expired one is not actionable."""
        stmt = (
            select(Invite)
            .where(
                Invite.organization_id == organization_id,
                Invite.accepted_at.is_(None),
                Invite.expires_at > datetime.now(UTC),
            )
            .order_by(Invite.created_at.desc())
        )
        return list((await self.session.scalars(stmt)).all())

    async def invite(self, actor: User, email: str, role: UserRole) -> Invite:
        """Invite a colleague by email. The invite link is the credential."""
        self.require_admin(actor)
        email = email.strip().lower()

        taken = await self.session.scalar(
            select(func.count()).select_from(User).where(User.email == email)
        )
        if taken:
            raise ConflictError("Пользователь с таким адресом уже существует.")

        # Re-inviting the same address replaces the pending invite rather than
        # stacking a second live token for one person.
        pending = await self.session.scalar(
            select(Invite).where(
                Invite.organization_id == actor.organization_id,
                Invite.email == email,
                Invite.accepted_at.is_(None),
            )
        )
        if pending is not None:
            await self.session.delete(pending)
            await self.session.flush()

        invite = Invite(
            token=generate_invite_token(),
            email=email,
            organization_id=actor.organization_id,
            role=role,
            expires_at=datetime.now(UTC) + timedelta(hours=settings.invite_ttl_hours),
        )
        self.session.add(invite)
        await self.session.flush()
        await self.session.refresh(invite)

        logger.info(
            "team_invite_created",
            organization_id=actor.organization_id,
            email=email,
            role=role.value,
            by_user_id=actor.id,
        )
        return invite

    async def revoke_invite(self, actor: User, invite_id: str) -> None:
        self.require_admin(actor)
        invite = await self.session.get(Invite, invite_id)
        if invite is None or invite.organization_id != actor.organization_id:
            raise NotFoundError("Приглашение не найдено.")
        if invite.accepted_at is not None:
            raise ConflictError("Приглашение уже использовано.")

        await self.session.delete(invite)
        await self.session.flush()
        logger.info(
            "team_invite_revoked",
            organization_id=actor.organization_id,
            invite_id=invite_id,
            by_user_id=actor.id,
        )
