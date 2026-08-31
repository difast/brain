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

from app.api.deps import CurrentSessionId, CurrentUser, SessionDep
from app.core.config import settings
from app.core.exceptions import (
    AuthError,
    NotFoundError,
    ServiceUnavailableError,
    TooManyRequestsError,
)
from app.core.security import create_login_challenge_token
from app.models.audit_log import AuditAction
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
    NewsletterOptInRequest,
    OrganizationResponse,
    PasswordCodeRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SessionResponse,
    UserResponse,
)
from app.schemas.common import Page
from app.services import email_templates, mailer
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.captcha_service import verify_captcha
from app.services.session_service import SessionService
from app.services.throttle_service import (
    ThrottleService,
    ip_scope,
    user_scope,
)
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
    throttle = ThrottleService(session)

    # Both budgets are checked before the password is looked at, so a locked
    # scope costs an attacker nothing to discover and everything to wait out.
    target = await service.find_by_email(payload.email)
    scopes = [ip_scope(client_ip)] if client_ip else []
    if target is not None:
        scopes.append(user_scope(target.id))
    await throttle.check(scopes)

    try:
        user, org = await service.verify_credentials(
            payload.email, payload.password, ip=client_ip
        )
    except AuthError:
        if target is not None:
            await throttle.register_failure(
                user_scope(target.id), settings.login_max_attempts
            )
        if client_ip:
            await throttle.register_failure(
                ip_scope(client_ip), settings.login_ip_max_attempts
            )
        raise

    await throttle.reset(scopes)

    if not settings.email_enabled:
        token, _ = await service.issue_session(
            user, org, ip=client_ip, user_agent=request.headers.get("user-agent")
        )
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
        user,
        org,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
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
    summary="Log out — revokes this session server-side",
)
async def logout(
    current_user: CurrentUser,
    session: SessionDep,
    session_id: CurrentSessionId,
) -> dict[str, bool]:
    # The client discards its token either way; revoking the row means the
    # token is dead even if a copy of it was taken.
    if session_id:
        await SessionService(session).revoke(current_user.id, session_id)
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
    session_id: CurrentSessionId,
) -> dict[str, bool | int]:
    service = AuthService(session)
    service.check_password(current_user, payload.current_password)
    if settings.email_enabled:
        if not payload.code:
            raise AuthError("Требуется код подтверждения из письма.")
        await VerificationService(session).verify(
            current_user, CodePurpose.password_change, payload.code
        )
    # Other devices are signed out — a password change is how you lock an
    # intruder out, so their session must not survive it.
    closed = await service.set_password(
        current_user,
        payload.new_password,
        ip=_client_ip(request),
        keep_session_id=session_id,
    )
    return {"ok": True, "sessions_closed": closed}


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
    "/auth/newsletter",
    response_model=UserResponse,
    summary="Turn newsletters on or off for the current user",
)
async def set_newsletter_opt_in(
    payload: NewsletterOptInRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> UserResponse:
    await AuthService(session).set_newsletter_opt_in(
        current_user, payload.newsletter_opt_in
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


@router.get(
    "/auth/sessions",
    response_model=list[SessionResponse],
    summary="The current user's live sessions (devices signed in)",
)
async def list_sessions(
    current_user: CurrentUser,
    session: SessionDep,
    session_id: CurrentSessionId,
) -> list[SessionResponse]:
    rows = await SessionService(session).list_for_user(current_user.id)
    return [
        SessionResponse(
            id=row.id,
            ip=row.ip,
            user_agent=row.user_agent,
            last_seen_at=row.last_seen_at,
            created_at=row.created_at,
            current=row.id == session_id,
        )
        for row in rows
    ]


@router.delete(
    "/auth/sessions/{revoke_id}",
    summary="Sign one of the current user's own sessions out",
)
async def revoke_session(
    revoke_id: str,
    current_user: CurrentUser,
    session: SessionDep,
    request: Request,
) -> dict[str, bool]:
    revoked = await SessionService(session).revoke(current_user.id, revoke_id)
    if not revoked:
        raise NotFoundError("Session not found.")
    await AuditService(session).record(
        current_user.id, AuditAction.session_revoked, _client_ip(request)
    )
    return {"ok": True}


@router.post(
    "/auth/sessions/revoke-others",
    summary="Sign every other device out, keeping the current session",
)
async def revoke_other_sessions(
    current_user: CurrentUser,
    session: SessionDep,
    request: Request,
    session_id: CurrentSessionId,
) -> dict[str, bool | int]:
    closed = await SessionService(session).revoke_others(current_user.id, session_id)
    if closed:
        await AuditService(session).record(
            current_user.id, AuditAction.session_revoked, _client_ip(request)
        )
    return {"ok": True, "sessions_closed": closed}


@router.post(
    "/auth/password/reset/request",
    response_model=CodeSentResponse,
    summary="Email a code for resetting a forgotten password",
)
async def request_password_reset(
    payload: PasswordResetRequest, request: Request, session: SessionDep
) -> CodeSentResponse:
    """Always reports success — whether an account exists is not disclosed."""
    generic = CodeSentResponse(
        sent=True, expires_in_seconds=settings.code_ttl_minutes * 60
    )
    if not settings.email_enabled:
        raise ServiceUnavailableError(
            "Восстановление пароля недоступно: почта не настроена."
        )

    client_ip = _client_ip(request)
    user = await AuthService(session).find_by_email(payload.email)
    if user is None:
        return generic
    # The per-IP budget also covers this endpoint, so it can't be used to
    # hammer the mail server or to probe which addresses exist.
    throttle = ThrottleService(session)
    if client_ip:
        await throttle.check([ip_scope(client_ip)])
    try:
        code = await VerificationService(session).issue(
            user, CodePurpose.password_reset
        )
    except TooManyRequestsError:
        # Don't reveal that this address has a live code — behave as always.
        return generic
    await _send_code(user, CodePurpose.password_reset, user.email, code)
    return CodeSentResponse(
        sent=True,
        expires_in_seconds=settings.code_ttl_minutes * 60,
        masked_email=_mask_email(user.email),
    )


@router.post(
    "/auth/password/reset/confirm",
    summary="Set a new password with the emailed reset code",
)
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest, request: Request, session: SessionDep
) -> dict[str, bool]:
    service = AuthService(session)
    user = await service.find_by_email(payload.email)
    if user is None:
        # Same error the wrong code gives — no account probing here either.
        raise AuthError("Код не найден. Запросите новый.")
    await VerificationService(session).verify(
        user, CodePurpose.password_reset, payload.code
    )
    # Every session is closed: whoever knew the old password loses access.
    await service.set_password(
        user,
        payload.new_password,
        ip=_client_ip(request),
        keep_session_id=None,
        action=AuditAction.password_reset,
    )
    return {"ok": True}
