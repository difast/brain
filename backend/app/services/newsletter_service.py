"""Newsletters — compose in the admin panel, deliver to every dashboard user.

The send runs as a background task on its own session (the request that
started it is long gone), updating the row's counters as it goes so the admin
panel can show what happened.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from contextlib import AbstractAsyncContextManager

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.models.newsletter import Newsletter, NewsletterStatus
from app.models.user import User
from app.services import email_templates, mailer

logger = get_logger("newsletter")

# A small gap between messages — a shared mail server will throttle (or
# blocklist) a burst, and a newsletter is never urgent.
SEND_GAP_SECONDS = 0.5

SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]


class NewsletterService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, subject: str, body: str) -> Newsletter:
        newsletter = Newsletter(
            subject=subject.strip(),
            body=body.strip(),
            status=NewsletterStatus.sending,
        )
        self.session.add(newsletter)
        await self.session.flush()
        await self.session.refresh(newsletter)
        logger.info("newsletter_created", newsletter_id=newsletter.id)
        return newsletter

    async def list(self) -> list[Newsletter]:
        stmt = select(Newsletter).order_by(Newsletter.created_at.desc()).limit(50)
        return list((await self.session.scalars(stmt)).all())


async def deliver(
    newsletter_id: str,
    session_factory: SessionFactory | None = None,
    gap_seconds: float = SEND_GAP_SECONDS,
) -> None:
    """Send one newsletter to every user. Runs detached from the request."""
    factory = session_factory or SessionLocal
    async with factory() as session:
        newsletter = await session.get(Newsletter, newsletter_id)
        if newsletter is None:  # pragma: no cover - deleted meanwhile
            return
        emails = list(
            (await session.scalars(select(User.email).order_by(User.created_at))).all()
        )
        newsletter.recipients = len(emails)
        await session.commit()

        subject, html, text = email_templates.newsletter(
            newsletter.subject, newsletter.body
        )
        sent = failed = 0
        for index, email in enumerate(emails):
            if await mailer.send_email_quietly(email, subject, html, text):
                sent += 1
            else:
                failed += 1
            if gap_seconds and index + 1 < len(emails):
                await asyncio.sleep(gap_seconds)

        newsletter.sent = sent
        newsletter.failed = failed
        newsletter.status = (
            NewsletterStatus.failed
            if failed and not sent
            else NewsletterStatus.sent
        )
        await session.commit()
        logger.info(
            "newsletter_delivered",
            newsletter_id=newsletter_id,
            sent=sent,
            failed=failed,
        )
