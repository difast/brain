"""Auth schemas — login request, session token and the current-user view."""

from __future__ import annotations

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
    created_at: datetime


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    organization: OrganizationResponse
