"""Public contact-form endpoint — stores a lead for the admin panel."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Request, status

from app.api.deps import SessionDep
from app.schemas.lead import LeadCreate
from app.services import email_templates, mailer
from app.services.lead_service import LeadService

router = APIRouter(tags=["leads"])


@router.post(
    "/leads",
    status_code=status.HTTP_201_CREATED,
    summary="Submit a contact request from the public website",
)
async def create_lead(
    payload: LeadCreate,
    request: Request,
    session: SessionDep,
    background: BackgroundTasks,
) -> dict[str, bool]:
    ip = request.client.host if request.client else None
    lead = await LeadService(session).create(payload, ip=ip)
    # Confirm receipt to the sender — best effort, and never for a honeypot
    # submission (LeadService returns None for those).
    if lead is not None:
        subject, html, text = email_templates.lead_received(lead.name)
        background.add_task(
            mailer.send_email_quietly, lead.email, subject, html, text
        )
    # Always report success — the honeypot path is intentionally opaque.
    return {"ok": True}
