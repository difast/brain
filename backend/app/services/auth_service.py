"""Authentication service — verify credentials and load the current user.

Users are provisioned by an administrator (no self-registration). Login checks
the email + password and issues a signed session token embedding the user's
organization, so every subsequent request is scoped to that tenant.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthError
from app.core.logging import get_logger
from app.core.security import create_user_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User

logger = get_logger("auth")


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def authenticate(
        self, email: str, password: str
    ) -> tuple[User, Organization, str]:
        """Verify credentials; return (user, organization, session_token)."""
        user = await self.session.scalar(
            select(User).where(User.email == email.strip().lower())
        )
        # Same generic error whether the email is unknown or the password is
        # wrong — don't reveal which accounts exist.
        if user is None or not verify_password(password, user.password):
            logger.info("login_failed", email=email)
            raise AuthError("Invalid email or password.")

        org = await self.session.get(Organization, user.organization_id)
        if org is None:  # pragma: no cover - integrity safety net
            raise AuthError("Account is not attached to an organization.")

        token = create_user_token(user.id, user.organization_id, user.role.value)
        logger.info("login_ok", user_id=user.id, org_id=org.id)
        return user, org, token

    async def get_user(self, user_id: str) -> User | None:
        return await self.session.get(User, user_id)

    async def change_password(
        self, user: User, current_password: str, new_password: str
    ) -> None:
        """Change a logged-in user's own password after verifying the old one."""
        if not verify_password(current_password, user.password):
            raise AuthError("Current password is incorrect.")
        user.password = hash_password(new_password)
        await self.session.flush()
        logger.info("password_changed", user_id=user.id)
