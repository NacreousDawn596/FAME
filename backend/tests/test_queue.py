"""Queue registration, ordering, and position tests."""

from types import SimpleNamespace

import pytest
from sqlalchemy import func, select

from app.database import SessionFactory
from app.models import Candidate, QueueEntry
from app.models.enums import QueueStatus
from app.services.queue import get_queue_position, register_candidate


def ident(ensam, name="A", last="B", year="3A", filiere="GI-ILSI"):
    return SimpleNamespace(
        ensam_code=ensam, first_name=name, last_name=last, year=year, filiere=filiere
    )


async def test_register_creates_candidate_and_entry():
    async with SessionFactory() as s:
        c = await register_candidate(s, ident("E1"))
        await s.commit()
        assert c.id is not None
        entries = (await s.execute(select(QueueEntry))).scalars().all()
        assert len(entries) == 1
        assert entries[0].status == QueueStatus.WAITING


async def test_duplicate_ensam_code_not_created():
    async with SessionFactory() as s:
        await register_candidate(s, ident("E1"))
        await s.commit()
        await register_candidate(s, ident("E1", name="Other"))
        await s.commit()
    async with SessionFactory() as s:
        count = (await s.execute(select(func.count()).select_from(Candidate))).scalar_one()
        assert count == 1


async def test_fifo_positions():
    async with SessionFactory() as s:
        for code in ["E1", "E2", "E3"]:
            await register_candidate(s, ident(code))
        await s.commit()

        entries = (
            (await s.execute(select(QueueEntry).order_by(QueueEntry.joined_at, QueueEntry.id))).scalars().all()
        )
        positions = [await get_queue_position(s, e) for e in entries]
        assert positions == [1, 2, 3]


async def test_positions_are_per_filiere():
    async with SessionFactory() as s:
        await register_candidate(s, ident("E1", filiere="GI-ILSI"))
        await register_candidate(s, ident("E2", filiere="GC"))
        await register_candidate(s, ident("E3", filiere="GI-ILSI"))
        await s.commit()

        entries = (
            (await s.execute(select(QueueEntry).order_by(QueueEntry.joined_at, QueueEntry.id))).scalars().all()
        )
        by_code = {}
        for e in entries:
            by_code.setdefault(e.candidate_id, await get_queue_position(s, e))
        # E1 GI-ILSI -> pos 1; E2 GC -> pos 1; E3 GI-ILSI -> pos 2
        positions = {e.candidate_id: await get_queue_position(s, e) for e in entries}
        assert positions[entries[0].candidate_id] == 1  # E1 GI-ILSI
        assert positions[entries[1].candidate_id] == 1  # E2 GC
        assert positions[entries[2].candidate_id] == 2  # E3 GI-ILSI


async def test_resolve_filiere_on_registration():
    async with SessionFactory() as s:
        c = await register_candidate(s, ident("E1", filiere="Génie Informatique : Ingénierie Logicielle et Systèmes Intelligents"))
        await s.commit()
        assert c.filiere_code == "GI-ILSI"
