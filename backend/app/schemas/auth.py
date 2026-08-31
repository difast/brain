"""Auth schemas — login request, session token and the current-user view."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole


class LoginRequest(BaseModel):
    # A light email check — a full RFC validator would pull an extra
    # dependency (email-validator) we deliberately avoid for build simplicity.
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1)
    # Yandex SmartCaptcha token. Required only when captcha is configured
    # server-side (YANDEX_CAPTCHA_SERVER_KEY set).
    captcha_token: str | None = None

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: UserRole
    organization_id: str
    avatar: str | None
    newsletter_opt_in: bool
    alerts_opt_in: bool
    created_at: datetime


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    organization: OrganizationResponse


class LoginStartResponse(BaseModel):
    """Result of the password step.

    With email configured the login is not finished yet: a code has been sent
    and ``challenge`` must come back with it. Without email configured the
    session is issued straight away and the token/user/organization are set.
    """

    code_required: bool
    challenge: str | None = None
    code_expires_in_seconds: int | None = None
    masked_email: str | None = None
    token: str | None = None
    user: UserResponse | None = None
    organization: OrganizationResponse | None = None


class LoginVerifyRequest(BaseModel):
    challenge: str = Field(min_length=1)
    code: str = Field(min_length=1, max_length=16)


class CodeSentResponse(BaseModel):
    sent: bool
    expires_in_seconds: int
    masked_email: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=255)
    # Required when email confirmation is configured.
    code: str | None = Field(default=None, max_length=16)


class PasswordCodeRequest(BaseModel):
    current_password: str = Field(min_length=1)


class ChangeEmailRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_email: str = Field(min_length=3, max_length=320)
    # Required when email confirmation is configured.
    code: str | None = Field(default=None, max_length=16)

    @field_validator("new_email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ip: str | None
    user_agent: str | None
    last_seen_at: datetime
    created_at: datetime
    # True for the session making the request.
    current: bool = False


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class PasswordResetConfirmRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    code: str = Field(min_length=1, max_length=16)
    new_password: str = Field(min_length=6, max_length=255)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class NewsletterOptInRequest(BaseModel):
    """Newsletter consent. Transactional mail is never affected by this."""

    newsletter_opt_in: bool


class AlertsOptInRequest(BaseModel):
    """Whether this user gets emailed when one of the fleet's devices fails."""

    alerts_opt_in: bool


class EmailCodeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_email: str = Field(min_length=3, max_length=320)

    @field_validator("new_email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v


# A data: URL only — no object-storage dependency (see User.avatar). Capped at
# ~370KB of base64 so a client can't stash arbitrarily large blobs here; the
# frontend crops/compresses to a small square well under that before upload.
_AVATAR_DATA_URL_RE = r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$"


class AvatarUpdateRequest(BaseModel):
    # Omit (null) to remove the current avatar.
    avatar: str | None = Field(default=None, max_length=500_000)

    @field_validator("avatar")
    @classmethod
    def _check_data_url(cls, v: str | None) -> str | None:
        if v is not None and not re.match(_AVATAR_DATA_URL_RE, v):
            raise ValueError("avatar must be a jpeg/png/webp data: URL.")
        return v
