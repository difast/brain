"""Public contact-form endpoint — stores a lead for the admin panel."""

from __future__ import annotations

from fastapi import APIRouter, Request, status

from app.api.deps import SessionDep
from app.schemas.lead import LeadCreate
from app.services.lead_service import LeadService

router = APIRouter(tags=["leads"])


@router.post(
    "/leads",
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact request from the public website",
)
async def create_lead(
    payload: LeadCreate, request: Request, session: SessionDep
) -> dict[str, bool]:
    ip = request.client.host if request.client else None
    await LeadService(session).create(payload, ip=ip)
    # Always report success — the honeypot path is intentionally opaque.
    return {"ok": True}
