"""FastAPI dependencies: shared singletons, robot and user authentication."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.exceptions import AuthError
from app.core.security import (
    decode_admin_token,
    decode_robot_token,
    decode_user_token,
)
from app.models.user import User
from app.services.api_key_service import ApiKeyService
from app.services.decision_engine import DecisionEngine
from app.services.session_service import SessionService
from app.services.storage import FrameStorage

_bearer = HTTPBearer(auto_error=False)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_brain(request: Request) -> DecisionEngine:
    return request.app.state.brain


def get_storage(request: Request) -> FrameStorage:
    return request.app.state.storage


async def get_current_robot_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Authenticate the calling robot from its bearer token.

    Returns the ``robot_id`` (token subject). A robot can therefore only act
    as itself — the id is never taken from the request body.
    """
    if credentials is None or not credentials.credentials:
        raise AuthError("Missing bearer token.")
    try:
        payload = decode_robot_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid token.") from exc
    if payload.get("type") != "robot":
        raise AuthError("Not a robot token.")
    robot_id = payload.get("sub")
    if not robot_id:
        raise AuthError("Token missing subject.")
    return robot_id


CurrentRobotId = Annotated[str, Depends(get_current_robot_id)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: SessionDep,
    request: Request,
) -> User:
    """Authenticate a dashboard user from its session (JWT) bearer token.

    The user is re-loaded from the database on every request so a deleted or
    moved account stops working immediately, and the session row the token
    points at is checked so a revoked session stops working immediately too.
    Downstream handlers read ``user.organization_id`` to scope all data to the
    caller's tenant.
    """
    if credentials is None or not credentials.credentials:
        raise AuthError("Missing bearer token.")
    try:
        payload = decode_user_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Session expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid session.") from exc
    if payload.get("type") != "user":
        raise AuthError("Not a user session token.")
    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Token missing subject.")
    user = await session.get(User, user_id)
    if user is None:
        raise AuthError("Account no longer exists.")

    session_id = payload.get("sid")
    if session_id:
        service = SessionService(session)
        row = await service.get_live(str(session_id))
        if row is None or row.user_id != user.id:
            raise AuthError("Session was signed out.")
        await service.touch(row)
        # Handlers that need to know which session is calling (the account
        # page marks it "this device") read it from the request state.
        request.state.session_id = row.id
    else:
        request.state.session_id = None
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def current_session_id(request: Request) -> str | None:
    """The id of the session making this request, when the token carries one."""
    return getattr(request.state, "session_id", None)


CurrentSessionId = Annotated[str | None, Depends(current_session_id)]


async def get_org_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: SessionDep,
) -> str:
    """Resolve the organization for a device-registration request.

    Registration is org-scoped: the caller proves which organization the new
    device belongs to with **either** a dashboard user session token (the
    in-dashboard simulator) **or** an organization API key (the SDK / external
    devices). Returns the ``organization_id``.
    """
    if credentials is None or not credentials.credentials:
        raise AuthError("Missing bearer token.")
    raw = credentials.credentials

    # 1) Organization API key (raw secret passed as the bearer token).
    if raw.startswith("cbk_"):
        api_key = await ApiKeyService(session).verify(raw)
        if api_key is None:
            raise AuthError("Invalid or revoked API key.")
        return api_key.organization_id

    # 2) Dashboard user session token.
    try:
        payload = decode_user_token(raw)
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid credentials.") from exc
    if payload.get("type") != "user":
        raise AuthError("Invalid credentials.")
    org_id = payload.get("org")
    if not org_id:
        raise AuthError("Token missing organization.")
    return org_id


OrgPrincipal = Annotated[str, Depends(get_org_principal)]


async def require_admin(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> None:
    """Guard the admin-panel endpoints with the admin-panel token."""
    if credentials is None or not credentials.credentials:
        raise AuthError("Missing admin token.")
    try:
        payload = decode_admin_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Admin session expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid admin session.") from exc
    if payload.get("type") != "admin":
        raise AuthError("Not an admin token.")


AdminGuard = Annotated[None, Depends(require_admin)]
