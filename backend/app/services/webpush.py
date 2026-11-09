"""Web Push delivery via pywebpush (VAPID)."""

from __future__ import annotations

import asyncio
import json
import logging

from pywebpush import WebPushException, webpush

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger("fame")


class PermanentPushError(Exception):
    """Subscription is permanently invalid (404/410) and should be removed."""


async def send_push_async(
    subscription: PushSubscription, payload: dict
) -> None:
    sub_info = {
        "endpoint": subscription.endpoint,
        "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
    }
    data = json.dumps(payload)

    def _send() -> None:
        webpush(
            subscription_info=sub_info,
            data=data,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=settings.push_ttl_seconds,
        )

    endpoint_preview = subscription.endpoint[:70]
    try:
        await asyncio.to_thread(_send)
        logger.info("[push] delivered -> %s", endpoint_preview)
    except WebPushException as exc:
        status = getattr(exc, "response", None)
        code = getattr(status, "status_code", None) if status is not None else None
        logger.warning("[push] failed (%s) -> %s: %s", code, endpoint_preview, exc)
        if code in (404, 410):
            raise PermanentPushError(str(exc)) from exc
        raise
