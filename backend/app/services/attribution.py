"""Attribution service: FIFO/manual attribution and reversible operations.

All operations mutate state inside the caller's transaction and record an
immutable `AttributionEvent`. Concurrency safety for FIFO is provided by
`SELECT ... FOR UPDATE SKIP LOCKED`.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AttributionEvent, Candidate, QueueEntry
from app.models.enums import AttributionOperation, QueueStatus
from app.services.queue import get_active_queue_entry, get_queue_position


class AttributionError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


@dataclass
class AttributionOutcome:
    operation_id: int
    candidate_id: int
    ensam_code: str
    first_name: str
    last_name: str
    filiere_code: str | None
    previous_position: int | None
    new_status: str
    timestamp: datetime
    affected_filiere: str | None
    # candidate ids whose queue status changed (for WS + notifications)
    notify_candidate_id: int


def _now() -> datetime:
    return datetime.now(UTC)


def _apply_status(entry: QueueEntry, new_status: QueueStatus, now: datetime) -> None:
    entry.status = new_status
    entry.attributed_at = now if new_status == QueueStatus.ATTRIBUTED else None
    entry.cancelled_at = now if new_status == QueueStatus.CANCELLED else None
    entry.version = (entry.version or 0) + 1


async def _record(
    session: AsyncSession,
    *,
    candidate_id: int,
    organizer_id: int | None,
    operation: AttributionOperation,
    previous_state: QueueStatus | None,
    new_state: QueueStatus | None,
    previous_filiere: str | None,
    new_filiere: str | None,
    previous_queue_position: int | None,
    new_queue_position: int | None,
    undo_of: int | None = None,
    related_event_id: int | None = None,
    reason: str | None = None,
) -> AttributionEvent:
    event = AttributionEvent(
        candidate_id=candidate_id,
        organizer_id=organizer_id,
        operation_type=operation,
        previous_state=previous_state.value if previous_state else None,
        new_state=new_state.value if new_state else None,
        previous_filiere=previous_filiere,
        new_filiere=new_filiere,
        previous_queue_position=previous_queue_position,
        new_queue_position=new_queue_position,
        undo_of=undo_of,
        related_event_id=related_event_id,
        reason=reason,
    )
    session.add(event)
    await session.flush()
    return event


def _outcome(event: AttributionEvent, candidate: Candidate, entry: QueueEntry, prev_pos: int | None) -> AttributionOutcome:
    return AttributionOutcome(
        operation_id=event.id,
        candidate_id=candidate.id,
        ensam_code=candidate.ensam_code,
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        filiere_code=entry.filiere_code,
        previous_position=prev_pos,
        new_status=entry.status.value,
        timestamp=_now(),
        affected_filiere=entry.filiere_code,
        notify_candidate_id=candidate.id,
    )


async def _load_candidate(session: AsyncSession, candidate_id: int) -> Candidate:
    candidate = await session.get(Candidate, candidate_id)
    if candidate is None:
        raise AttributionError(404, "Candidate not found")
    return candidate


# --- FIFO attribution ---------------------------------------------------------


async def attribute_next(
    session: AsyncSession, organizer_id: int, filiere_code: str | None
) -> AttributionOutcome:
    now = _now()
    stmt = (
        select(QueueEntry)
        .where(
            (QueueEntry.filiere_code == filiere_code)
            if filiere_code is not None
            else QueueEntry.filiere_code.is_(None),
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.joined_at, QueueEntry.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    entry = (await session.execute(stmt)).scalar_one_or_none()
    if entry is None:
        raise AttributionError(404, "No waiting candidate in this filière")

    candidate = await _load_candidate(session, entry.candidate_id)
    prev_pos = await get_queue_position(session, entry)

    _apply_status(entry, QueueStatus.ATTRIBUTED, now)
    event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.FIFO,
        previous_state=QueueStatus.WAITING,
        new_state=QueueStatus.ATTRIBUTED,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=prev_pos,
        new_queue_position=None,
    )
    return _outcome(event, candidate, entry, prev_pos)


# --- Manual attribution -------------------------------------------------------


async def attribute_manual(
    session: AsyncSession,
    organizer_id: int,
    candidate_id: int,
    reason: str | None = None,
) -> AttributionOutcome:
    now = _now()
    candidate = await _load_candidate(session, candidate_id)
    entry = await get_active_queue_entry(session, candidate_id)
    if entry is None:
        raise AttributionError(409, "Candidate has no queue entry")
    if entry.status == QueueStatus.ATTRIBUTED:
        raise AttributionError(409, "Candidate is already attributed")
    if entry.status == QueueStatus.CANCELLED:
        raise AttributionError(409, "Candidate is cancelled; restore first")

    prev_pos = await get_queue_position(session, entry) if entry.status == QueueStatus.WAITING else None
    prev_state = entry.status

    _apply_status(entry, QueueStatus.ATTRIBUTED, now)
    event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.MANUAL,
        previous_state=prev_state,
        new_state=QueueStatus.ATTRIBUTED,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=prev_pos,
        new_queue_position=None,
        reason=reason,
    )
    return _outcome(event, candidate, entry, prev_pos)


# --- Reversible operations ----------------------------------------------------


async def undo_attribution(
    session: AsyncSession, organizer_id: int, candidate_id: int
) -> AttributionOutcome:
    now = _now()
    candidate = await _load_candidate(session, candidate_id)
    entry = await get_active_queue_entry(session, candidate_id)
    if entry is None or entry.status != QueueStatus.ATTRIBUTED:
        raise AttributionError(409, "Candidate is not attributed")

    last = await _last_action_event(session, candidate_id)
    _apply_status(entry, QueueStatus.WAITING, now)
    # Undone candidates rejoin at the bottom of their filière queue.
    entry.joined_at = now
    new_pos = await get_queue_position(session, entry)

    event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.UNDO,
        previous_state=QueueStatus.ATTRIBUTED,
        new_state=QueueStatus.WAITING,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=None,
        new_queue_position=new_pos,
        undo_of=last.id if last else None,
        related_event_id=last.id if last else None,
    )
    return _outcome(event, candidate, entry, None)


async def return_to_queue(
    session: AsyncSession, organizer_id: int, candidate_id: int, reason: str | None = None
) -> AttributionOutcome:
    now = _now()
    candidate = await _load_candidate(session, candidate_id)
    entry = await get_active_queue_entry(session, candidate_id)
    if entry is None or entry.status != QueueStatus.ATTRIBUTED:
        raise AttributionError(409, "Candidate is not attributed")

    _apply_status(entry, QueueStatus.WAITING, now)
    new_pos = await get_queue_position(session, entry)

    event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.RETURN,
        previous_state=QueueStatus.ATTRIBUTED,
        new_state=QueueStatus.WAITING,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=None,
        new_queue_position=new_pos,
        reason=reason,
    )
    return _outcome(event, candidate, entry, None)


async def cancel_candidate(
    session: AsyncSession, organizer_id: int, candidate_id: int, reason: str | None = None
) -> AttributionOutcome:
    now = _now()
    candidate = await _load_candidate(session, candidate_id)
    entry = await get_active_queue_entry(session, candidate_id)
    if entry is None or entry.status == QueueStatus.CANCELLED:
        raise AttributionError(409, "Candidate is already cancelled or absent")

    prev_pos = await get_queue_position(session, entry) if entry.status == QueueStatus.WAITING else None
    prev_state = entry.status

    _apply_status(entry, QueueStatus.CANCELLED, now)
    event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.CANCEL,
        previous_state=prev_state,
        new_state=QueueStatus.CANCELLED,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=prev_pos,
        new_queue_position=None,
        reason=reason,
    )
    return _outcome(event, candidate, entry, prev_pos)


async def restore_candidate(
    session: AsyncSession, organizer_id: int, candidate_id: int
) -> AttributionOutcome:
    now = _now()
    candidate = await _load_candidate(session, candidate_id)
    entry = await get_active_queue_entry(session, candidate_id)
    if entry is None or entry.status != QueueStatus.CANCELLED:
        raise AttributionError(409, "Candidate is not cancelled")

    _apply_status(entry, QueueStatus.WAITING, now)
    new_pos = await get_queue_position(session, entry)

    event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.RESTORE,
        previous_state=QueueStatus.CANCELLED,
        new_state=QueueStatus.WAITING,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=None,
        new_queue_position=new_pos,
    )
    return _outcome(event, candidate, entry, None)


async def undo_last(session: AsyncSession, organizer_id: int) -> AttributionOutcome:
    """Reverse the most recent eligible (non-UNDO) organizer action."""
    now = _now()
    result = await session.execute(
        select(AttributionEvent)
        .where(AttributionEvent.operation_type != AttributionOperation.UNDO)
        .order_by(AttributionEvent.id.desc())
        .limit(1)
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise AttributionError(404, "No operation to undo")

    candidate = await _load_candidate(session, event.candidate_id)
    entry = await get_active_queue_entry(session, event.candidate_id)
    if entry is None:
        raise AttributionError(409, "Candidate has no queue entry")

    target = QueueStatus(event.previous_state) if event.previous_state else QueueStatus.WAITING
    _apply_status(entry, target, now)
    if target == QueueStatus.WAITING:
        # Undone candidates rejoin at the bottom of their filière queue.
        entry.joined_at = now
    new_pos = await get_queue_position(session, entry) if target == QueueStatus.WAITING else None

    undo_event = await _record(
        session,
        candidate_id=candidate.id,
        organizer_id=organizer_id,
        operation=AttributionOperation.UNDO,
        previous_state=_from_value(event.new_state),
        new_state=target,
        previous_filiere=entry.filiere_code,
        new_filiere=entry.filiere_code,
        previous_queue_position=event.new_queue_position,
        new_queue_position=new_pos,
        undo_of=event.id,
        related_event_id=event.id,
    )
    return _outcome(undo_event, candidate, entry, new_pos)


def _from_value(value: str | None) -> QueueStatus | None:
    return QueueStatus(value) if value else None


async def _last_action_event(session: AsyncSession, candidate_id: int) -> AttributionEvent | None:
    result = await session.execute(
        select(AttributionEvent)
        .where(
            AttributionEvent.candidate_id == candidate_id,
            AttributionEvent.operation_type != AttributionOperation.UNDO,
        )
        .order_by(AttributionEvent.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
