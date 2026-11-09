"""Attribution operation tests (FIFO, manual, undo, cancel, restore, undo-last)."""

import asyncio
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.database import SessionFactory
from app.models import Candidate, Organizer, QueueEntry
from app.models.enums import QueueStatus
from app.security.passwords import hash_password
from app.services import attribution as attr
from app.services.attribution import AttributionError
from app.services.queue import get_queue_position, register_candidate


def ident(ensam, name="A", last="B", filiere="GI-ILSI"):
    return SimpleNamespace(
        ensam_code=ensam, first_name=name, last_name=last, year="3A", filiere=filiere
    )


async def _make_organizer() -> int:
    async with SessionFactory() as s:
        org = Organizer(username="admin", email="a@b.c", password_hash=hash_password("secret123"))
        s.add(org)
        await s.commit()
        return org.id


async def _register(s, codes, filiere="GI-ILSI"):
    for code in codes:
        await register_candidate(s, ident(code, filiere=filiere))
    await s.commit()


async def _entry(s, ensam):
    c = (
        await s.execute(select(Candidate).where(Candidate.ensam_code == ensam))
    ).scalar_one()
    e = (await s.execute(select(QueueEntry).where(QueueEntry.candidate_id == c.id))).scalar_one()
    return c, e


async def test_fifo_attributes_oldest():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, ["E1", "E2", "E3"])
        outcome = await attr.attribute_next(s, org_id, "GI-ILSI")
        await s.commit()
        assert outcome.ensam_code == "E1"
        assert outcome.previous_position == 1
        assert outcome.new_status == "ATTRIBUTED"

        e1 = (await _entry(s, "E1"))[1]
        assert e1.status == QueueStatus.ATTRIBUTED


async def test_manual_attribution():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, ["E1", "E2", "E3"])
        c2, _ = await _entry(s, "E2")
        outcome = await attr.attribute_manual(s, org_id, c2.id)
        await s.commit()
        assert outcome.ensam_code == "E2"

        # E1 still waiting at position 1
        c1, e1 = await _entry(s, "E1")
        assert e1.status == QueueStatus.WAITING
        assert await get_queue_position(s, e1) == 1


async def test_double_attribution_rejected():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, ["E1", "E2"])
        c1, _ = await _entry(s, "E1")
        await attr.attribute_manual(s, org_id, c1.id)
        await s.commit()
        with pytest.raises(AttributionError):
            await attr.attribute_manual(s, org_id, c1.id)


async def test_undo_attribution_restores_position():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, ["E1", "E2", "E3"])
        await attr.attribute_next(s, org_id, "GI-ILSI")
        await s.commit()
        c1, _ = await _entry(s, "E1")
        await attr.undo_attribution(s, org_id, c1.id)
        await s.commit()

        _, e1 = await _entry(s, "E1")
        assert e1.status == QueueStatus.WAITING
        assert await get_queue_position(s, e1) == 1  # restored to front


async def test_cancel_and_restore():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, ["E1", "E2"])
        c1, _ = await _entry(s, "E1")
        await attr.cancel_candidate(s, org_id, c1.id)
        await s.commit()
        _, e1 = await _entry(s, "E1")
        assert e1.status == QueueStatus.CANCELLED

        await attr.restore_candidate(s, org_id, c1.id)
        await s.commit()
        _, e1 = await _entry(s, "E1")
        assert e1.status == QueueStatus.WAITING
        assert await get_queue_position(s, e1) == 1


async def test_undo_last_reverses_fifo():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, ["E1", "E2"])
        await attr.attribute_next(s, org_id, "GI-ILSI")
        await s.commit()

        outcome = await attr.undo_last(s, org_id)
        await s.commit()
        assert outcome.new_status == "WAITING"
        _, e1 = await _entry(s, "E1")
        assert e1.status == QueueStatus.WAITING


async def test_concurrent_fifo_no_double_attribution():
    org_id = await _make_organizer()
    async with SessionFactory() as s:
        await _register(s, [f"E{i}" for i in range(10)])
        await s.commit()

    async def do_one():
        async with SessionFactory() as s:
            try:
                return await attr.attribute_next(s, org_id, "GI-ILSI")
            except AttributionError:
                return None
            finally:
                await s.commit()

    results = await asyncio.gather(*[do_one() for _ in range(10)])
    attributed = [r for r in results if r is not None]
    # Only 10 candidates exist, so at most 10 attributed; all unique.
    codes = [r.ensam_code for r in attributed]
    assert len(codes) == len(set(codes))

    async with SessionFactory() as s:
        await s.execute(select(QueueEntry).where(QueueEntry.status == QueueStatus.WAITING))
        attributed_count = (
            await s.execute(select(QueueEntry).where(QueueEntry.status == QueueStatus.ATTRIBUTED))
        ).scalars().all()
        assert len(attributed_count) == len(attributed)
