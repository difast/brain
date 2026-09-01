"""Organization team management — the customer's own view of their colleagues.

Separate from ``/admin``, which is the operator's cross-tenant panel. Everything
here is scoped to the caller's own organization: reading is open to any member,
changing anything requires the organization's administrator role.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.models.organization import Organization
from app.models.user import UserRole
from app.schemas.team import (
    InviteCreatedResponse,
    InviteMemberRequest,
    OrganizationDetail,
    SetRoleRequest,
    TeamInvite,
    TeamMember,
    TeamResponse,
)
from app.services import email_templates, mailer
from app.services.team_service import TeamService

router = APIRouter(tags=["team"])


def _invite_link(token: str) -> str:
    """The redemption URL. The token is the credential, so this is the invite."""
    return f"{email_templates.DASHBOARD_URL}/invite/{token}"


@router.get(
    "/organization",
    response_model=OrganizationDetail,
    summary="The caller's own organization",
)
async def get_organization(
    current_user: CurrentUser, session: SessionDep
) -> OrganizationDetail:
    org = await session.get(Organization, current_user.organization_id)
    if org is None:  # pragma: no cover - integrity safety net
        raise NotFoundError("Организация не найдена.")

    members = await TeamService(session).list_members(current_user.organization_id)
    return OrganizationDetail(
        id=org.id,
        name=org.name,
        created_at=org.created_at,
        member_count=len(members),
    )


@router.get(
    "/organization/team",
    response_model=TeamResponse,
    summary="Colleagues in the organization, plus pending invites",
)
async def get_team(current_user: CurrentUser, session: SessionDep) -> TeamResponse:
    service = TeamService(session)
    can_manage = current_user.role == UserRole.admin

    members = await service.list_members(current_user.organization_id)
    # Pending invites name people who are not members yet, so only an
    # administrator — who can act on them — gets to see them.
    invites = (
        await service.list_invites(current_user.organization_id) if can_manage else []
    )

    return TeamResponse(
        members=[TeamMember.model_validate(m) for m in members],
        invites=[TeamInvite.model_validate(i) for i in invites],
        can_manage=can_manage,
    )


@router.post(
    "/organization/team/invites",
    response_model=InviteCreatedResponse,
    status_code=201,
    summary="Invite a colleague into the organization",
)
async def invite_member(
    payload: InviteMemberRequest,
    current_user: CurrentUser,
    session: SessionDep,
    background: BackgroundTasks,
) -> InviteCreatedResponse:
    service = TeamService(session)
    invite = await service.invite(current_user, payload.email, payload.role)
    link = _invite_link(invite.token)

    org = await session.get(Organization, current_user.organization_id)
    org_name = org.name if org else "Mevratek"

    # Mail is best-effort: the invite exists either way, and the response
    # carries the link so an administrator can pass it on by hand.
    emailed = False
    if settings.email_enabled:
        subject, html, text = email_templates.team_invite(
            org_name, current_user.email, link, invite.role.value
        )
        background.add_task(
            mailer.send_email_quietly, invite.email, subject, html, text
        )
        emailed = True

    return InviteCreatedResponse(
        invite=TeamInvite.model_validate(invite), link=link, emailed=emailed
    )


@router.delete(
    "/organization/team/invites/{invite_id}",
    summary="Revoke a pending invite",
)
async def revoke_invite(
    invite_id: str, current_user: CurrentUser, session: SessionDep
) -> dict[str, bool]:
    await TeamService(session).revoke_invite(current_user, invite_id)
    return {"ok": True}


@router.patch(
    "/organization/team/members/{user_id}",
    response_model=TeamMember,
    summary="Change a colleague's role",
)
async def set_member_role(
    user_id: str,
    payload: SetRoleRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> TeamMember:
    member = await TeamService(session).set_role(current_user, user_id, payload.role)
    return TeamMember.model_validate(member)


@router.delete(
    "/organization/team/members/{user_id}",
    summary="Remove a colleague from the organization",
)
async def remove_member(
    user_id: str, current_user: CurrentUser, session: SessionDep
) -> dict[str, bool]:
    await TeamService(session).remove_member(current_user, user_id)
    return {"ok": True}
