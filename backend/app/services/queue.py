"""Queue service: registration, ordering, and position computation."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Candidate, QueueEntry
from app.models.enums import QueueStatus
from app.services.filiere import get_filiere_name, resolve_filiere


def _filiere_clause(code: str | None):
    if code is None:
        return QueueEntry.filiere_code.is_(None)
    return QueueEntry.filiere_code == code


async def get_queue_position(
    session: AsyncSession,
    entry: QueueEntry,
) -> int:
    """Number of waiting candidates ahead of `entry` + 1 (deterministic)."""
    ahead = select(func.count()).select_from(QueueEntry).where(
        _filiere_clause(entry.filiere_code),
        QueueEntry.status == QueueStatus.WAITING,
        (QueueEntry.joined_at < entry.joined_at)
        | ((QueueEntry.joined_at == entry.joined_at) & (QueueEntry.id < entry.id)),
    )
    count = (await session.execute(ahead)).scalar_one()
    return int(count) + 1


async def get_active_queue_entry(
    session: AsyncSession, candidate_id: int
) -> QueueEntry | None:
    result = await session.execute(
        select(QueueEntry).where(QueueEntry.candidate_id == candidate_id)
    )
    return result.scalar_one_or_none()


async def withdraw_candidate(session: AsyncSession, candidate_id: int) -> bool:
    """Mark a candidate's queue entry as WITHDRAWN (voluntary self-removal).

    Returns True if the candidate was withdrawn, False if not eligible.
    """
    entry = await get_active_queue_entry(session, candidate_id)
    if entry is None or entry.status != QueueStatus.WAITING:
        return False
    entry.status = QueueStatus.WITHDRAWN
    entry.version = (entry.version or 0) + 1
    return True


async def register_candidate(
    session: AsyncSession,
    identity,
) -> Candidate:
    """Create or retrieve a candidate and ensure they have a queue entry.

    Returns the candidate. Idempotent on `ensam_code`.
    """
    ensam_code = identity.ensam_code
    filiere_code = resolve_filiere(identity.filiere)
    email = getattr(identity, "email", None)
    phone = getattr(identity, "phone", None)

    result = await session.execute(
        select(Candidate).where(Candidate.ensam_code == ensam_code)
    )
    candidate = result.scalar_one_or_none()

    if candidate is None:
        candidate = Candidate(
            ensam_code=ensam_code,
            first_name=identity.first_name or "—",
            last_name=identity.last_name or "—",
            year=identity.year,
            email=email,
            phone=phone,
            filiere_code=filiere_code,
        )
        session.add(candidate)
        await session.flush()
    else:
        # Update display attributes (name/filiere may be refreshed by SchoolApp).
        candidate.first_name = identity.first_name or candidate.first_name
        candidate.last_name = identity.last_name or candidate.last_name
        if identity.year:
            candidate.year = identity.year
        if email:
            candidate.email = email
        if phone:
            candidate.phone = phone
        if filiere_code and candidate.filiere_code != filiere_code:
            candidate.filiere_code = filiere_code

    entry = await get_active_queue_entry(session, candidate.id)
    if entry is None:
        entry = QueueEntry(
            candidate_id=candidate.id,
            filiere_code=filiere_code,
            status=QueueStatus.WAITING,
        )
        session.add(entry)
    elif entry.filiere_code != filiere_code:
        entry.filiere_code = filiere_code

    return candidate


async def get_candidate_status(
    session: AsyncSession,
    candidate: Candidate,
) -> dict:
    """Build the candidate's queue status payload."""
    entry = await get_active_queue_entry(session, candidate.id)
    company_name = _company_name(session)

    if entry is None:
        return {
            "status": "NOT_REGISTERED",
            "position": None,
            "filiere_code": candidate.filiere_code,
            "filiere_name": get_filiere_name(candidate.filiere_code),
            "company_name": await company_name,
            "joined_at": None,
            "attributed_at": None,
            "regulator": None,
            "room": None,
            "message": "You are not yet in a queue.",
        }

    position = None
    if entry.status == QueueStatus.WAITING:
        position = await get_queue_position(session, entry)

    status = entry.status.value
    message = _status_message(status)

    return {
        "status": status,
        "position": position,
        "filiere_code": entry.filiere_code or candidate.filiere_code,
        "filiere_name": get_filiere_name(entry.filiere_code or candidate.filiere_code),
        "company_name": await company_name,
        "joined_at": entry.joined_at,
        "attributed_at": entry.attributed_at,
        "regulator": entry.regulator,
        "room": entry.room,
        "message": message,
    }


def _status_message(status: str) -> str:
    if status == "WAITING":
        return "Your turn is approaching. Stay nearby."
    if status == "ATTRIBUTED":
        return "Your turn has arrived."
    if status == "CANCELLED":
        return "Your place in the queue has been cancelled."
    if status == "WITHDRAWN":
        return "You have withdrawn from the queue."
    return ""


async def _company_name(session: AsyncSession) -> str:
    from app.models import Company

    result = await session.execute(select(Company).order_by(Company.id).limit(1))
    company = result.scalar_one_or_none()
    return company.name if company else "FAME Recruitment"
