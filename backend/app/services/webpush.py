"""Web Push delivery via pywebpush (VAPID)."""

from __future__ import annotations

import asyncio
import json

from pywebpush import WebPushException, webpush

from app.config import settings
from app.models import PushSubscription


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
        )

    try:
        await asyncio.to_thread(_send)
    except WebPushException as exc:
        status = getattr(exc, "response", None)
        code = getattr(status, "status_code", None) if status is not None else None
        if code in (404, 410):
            raise PermanentPushError(str(exc)) from exc
        raise
