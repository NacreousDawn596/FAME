"""Read-model queries for the organizer dashboard."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AttributionEvent,
    Candidate,
    Company,
    Filiere,
    NotificationEvent,
    Organizer,
    QueueEntry,
)
from app.models.enums import QueueStatus

POSITION = func.row_number().over(
    partition_by=QueueEntry.filiere_code,
    order_by=(QueueEntry.joined_at, QueueEntry.id),
).label("position")


def _waiting_positions_cte():
    return (
        select(
            QueueEntry.candidate_id.label("candidate_id"),
            POSITION,
        )
        .where(QueueEntry.status == QueueStatus.WAITING)
        .cte("waiting_positions")
    )


async def list_candidates(
    session: AsyncSession,
    *,
    search: str | None = None,
    filiere_code: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict], int]:
    pos_cte = _waiting_positions_cte()

    stmt = (
        select(
            Candidate.id,
            Candidate.ensam_code,
            Candidate.first_name,
            Candidate.last_name,
            Candidate.year,
            Candidate.filiere_code,
            QueueEntry.status,
            pos_cte.c.position,
            QueueEntry.joined_at,
        )
        .join(QueueEntry, QueueEntry.candidate_id == Candidate.id)
        .outerjoin(pos_cte, pos_cte.c.candidate_id == Candidate.id)
    )

    count_stmt = (
        select(func.count())
        .select_from(Candidate)
        .join(QueueEntry, QueueEntry.candidate_id == Candidate.id)
    )

    conditions = []
    if search:
        like = f"%{search.strip()}%"
        conditions.append(
            or_(
                Candidate.first_name.ilike(like),
                Candidate.last_name.ilike(like),
                Candidate.ensam_code.ilike(like),
                Candidate.filiere_code.ilike(like),
                Candidate.year.ilike(like),
            )
        )
    if filiere_code:
        conditions.append(Candidate.filiere_code == filiere_code)
    if status_filter:
        conditions.append(QueueEntry.status == QueueStatus(status_filter))

    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = (await session.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Candidate.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await session.execute(stmt)).all()

    items = [
        {
            "id": r.id,
            "ensam_code": r.ensam_code,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "year": r.year,
            "filiere_code": r.filiere_code,
            "status": r.status.value,
            "position": r.position if r.status == QueueStatus.WAITING else None,
            "joined_at": r.joined_at,
        }
        for r in rows
    ]
    return items, total


async def dashboard_stats(session: AsyncSession) -> dict:
    total = (await session.execute(select(func.count()).select_from(Candidate))).scalar_one()
    waiting = (
        await session.execute(
            select(func.count())
            .select_from(QueueEntry)
            .where(QueueEntry.status == QueueStatus.WAITING)
        )
    ).scalar_one()
    attributed = (
        await session.execute(
            select(func.count())
            .select_from(QueueEntry)
            .where(QueueEntry.status == QueueStatus.ATTRIBUTED)
        )
    ).scalar_one()
    cancelled = (
        await session.execute(
            select(func.count())
            .select_from(QueueEntry)
            .where(QueueEntry.status == QueueStatus.CANCELLED)
        )
    ).scalar_one()
    return {
        "total_candidates": total,
        "waiting": waiting,
        "attributed": attributed,
        "cancelled": cancelled,
    }


async def waiting_by_filiere(session: AsyncSession) -> list[dict]:
    rows = (
        await session.execute(
            select(
                QueueEntry.filiere_code,
                Filiere.intitule,
                func.count().label("cnt"),
            )
            .join(Filiere, Filiere.code == QueueEntry.filiere_code, isouter=True)
            .where(QueueEntry.status == QueueStatus.WAITING)
            .group_by(QueueEntry.filiere_code, Filiere.intitule)
            .order_by(func.count().desc())
        )
    ).all()
    return [
        {"code": r.filiere_code, "intitule": r.intitule or "—", "waiting": r.cnt}
        for r in rows
    ]


async def filiere_queues(session: AsyncSession) -> list[dict]:
    filieres = (await session.execute(select(Filiere).order_by(Filiere.code))).scalars().all()
    status_counts = (
        await session.execute(
            select(
                QueueEntry.filiere_code,
                QueueEntry.status,
                func.count().label("cnt"),
            ).group_by(QueueEntry.filiere_code, QueueEntry.status)
        )
    ).all()

    by_code: dict[str, dict] = {}
    for r in status_counts:
        entry = by_code.setdefault(r.filiere_code, {"waiting": 0, "attributed": 0, "cancelled": 0})
        entry[r.status.value.lower()] = r.cnt

    first_waiting = {}
    first_rows = (
        await session.execute(
            select(
                QueueEntry.filiere_code,
                Candidate.first_name,
                Candidate.last_name,
                Candidate.ensam_code,
                QueueEntry.joined_at,
            )
            .join(Candidate, Candidate.id == QueueEntry.candidate_id)
            .where(QueueEntry.status == QueueStatus.WAITING)
        )
    ).all()
    # Determine first waiting per filiere in FIFO order.
    from collections import defaultdict

    per_filiere = defaultdict(list)
    for r in first_rows:
        per_filiere[r.filiere_code].append(r)
    for code, rows in per_filiere.items():
        rows.sort(key=lambda r: r.joined_at)
        first = rows[0]
        first_waiting[code] = (
            f"{first.first_name} {first.last_name} ({first.ensam_code})",
            first.joined_at,
        )

    result = []
    for f in filieres:
        counts = by_code.get(f.code, {"waiting": 0, "attributed": 0, "cancelled": 0})
        fw = first_waiting.get(f.code)
        result.append(
            {
                "code": f.code,
                "intitule": f.intitule,
                "waiting": counts["waiting"],
                "attributed": counts["attributed"],
                "cancelled": counts["cancelled"],
                "first_waiting": fw[0] if fw else None,
                "first_waiting_joined_at": fw[1] if fw else None,
            }
        )
    return result


async def filiere_queue_detail(session: AsyncSession, code: str | None) -> list[dict]:
    pos_cte = _waiting_positions_cte()
    stmt = (
        select(
            QueueEntry.candidate_id,
            Candidate.ensam_code,
            Candidate.first_name,
            Candidate.last_name,
            QueueEntry.joined_at,
            pos_cte.c.position,
        )
        .join(Candidate, Candidate.id == QueueEntry.candidate_id)
        .outerjoin(pos_cte, pos_cte.c.candidate_id == QueueEntry.candidate_id)
        .where(
            (QueueEntry.filiere_code == code) if code is not None else QueueEntry.filiere_code.is_(None),
            QueueEntry.status == QueueStatus.WAITING,
        )
        .order_by(QueueEntry.joined_at, QueueEntry.id)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {
            "candidate_id": r.candidate_id,
            "ensam_code": r.ensam_code,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "position": r.position,
            "joined_at": r.joined_at,
        }
        for r in rows
    ]


async def recent_history(session: AsyncSession, limit: int = 20) -> list[dict]:
    rows = (
        await session.execute(
            select(AttributionEvent, Candidate.ensam_code, Organizer.username)
            .join(Candidate, Candidate.id == AttributionEvent.candidate_id)
            .outerjoin(Organizer, Organizer.id == AttributionEvent.organizer_id)
            .order_by(AttributionEvent.id.desc())
            .limit(limit)
        )
    ).all()
    return [_history_item(e, ensam, username) for e, ensam, username in rows]


async def history_page(
    session: AsyncSession, page: int, page_size: int
) -> tuple[list[dict], int]:
    total = (
        await session.execute(select(func.count()).select_from(AttributionEvent))
    ).scalar_one()
    rows = (
        await session.execute(
            select(AttributionEvent, Candidate.ensam_code, Organizer.username)
            .join(Candidate, Candidate.id == AttributionEvent.candidate_id)
            .outerjoin(Organizer, Organizer.id == AttributionEvent.organizer_id)
            .order_by(AttributionEvent.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return [_history_item(e, ensam, username) for e, ensam, username in rows], total


def _history_item(e: AttributionEvent, ensam: str, username: str | None) -> dict:
    return {
        "id": e.id,
        "candidate_id": e.candidate_id,
        "ensam_code": ensam,
        "organizer_username": username,
        "operation_type": e.operation_type.value,
        "previous_state": e.previous_state,
        "new_state": e.new_state,
        "previous_filiere": e.previous_filiere,
        "new_filiere": e.new_filiere,
        "previous_queue_position": e.previous_queue_position,
        "new_queue_position": e.new_queue_position,
        "undo_of": e.undo_of,
        "reason": e.reason,
        "created_at": e.created_at,
    }


async def notification_stats(session: AsyncSession) -> dict:
    rows = (
        await session.execute(
            select(NotificationEvent.status, func.count().label("cnt")).group_by(
                NotificationEvent.status
            )
        )
    ).all()
    stats = {"total": 0, "sent": 0, "failed": 0, "pending": 0}
    for r in rows:
        stats[r.status.lower()] = r.cnt
        stats["total"] += r.cnt
    return stats


async def notification_page(
    session: AsyncSession, page: int, page_size: int
) -> tuple[list[dict], int]:
    total = (
        await session.execute(select(func.count()).select_from(NotificationEvent))
    ).scalar_one()
    rows = (
        await session.execute(
            select(NotificationEvent, Candidate.ensam_code)
            .join(Candidate, Candidate.id == NotificationEvent.candidate_id)
            .order_by(NotificationEvent.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    items = [
        {
            "id": e.id,
            "candidate_id": e.candidate_id,
            "ensam_code": ensam,
            "event_type": e.event_type,
            "status": e.status,
            "created_at": e.created_at,
            "sent_at": e.sent_at,
        }
        for e, ensam in rows
    ]
    return items, total


async def public_display(
    session: AsyncSession, calls_limit: int = 3, next_limit: int = 8
) -> dict:
    """Data for the unauthenticated public call display.

    Returns recently-called candidates (`calls`) and the front-of-queue
    candidates (`next`, position 1 of each non-empty filière).
    """
    company = (
        await session.execute(select(Company).order_by(Company.id).limit(1))
    ).scalar_one_or_none()

    call_rows = (
        await session.execute(
            select(
                AttributionEvent.created_at,
                Candidate.first_name,
                Candidate.last_name,
                Candidate.filiere_code,
            )
            .join(Candidate, Candidate.id == AttributionEvent.candidate_id)
            .where(AttributionEvent.new_state == QueueStatus.ATTRIBUTED.value)
            .order_by(AttributionEvent.created_at.desc())
            .limit(calls_limit)
        )
    ).all()
    calls = [
        {
            "candidate_name": f"{first} {last}".strip(),
            "filiere_code": filiere,
            "called_at": created_at.isoformat() if created_at else None,
        }
        for created_at, first, last, filiere in call_rows
    ]

    pos_cte = _waiting_positions_cte()
    next_rows = (
        await session.execute(
            select(
                QueueEntry.filiere_code,
                Candidate.first_name,
                Candidate.last_name,
                pos_cte.c.position,
            )
            .join(Candidate, Candidate.id == QueueEntry.candidate_id)
            .join(pos_cte, pos_cte.c.candidate_id == QueueEntry.candidate_id)
            .where(pos_cte.c.position == 1)
            .order_by(QueueEntry.filiere_code)
            .limit(next_limit)
        )
    ).all()
    next_candidates = [
        {
            "position": position,
            "candidate_name": f"{first} {last}".strip(),
            "filiere_code": filiere,
        }
        for filiere, first, last, position in next_rows
    ]

    return {
        "company_name": company.name if company else "FAME Recruitment",
        "calls": calls,
        "next": next_candidates,
    }
