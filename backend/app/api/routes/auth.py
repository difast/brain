"""Authentication endpoints — login (password + emailed code), the
current-user view, and the self-service account page (password/email/avatar
changes, activity log).

When SMTP is configured every login is confirmed by a 5-digit code emailed to
the account address, and password/email changes require one too. With SMTP
left unconfigured (dev, tests) those steps are skipped and the endpoints
behave as they did before.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Query, Request

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.exceptions import AuthError, ServiceUnavailableError
from app.core.security import create_login_challenge_token
from app.models.user import User
from app.models.verification_code import CodePurpose
from app.schemas.audit import AuditLogResponse
from app.schemas.auth import (
    AvatarUpdateRequest,
    ChangeEmailRequest,
    ChangePasswordRequest,
    CodeSentResponse,
    EmailCodeRequest,
    LoginRequest,
    LoginResponse,
    LoginStartResponse,
    LoginVerifyRequest,
    OrganizationResponse,
    PasswordCodeRequest,
    UserResponse,
)
from app.schemas.common import Page
from app.services import email_templates, mailer
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.captcha_service import verify_captcha
from app.services.verification_service import VerificationService

router = APIRouter(tags=["auth"])


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _mask_email(email: str) -> str:
    """i***@mevratek.ru — enough to recognise the inbox, not to harvest it."""
    name, _, domain = email.partition("@")
    if not domain:
        return "***"
    head = name[:1] if name else ""
    return f"{head}***@{domain}"


async def _send_code(user: User, purpose: CodePurpose, to: str, code: str) -> None:
    """Email a confirmation code, failing the request if it can't go out."""
    subject, html, text = email_templates.verification_code(
        purpose.value, code, settings.code_ttl_minutes
    )
    try:
        await mailer.send_email(to, subject, html, text)
    except mailer.EmailDeliveryError as exc:
        raise ServiceUnavailableError(
            "Не удалось отправить письмо с кодом — почтовый сервер сейчас "
            "недоступен. Попробуйте ещё раз через несколько минут."
        ) from exc


@router.get(
    "/auth/config",
    summary="Public login config (captcha sitekey, email confirmation) at runtime",
)
async def auth_config() -> dict[str, str | bool]:
    # Public client key only — never the server secret. Lets the dashboard
    # enable the captcha widget without a frontend rebuild.
    return {
        "captcha_site_key": settings.yandex_captcha_site_key,
        "email_confirmation": settings.email_enabled,
    }


@router.post(
    "/auth/login",
    response_model=LoginStartResponse,
    summary="Password step: returns a session, or asks for the emailed code",
)
async def login(
    payload: LoginRequest, request: Request, session: SessionDep
) -> LoginStartResponse:
    # Verify the SmartCaptcha token first (no-op when captcha is disabled).
    client_ip = _client_ip(request)
    if not await verify_captcha(payload.captcha_token, client_ip):
        raise AuthError("Captcha verification failed.")

    service = AuthService(session)
    user, org = await service.verify_credentials(
        payload.email, payload.password, ip=client_ip
    )

    if not settings.email_enabled:
        token, _ = await service.issue_session(user, org, ip=client_ip)
        return LoginStartResponse(
            code_required=False,
            token=token,
            user=UserResponse.model_validate(user),
            organization=OrganizationResponse.model_validate(org),
        )

    code = await VerificationService(session).issue(user, CodePurpose.login)
    await _send_code(user, CodePurpose.login, user.email, code)
    return LoginStartResponse(
        code_required=True,
        challenge=create_login_challenge_token(
            user.id, settings.code_ttl_minutes
        ),
        code_expires_in_seconds=settings.code_ttl_minutes * 60,
        masked_email=_mask_email(user.email),
    )


@router.post(
    "/auth/login/verify",
    response_model=LoginResponse,
    summary="Code step: exchange the emailed code for a session token",
)
async def login_verify(
    payload: LoginVerifyRequest,
    request: Request,
    session: SessionDep,
    background: BackgroundTasks,
) -> LoginResponse:
    service = AuthService(session)
    user, org = await service.user_from_challenge(payload.challenge)
    await VerificationService(session).verify(user, CodePurpose.login, payload.code)

    token, first_login = await service.issue_session(
        user, org, ip=_client_ip(request)
    )
    if first_login:
        subject, html, text = email_templates.welcome(user.email, org.name)
        background.add_task(
            mailer.send_email_quietly, user.email, subject, html, text
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


@router.post(
    "/auth/password/request",
    response_model=CodeSentResponse,
    summary="Email a code confirming a password change",
)
async def request_password_code(
    payload: PasswordCodeRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> CodeSentResponse:
    service = AuthService(session)
    service.check_password(current_user, payload.current_password)
    code = await VerificationService(session).issue(
        current_user, CodePurpose.password_change
    )
    await _send_code(
        current_user, CodePurpose.password_change, current_user.email, code
    )
    return CodeSentResponse(
        sent=True,
        expires_in_seconds=settings.code_ttl_minutes * 60,
        masked_email=_mask_email(current_user.email),
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
    service = AuthService(session)
    service.check_password(current_user, payload.current_password)
    if settings.email_enabled:
        if not payload.code:
            raise AuthError("Требуется код подтверждения из письма.")
        await VerificationService(session).verify(
            current_user, CodePurpose.password_change, payload.code
        )
    await service.set_password(
        current_user, payload.new_password, ip=_client_ip(request)
    )
    return {"ok": True}


@router.post(
    "/auth/email/request",
    response_model=CodeSentResponse,
    summary="Email a code to the new address, confirming an email change",
)
async def request_email_code(
    payload: EmailCodeRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> CodeSentResponse:
    service = AuthService(session)
    service.check_password(current_user, payload.current_password)
    await service.assert_email_available(current_user, payload.new_email)
    code = await VerificationService(session).issue(
        current_user, CodePurpose.email_change, new_email=payload.new_email
    )
    # Sent to the *new* address — that's what the code proves ownership of.
    await _send_code(
        current_user, CodePurpose.email_change, payload.new_email, code
    )
    return CodeSentResponse(
        sent=True,
        expires_in_seconds=settings.code_ttl_minutes * 60,
        masked_email=_mask_email(payload.new_email),
    )


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
    service = AuthService(session)
    service.check_password(current_user, payload.current_password)
    if settings.email_enabled:
        if not payload.code:
            raise AuthError("Требуется код подтверждения из письма.")
        row = await VerificationService(session).verify(
            current_user, CodePurpose.email_change, payload.code
        )
        if row.new_email != payload.new_email:
            raise AuthError(
                "Код был отправлен на другой адрес. Запросите код заново."
            )
    await service.set_email(
        current_user, payload.new_email, ip=_client_ip(request)
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
