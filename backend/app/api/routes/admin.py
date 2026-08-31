"""Hidden admin panel endpoints — org/user provisioning + invites.

Unlocked by a single shared password (no email login). Everything except the
unlock endpoint requires the admin-panel token.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Response, status

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
from app.schemas.lead import LeadResponse
from app.schemas.newsletter import NewsletterCreateRequest, NewsletterResponse
from app.services import newsletter_service
from app.services.admin_service import AdminService
from app.services.lead_service import LeadService
from app.services.newsletter_service import NewsletterService

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


@router.delete(
    "/admin/organizations/{organization_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an organization (must have no users or devices left)",
)
async def delete_organization(
    organization_id: str, _admin: AdminGuard, session: SessionDep
) -> Response:
    await AdminService(session).delete_organization(organization_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.delete(
    "/admin/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user account",
)
async def delete_user(
    user_id: str, _admin: AdminGuard, session: SessionDep
) -> Response:
    await AdminService(session).delete_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.delete(
    "/admin/invites/{invite_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an invite",
)
async def delete_invite(
    invite_id: str, _admin: AdminGuard, session: SessionDep
) -> Response:
    await AdminService(session).delete_invite(invite_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/admin/leads",
    response_model=list[LeadResponse],
    summary="List contact requests from the public website",
)
async def list_leads(
    _admin: AdminGuard, session: SessionDep
) -> list[LeadResponse]:
    leads = await LeadService(session).list()
    return [LeadResponse.model_validate(x) for x in leads]


@router.delete(
    "/admin/leads/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a contact request",
)
async def delete_lead(
    lead_id: str, _admin: AdminGuard, session: SessionDep
) -> Response:
    await LeadService(session).delete(lead_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/admin/newsletters",
    response_model=list[NewsletterResponse],
    summary="List newsletters sent to dashboard users",
)
async def list_newsletters(
    _admin: AdminGuard, session: SessionDep
) -> list[NewsletterResponse]:
    items = await NewsletterService(session).list()
    return [NewsletterResponse.model_validate(x) for x in items]


@router.post(
    "/admin/newsletters",
    response_model=NewsletterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a newsletter to every dashboard user",
)
async def create_newsletter(
    payload: NewsletterCreateRequest,
    _admin: AdminGuard,
    session: SessionDep,
    background: BackgroundTasks,
) -> NewsletterResponse:
    newsletter = await NewsletterService(session).create(
        payload.subject, payload.body
    )
    # Delivery runs after the response, on its own session.
    background.add_task(newsletter_service.deliver, newsletter.id)
    return NewsletterResponse.model_validate(newsletter)
