"""ARQ background worker: delivers queued push notifications."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from arq.connections import RedisSettings
from sqlalchemy import select

from app.config import settings
from app.database import SessionFactory
from app.models import (
    Candidate,
    NotificationDelivery,
    NotificationEvent,
    PushSubscription,
)
from app.models.enums import DeliveryStatus, NotificationStatus
from app.services import channels
from app.services.webpush import PermanentPushError, send_push_async

logging.basicConfig(level=logging.INFO)

MAX_ATTEMPTS = 5


async def deliver_notification(ctx, notification_event_id: int) -> None:
    """Deliver a single notification event to all of a candidate's subscriptions."""
    async with SessionFactory() as session:
        event = await session.get(NotificationEvent, notification_event_id)
        if event is None:
            return

        payload = json.loads(event.payload)
        candidate = await session.get(Candidate, event.candidate_id)

        result = await session.execute(
            select(PushSubscription).where(
                PushSubscription.candidate_id == event.candidate_id
            )
        )
        subscriptions = result.scalars().all()

        if not subscriptions:
            event.status = NotificationStatus.SKIPPED.value
            await session.commit()
        else:
            all_ok = True
            for sub in subscriptions:
                delivery = await _delivery_for(session, event.id, sub.id)
                try:
                    await send_push_async(sub, payload)
                    delivery.status = DeliveryStatus.SENT.value
                    delivery.attempt_count += 1
                except PermanentPushError as exc:
                    delivery.status = DeliveryStatus.INVALID.value
                    delivery.last_error = str(exc)[:1000]
                    await session.delete(sub)
                    all_ok = False
                except Exception as exc:  # transient -> ARQ will retry the whole job
                    delivery.status = DeliveryStatus.FAILED.value
                    delivery.last_error = str(exc)[:1000]
                    delivery.attempt_count += 1
                    await session.commit()
                    raise

            if all_ok:
                event.status = NotificationStatus.SENT.value
                event.sent_at = datetime.now(UTC)
            await session.commit()

        # Best-effort side channels (email + WhatsApp), independent of push.
        if candidate is not None:
            name = f"{candidate.first_name} {candidate.last_name}".strip()
            await channels.send_email_notification(
                candidate_name=name,
                ensam_code=candidate.ensam_code,
                candidate_email=candidate.email,
                candidate_phone=candidate.phone,
                event_type=event.event_type,
            )
            await channels.send_whatsapp_notification(
                candidate_name=name,
                ensam_code=candidate.ensam_code,
                candidate_phone=candidate.phone,
                event_type=event.event_type,
            )


async def _delivery_for(session, event_id: int, subscription_id: int) -> NotificationDelivery:
    result = await session.execute(
        select(NotificationDelivery).where(
            NotificationDelivery.notification_event_id == event_id,
            NotificationDelivery.subscription_id == subscription_id,
        )
    )
    delivery = result.scalar_one_or_none()
    if delivery is None:
        delivery = NotificationDelivery(
            notification_event_id=event_id,
            subscription_id=subscription_id,
            attempt_count=0,
            status=DeliveryStatus.PENDING.value,
        )
        session.add(delivery)
        await session.flush()
    return delivery


class WorkerSettings:
    functions = [deliver_notification]
    cron_jobs = []
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_tries = MAX_ATTEMPTS
    retry_jitter_seconds = 5
    job_timeout = 60
