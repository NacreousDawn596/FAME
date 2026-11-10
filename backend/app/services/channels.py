"""Additional notification channels: email (FormSubmit) and WhatsApp (bridge)."""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger("fame")


def _friendly_text(event_type: str) -> str:
    return {
        "ATTRIBUTED": "votre tour est arrivé — présentez-vous au régulateur",
        "IMMEDIATE": "vous êtes le prochain — présentez-vous",
        "URGENT": "votre tour approche",
        "APPROACHING": "votre tour approche",
        "REVERSED": "vous êtes de nouveau en file d'attente (en fin de file)",
        "RETURNED": "votre statut a changé",
        "CANCELLED": "votre statut a changé",
    }.get(event_type, "votre statut a changé")


def _whatsapp_number(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(ch for ch in phone if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = "212" + digits[1:]
    return digits


async def send_email_notification(
    candidate_name: str,
    ensam_code: str,
    candidate_email: str | None,
    candidate_phone: str | None,
    event_type: str,
) -> None:
    """Send an email via FormSubmit to the configured notification inbox."""
    if not settings.email_notifications_enabled:
        return
    subject = f"FAME — {ensam_code} — {event_type}"
    message = (
        f"Candidat : {candidate_name}\n"
        f"Code ENSAM : {ensam_code}\n"
        f"Événement : {_friendly_text(event_type)}\n"
        f"Email : {candidate_email or '—'}\n"
        f"Téléphone : {candidate_phone or '—'}\n"
    )
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"https://formsubmit.co/ajax/{settings.notification_email}",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    # FormSubmit rejects requests without a web Origin/Referer.
                    "Origin": settings.frontend_url,
                    "Referer": f"{settings.frontend_url}/",
                },
                json={
                    "name": candidate_name,
                    "email": candidate_email or settings.notification_email,
                    "message": message,
                    "_subject": subject,
                    "_captcha": "false",
                },
            )
        body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        success = str(body.get("success", "true")).lower() != "false"
        if resp.status_code >= 400 or not success:
            logger.warning(
                "[email] rejected for %s (%s): %s",
                ensam_code,
                resp.status_code,
                body.get("message", "unknown"),
            )
        else:
            logger.info("[email] sent for %s", ensam_code)
    except Exception as exc:  # noqa: BLE001 - best-effort channel
        logger.warning("[email] failed for %s: %s", ensam_code, exc)


async def send_whatsapp_notification(
    candidate_name: str,
    ensam_code: str,
    candidate_phone: str | None,
    event_type: str,
) -> None:
    """Send a WhatsApp message via the local whatsapp-web.js bridge."""
    if not settings.whatsapp_notifications_enabled:
        return
    number = _whatsapp_number(candidate_phone)
    if not number:
        logger.info("[whatsapp] no phone for %s, skipped", ensam_code)
        return
    message = f"FAME — {candidate_name} ({ensam_code}), {_friendly_text(event_type)}."
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(
                f"{settings.whatsapp_bridge_url}/send",
                json={"number": number, "message": message},
            )
        logger.info("[whatsapp] sent for %s to %s", ensam_code, number)
    except Exception as exc:  # noqa: BLE001 - best-effort channel
        logger.warning("[whatsapp] failed for %s: %s", ensam_code, exc)
