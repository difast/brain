"""Authentication service — verify credentials and load the current user.

Users are provisioned by an administrator (no self-registration). Login is two
steps when email is configured: the password is checked first, then a code
emailed to the account address. The session token embeds the user's
organization, so every subsequent request is scoped to that tenant.
"""

from __future__ import annotations

from datetime import UTC, datetime

import jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthError, ConflictError
from app.core.logging import get_logger
from app.core.security import (
    create_user_token,
    decode_login_challenge_token,
    hash_password,
    verify_password,
)
from app.models.audit_log import AuditAction
from app.models.organization import Organization
from app.models.user import User
from app.services.audit_service import AuditService

logger = get_logger("auth")


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.audit = AuditService(session)

    async def verify_credentials(
        self, email: str, password: str, ip: str | None = None
    ) -> tuple[User, Organization]:
        """Check email + password. The first step of logging in."""
        user = await self.session.scalar(
            select(User).where(User.email == email.strip().lower())
        )
        # Same generic error whether the email is unknown or the password is
        # wrong — don't reveal which accounts exist.
        if user is None or not verify_password(password, user.password):
            logger.info("login_failed", email=email)
            if user is not None:
                await self.audit.record_and_commit(
                    user.id, AuditAction.login_failed, ip
                )
            raise AuthError("Invalid email or password.")

        org = await self.session.get(Organization, user.organization_id)
        if org is None:  # pragma: no cover - integrity safety net
            raise AuthError("Account is not attached to an organization.")
        return user, org

    async def user_from_challenge(self, challenge: str) -> tuple[User, Organization]:
        """Resolve the user behind a login-challenge token."""
        try:
            payload = decode_login_challenge_token(challenge)
        except jwt.PyJWTError as exc:
            raise AuthError("Login session expired. Start again.") from exc
        if payload.get("type") != "login_challenge":
            raise AuthError("Login session expired. Start again.")
        user = await self.session.get(User, str(payload.get("sub")))
        if user is None:
            raise AuthError("Login session expired. Start again.")
        org = await self.session.get(Organization, user.organization_id)
        if org is None:  # pragma: no cover - integrity safety net
            raise AuthError("Account is not attached to an organization.")
        return user, org

    async def issue_session(
        self, user: User, org: Organization, ip: str | None = None
    ) -> tuple[str, bool]:
        """Mint a session token. Returns (token, is_first_login)."""
        token = create_user_token(user.id, user.organization_id, user.role.value)
        first_login = user.welcomed_at is None
        if first_login:
            user.welcomed_at = datetime.now(UTC)
            await self.session.flush()
        logger.info("login_ok", user_id=user.id, org_id=org.id)
        await self.audit.record(user.id, AuditAction.login, ip)
        return token, first_login

    async def authenticate(
        self, email: str, password: str, ip: str | None = None
    ) -> tuple[User, Organization, str]:
        """Single-step login (used when email confirmation is not configured)."""
        user, org = await self.verify_credentials(email, password, ip)
        token, _ = await self.issue_session(user, org, ip)
        return user, org, token

    async def get_user(self, user_id: str) -> User | None:
        return await self.session.get(User, user_id)

    def check_password(self, user: User, password: str) -> None:
        if not verify_password(password, user.password):
            raise AuthError("Current password is incorrect.")

    async def assert_email_available(self, user: User, new_email: str) -> None:
        taken = await self.session.scalar(
            select(func.count())
            .select_from(User)
            .where(User.email == new_email, User.id != user.id)
        )
        if taken:
            raise ConflictError("A user with this email already exists.")

    async def set_password(
        self, user: User, new_password: str, ip: str | None = None
    ) -> None:
        user.password = hash_password(new_password)
        await self.session.flush()
        logger.info("password_changed", user_id=user.id)
        await self.audit.record(user.id, AuditAction.password_changed, ip)

    async def set_email(
        self, user: User, new_email: str, ip: str | None = None
    ) -> None:
        await self.assert_email_available(user, new_email)
        user.email = new_email
        await self.session.flush()
        logger.info("email_changed", user_id=user.id)
        await self.audit.record(user.id, AuditAction.email_changed, ip)

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
        ip: str | None = None,
    ) -> None:
        """Change a password directly (no emailed code — email not configured)."""
        self.check_password(user, current_password)
        await self.set_password(user, new_password, ip)

    async def change_email(
        self,
        user: User,
        current_password: str,
        new_email: str,
        ip: str | None = None,
    ) -> None:
        """Change an email directly (no emailed code — email not configured)."""
        self.check_password(user, current_password)
        await self.set_email(user, new_email, ip)

    async def set_newsletter_opt_in(self, user: User, opted_in: bool) -> None:
        """Turn newsletters on or off for this user (transactional mail is
        never affected)."""
        user.newsletter_opt_in = opted_in
        await self.session.flush()
        logger.info("newsletter_opt_in_changed", user_id=user.id, value=opted_in)

    async def update_avatar(
        self, user: User, avatar: str | None, ip: str | None = None
    ) -> None:
        """Set or clear a logged-in user's own avatar."""
        user.avatar = avatar
        await self.session.flush()
        logger.info("avatar_changed", user_id=user.id, cleared=avatar is None)
        await self.audit.record(user.id, AuditAction.avatar_changed, ip)
