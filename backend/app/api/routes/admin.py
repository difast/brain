"""Hidden admin panel endpoints — org/user provisioning + invites.

Unlocked by a single shared password (no email login). Everything except the
unlock endpoint requires the admin-panel token.
"""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import AdminGuard, SessionDep
from app.schemas.admin import (
    AdminLoginRequest,
    AdminTokenResponse,
    AdminUserResponse,
    InviteCreateRequest,
    InviteResponse,
    OrgCreateRequest,
    OrgSummary,
)
from app.services.admin_service import AdminService

router = APIRouter(tags=["admin"])


def _invite_response(invite, org) -> InviteResponse:  # type: ignore[no-untyped-def]
    return InviteResponse(
        id=invite.id,
        email=invite.email,
        role=invite.role,
        organization_id=invite.organization_id,
        organization_name=org.name,
        token=invite.token,
        expires_at=invite.expires_at,
        accepted_at=invite.accepted_at,
        created_at=invite.created_at,
    )


@router.post(
    "/admin/login",
    response_model=AdminTokenResponse,
    summary="Unlock the admin panel with the shared password",
)
async def admin_login(
    payload: AdminLoginRequest, session: SessionDep
) -> AdminTokenResponse:
    token = AdminService(session).authenticate(payload.password)
    return AdminTokenResponse(token=token)


@router.get(
    "/admin/organizations",
    response_model=list[OrgSummary],
    summary="List all organizations",
)
async def list_organizations(
    _admin: AdminGuard, session: SessionDep
) -> list[OrgSummary]:
    orgs = await AdminService(session).list_organizations()
    return [OrgSummary.model_validate(o) for o in orgs]


@router.post(
    "/admin/organizations",
    response_model=OrgSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Create an organization",
)
async def create_organization(
    payload: OrgCreateRequest, _admin: AdminGuard, session: SessionDep
) -> OrgSummary:
    org = await AdminService(session).create_organization(payload.name)
    return OrgSummary.model_validate(org)


@router.get(
    "/admin/users",
    response_model=list[AdminUserResponse],
    summary="List all users across organizations",
)
async def list_users(
    _admin: AdminGuard, session: SessionDep
) -> list[AdminUserResponse]:
    users = await AdminService(session).list_users()
    return [AdminUserResponse.model_validate(u) for u in users]


@router.get(
    "/admin/invites",
    response_model=list[InviteResponse],
    summary="List issued invites",
)
async def list_invites(
    _admin: AdminGuard, session: SessionDep
) -> list[InviteResponse]:
    rows = await AdminService(session).list_invites()
    return [_invite_response(inv, org) for inv, org in rows]


@router.post(
    "/admin/invites",
    response_model=InviteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue an invite for a new user",
)
async def create_invite(
    payload: InviteCreateRequest, _admin: AdminGuard, session: SessionDep
) -> InviteResponse:
    invite, org = await AdminService(session).create_invite(
        payload.email, payload.organization_id, payload.role
    )
    return _invite_response(invite, org)
