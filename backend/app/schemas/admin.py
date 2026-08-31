"""Schemas for the hidden admin panel and the public invite-redemption flow."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1)


class AdminTokenResponse(BaseModel):
    token: str


class OrgCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class OrgSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    created_at: datetime


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: UserRole
    organization_id: str
    newsletter_opt_in: bool
    created_at: datetime


class InviteCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    organization_id: str
    role: UserRole = UserRole.member

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v


class InviteResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    organization_id: str
    organization_name: str
    token: str
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime


class InvitePublicResponse(BaseModel):
    """What the redemption page shows before the user sets a password."""

    email: str
    organization_name: str
    role: UserRole
    valid: bool


class InviteAcceptRequest(BaseModel):
    password: str = Field(min_length=6, max_length=255)
