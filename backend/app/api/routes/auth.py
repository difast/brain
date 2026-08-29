"""Authentication endpoints — login, logout and the current-user view."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.core.exceptions import AuthError
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    OrganizationResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Log in with email + password; returns a session token",
)
async def login(payload: LoginRequest, session: SessionDep) -> LoginResponse:
    service = AuthService(session)
    user, org, token = await service.authenticate(payload.email, payload.password)
    return LoginResponse(
        token=token,
        user=UserResponse.model_validate(user),
        organization=OrganizationResponse.model_validate(org),
    )


@router.post(
    "/auth/logout",
    summary="Log out (stateless: the client discards its token)",
)
async def logout() -> dict[str, bool]:
    # Tokens are stateless JWTs, so logout is a client-side token discard. The
    # endpoint exists for symmetry and future server-side revocation.
    return {"ok": True}


@router.get(
    "/auth/me",
    response_model=LoginResponse,
    summary="Return the current authenticated user + organization",
)
async def me(current_user: CurrentUser, session: SessionDep) -> LoginResponse:
    from app.models.organization import Organization

    org = await session.get(Organization, current_user.organization_id)
    if org is None:  # pragma: no cover - integrity safety net
        raise AuthError("Account is not attached to an organization.")
    return LoginResponse(
        token="",  # /me does not re-issue a token
        user=UserResponse.model_validate(current_user),
        organization=OrganizationResponse.model_validate(org),
    )
