"""Public invite-redemption endpoints (no auth — the token is the credential)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.schemas.admin import InviteAcceptRequest, InvitePublicResponse
from app.schemas.auth import LoginResponse, OrganizationResponse, UserResponse
from app.services.admin_service import AdminService

router = APIRouter(tags=["invites"])


@router.get(
    "/invites/{token}",
    response_model=InvitePublicResponse,
    summary="Look up an invite (for the redemption page)",
)
async def get_invite(token: str, session: SessionDep) -> InvitePublicResponse:
    invite, org, valid = await AdminService(session).get_invite_public(token)
    return InvitePublicResponse(
        email=invite.email,
        organization_name=org.name,
        role=invite.role,
        valid=valid,
    )


@router.post(
    "/invites/{token}/accept",
    response_model=LoginResponse,
    summary="Redeem an invite: set a password and create the account",
)
async def accept_invite(
    token: str, payload: InviteAcceptRequest, session: SessionDep
) -> LoginResponse:
    user, org, session_token = await AdminService(session).accept_invite(
        token, payload.password
    )
    return LoginResponse(
        token=session_token,
        user=UserResponse.model_validate(user),
        organization=OrganizationResponse.model_validate(org),
    )
