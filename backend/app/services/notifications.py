"""Notification scheduling, payload construction, and threshold logic."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Candidate, NotificationEvent, QueueEntry
from app.models.enums import NotificationEventType, NotificationStatus, QueueStatus

DEDUP_WINDOW_SECONDS = 60


def build_payload(
    event_type: NotificationEventType,
    candidate: Candidate,
    position: int | None,
    filiere_code: str | None,
) -> dict:
    title = "FAME"
    body = "Your queue status has changed."
    if event_type == NotificationEventType.ATTRIBUTED:
        body = "You have been called."
    elif event_type == NotificationEventType.IMMEDIATE:
        body = "You are next. Please stay nearby."
    elif event_type == NotificationEventType.URGENT:
        body = "Your turn is approaching. Please stay nearby."
    elif event_type == NotificationEventType.APPROACHING:
        body = "Your turn is approaching."
    elif event_type == NotificationEventType.REVERSED:
        body = "You're back in the waiting queue."
    elif event_type == NotificationEventType.RETURNED:
        body = "Your queue status has changed."
    elif event_type == NotificationEventType.CANCELLED:
        body = "Your queue status has changed."

    return {
        "title": title,
        "body": body,
        "url": f"{settings.frontend_url}/",
        "data": {
            "eventType": event_type.value,
            "position": position,
            "filiere": filiere_code,
        },
    }


async def schedule_notification(
    session: AsyncSession,
    candidate_id: int,
    event_type: NotificationEventType,
    payload: dict,
    dedup_key: str,
) -> NotificationEvent | None:
    """Create a notification event if not recently deduplicated. Returns event or None."""
    cutoff = datetime.now(UTC) - timedelta(seconds=DEDUP_WINDOW_SECONDS)
    existing = (
        await session.execute(
            select(NotificationEvent).where(
                NotificationEvent.deduplication_key == dedup_key,
                NotificationEvent.status.in_(
                    [NotificationStatus.PENDING.value, NotificationStatus.SENT.value]
                ),
                NotificationEvent.created_at >= cutoff,
            )
        )
    ).scalars().first()
    if existing is not None:
        return None

    event = NotificationEvent(
        candidate_id=candidate_id,
        event_type=event_type.value,
        payload=json.dumps(payload),
        deduplication_key=dedup_key,
        status=NotificationStatus.PENDING.value,
    )
    session.add(event)
    await session.flush()
    return event


async def schedule_threshold_notifications(
    session: AsyncSession, filiere_code: str | None
) -> list[int]:
    """Notify top-of-queue waiting candidates whose position crosses a threshold.

    Returns the list of NotificationEvent ids created (empty if none).
    """
    threshold = settings.notification_approaching_threshold
    urgent = settings.notification_urgent_threshold

    stmt = (
        select(QueueEntry)
        .where(
            (QueueEntry.filiere_code == filiere_code)
            if filiere_code is not None
            else QueueEntry.filiere_code.is_(None),
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.joined_at, QueueEntry.id)
        .limit(threshold + 1)
    )
    entries = (await session.execute(stmt)).scalars().all()

    event_ids: list[int] = []
    for position, entry in enumerate(entries, start=1):
        if position == 1:
            event_type = NotificationEventType.IMMEDIATE
        elif position <= urgent:
            event_type = NotificationEventType.URGENT
        elif position <= threshold:
            event_type = NotificationEventType.APPROACHING
        else:
            continue

        candidate = await session.get(Candidate, entry.candidate_id)
        if candidate is None:
            continue
        payload = build_payload(event_type, candidate, position, filiere_code)
        dedup_key = f"cand:{candidate.id}:{event_type.value}:{position}"
        event = await schedule_notification(
            session, candidate.id, event_type, payload, dedup_key
        )
        if event is not None:
            event_ids.append(event.id)

    return event_ids
