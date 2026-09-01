"""Schemas for organization team management (the customer's own view)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole


class TeamMember(BaseModel):
    """A colleague in the same organization.

    Deliberately narrower than ``UserResponse``: a teammate's consents and
    avatar are none of another member's business.
    """

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: UserRole
    created_at: datetime


class TeamInvite(BaseModel):
    """A pending invitation. ``token`` is included so an administrator can
    copy the link when the email does not arrive."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: UserRole
    token: str
    expires_at: datetime
    created_at: datetime


class TeamResponse(BaseModel):
    members: list[TeamMember]
    invites: list[TeamInvite]
    # Whether the caller may change any of it, so the UI can render read-only
    # rather than offering buttons that will fail.
    can_manage: bool


class InviteMemberRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: UserRole = UserRole.member

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v


class SetRoleRequest(BaseModel):
    role: UserRole


class InviteCreatedResponse(BaseModel):
    invite: TeamInvite
    # The full link, built server-side so the client never has to know the
    # dashboard's public address.
    link: str
    # False when mail is not configured or delivery failed — the UI then tells
    # the administrator to pass the link along by hand.
    emailed: bool


class OrganizationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    created_at: datetime
    member_count: int = Field(default=0)
