"""Authentication endpoints — login, logout and the current-user view."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.exceptions import AuthError
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    OrganizationResponse,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.captcha_service import verify_captcha

router = APIRouter(tags=["auth"])


@router.get(
    "/auth/config",
    summary="Public login config (captcha sitekey) read at runtime",
)
async def auth_config() -> dict[str, str]:
    # Public client key only — never the server secret. Lets the dashboard
    # enable the captcha widget without a frontend rebuild.
    return {"captcha_site_key": settings.yandex_captcha_site_key}


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Log in with email + password (+ captcha); returns a session token",
)
async def login(
    payload: LoginRequest, request: Request, session: SessionDep
) -> LoginResponse:
    # Verify the SmartCaptcha token first (no-op when captcha is disabled).
    client_ip = request.client.host if request.client else None
    if not await verify_captcha(payload.captcha_token, client_ip):
        raise AuthError("Captcha verification failed.")
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
