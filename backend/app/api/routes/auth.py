"""Authentication endpoints — login, logout, the current-user view and the
self-service account page (password/email/avatar changes, activity log)."""

from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.exceptions import AuthError
from app.schemas.audit import AuditLogResponse
from app.schemas.auth import (
    AvatarUpdateRequest,
    ChangeEmailRequest,
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    OrganizationResponse,
    UserResponse,
)
from app.schemas.common import Page
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.captcha_service import verify_captcha

router = APIRouter(tags=["auth"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


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
    client_ip = _client_ip(request)
    if not await verify_captcha(payload.captcha_token, client_ip):
        raise AuthError("Captcha verification failed.")
    service = AuthService(session)
    user, org, token = await service.authenticate(
        payload.email, payload.password, ip=client_ip
    )
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


@router.patch(
    "/auth/password",
    summary="Change the current user's own password",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    session: SessionDep,
    request: Request,
) -> dict[str, bool]:
    await AuthService(session).change_password(
        current_user,
        payload.current_password,
        payload.new_password,
        ip=_client_ip(request),
    )
    return {"ok": True}


@router.patch(
    "/auth/email",
    response_model=UserResponse,
    summary="Change the current user's own email",
)
async def change_email(
    payload: ChangeEmailRequest,
    current_user: CurrentUser,
    session: SessionDep,
    request: Request,
) -> UserResponse:
    await AuthService(session).change_email(
        current_user, payload.current_password, payload.new_email, ip=_client_ip(request)
    )
    return UserResponse.model_validate(current_user)


@router.patch(
    "/auth/avatar",
    response_model=UserResponse,
    summary="Set or clear the current user's own avatar",
)
async def update_avatar(
    payload: AvatarUpdateRequest,
    current_user: CurrentUser,
    session: SessionDep,
    request: Request,
) -> UserResponse:
    await AuthService(session).update_avatar(
        current_user, payload.avatar, ip=_client_ip(request)
    )
    return UserResponse.model_validate(current_user)


@router.get(
    "/auth/activity",
    response_model=Page[AuditLogResponse],
    summary="The current user's own account activity log (logins, changes)",
)
async def list_activity(
    current_user: CurrentUser,
    session: SessionDep,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> Page[AuditLogResponse]:
    items, total = await AuditService(session).list_for_user(
        current_user.id, limit=limit, offset=offset
    )
    return Page(
        items=[AuditLogResponse.model_validate(x) for x in items],
        total=total,
        limit=limit,
        offset=offset,
    )
