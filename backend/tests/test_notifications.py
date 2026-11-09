"""Notification deduplication and threshold tests."""

from types import SimpleNamespace

from sqlalchemy import func, select

from app.database import SessionFactory
from app.models import NotificationEvent
from app.models.enums import NotificationEventType
from app.services import notifications as notif
from app.services.queue import register_candidate


def ident(ensam, filiere="GI-ILSI"):
    return SimpleNamespace(
        ensam_code=ensam, first_name="A", last_name="B", year="3A", filiere=filiere
    )


async def test_deduplication_skips_repeat():
    async with SessionFactory() as s:
        c = await register_candidate(s, ident("E1"))
        await s.commit()
        payload = {"title": "FAME", "body": "x"}
        e1 = await notif.schedule_notification(s, c.id, NotificationEventType.ATTRIBUTED, payload, "dedup:1")
        await s.commit()
        assert e1 is not None

        e2 = await notif.schedule_notification(s, c.id, NotificationEventType.ATTRIBUTED, payload, "dedup:1")
        await s.commit()
        assert e2 is None

        count = (await s.execute(select(func.count()).select_from(NotificationEvent))).scalar_one()
        assert count == 1


async def test_threshold_notifications_for_top_candidates():
    async with SessionFactory() as s:
        for code in ["E1", "E2", "E3", "E4", "E5", "E6"]:
            await register_candidate(s, ident(code))
        await s.commit()

        ids = await notif.schedule_threshold_notifications(s, "GI-ILSI")
        await s.commit()
        assert len(ids) == 5  # positions 1..5 (approaching threshold = 5)
