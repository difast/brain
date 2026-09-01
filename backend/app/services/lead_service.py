"""Contact-lead service — create from the public form, manage in the admin panel."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.lead import ContactLead
from app.schemas.lead import LeadCreate

logger = get_logger("leads")


class LeadService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, payload: LeadCreate, ip: str | None = None
    ) -> ContactLead | None:
        """Store a lead. Returns None when the honeypot flags it as spam."""
        if payload.website:  # honeypot filled → silently drop
            logger.info("lead_honeypot_dropped")
            return None
        lead = ContactLead(
            name=payload.name.strip(),
            email=payload.email.strip(),
            phone=payload.phone.strip(),
            organization=(payload.organization or "").strip() or None,
            topic=payload.topic.strip(),
            segment=(payload.segment or "").strip() or None,
            fleet_size=(payload.fleet_size or "").strip() or None,
            message=payload.message.strip(),
            ip=ip,
        )
        self.session.add(lead)
        await self.session.flush()
        await self.session.refresh(lead)
        logger.info(
            "lead_created",
            lead_id=lead.id,
            topic=lead.topic,
            segment=lead.segment,
        )
        return lead

    async def list(self) -> list[ContactLead]:
        stmt = select(ContactLead).order_by(ContactLead.created_at.desc())
        return list((await self.session.scalars(stmt)).all())

    async def delete(self, lead_id: str) -> None:
        lead = await self.session.get(ContactLead, lead_id)
        if lead is None:
            raise NotFoundError("Lead not found.")
        await self.session.delete(lead)
        await self.session.flush()
        logger.info("lead_deleted", lead_id=lead_id)
