"""Organizer endpoints: auth, dashboard, queues, attribution, history, notifications."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select

from app.config import settings
from app.models import Candidate, Filiere, Organizer, OrganizerSession
from app.models.enums import NotificationEventType
from app.repositories import organizer as repo
from app.schemas.auth import OrganizerLoginRequest, OrganizerLoginResponse
from app.schemas.organizer import (
    AttributionResult,
    CandidateListResponse,
    DashboardResponse,
    FifoRequest,
    FiliereQueueDetail,
    FiliereQueueOut,
    HistoryResponse,
    ManualAttributionRequest,
    NotificationListResponse,
    NotificationTestRequest,
    ReasonRequest,
)
from app.security.csrf import organizer_csrf
from app.security.deps import ORGANIZER_COOKIE, CurrentOrganizer, SessionDep
from app.security.passwords import verify_password
from app.security.rate_limit import rate_limit_login
from app.security.tokens import create_csrf_token, create_organizer_token
from app.services import attribution as attr
from app.services import notifications as notif
from app.services.attribution import AttributionError, AttributionOutcome
from app.services.jobs import enqueue_job
from app.websocket.manager import manager

router = APIRouter(prefix="/organizer", tags=["organizer"])

ORGANIZER_SESSION_HOURS = 12


def _hash_token(token: str) -> str:
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()


def _set_organizer_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ORGANIZER_COOKIE,
        value=token,
        httponly=True,
        samesite="strict",
        secure=settings.is_production,
        max_age=60 * 60 * ORGANIZER_SESSION_HOURS,
        path="/",
    )


# --- Auth ---------------------------------------------------------------------


@router.post("/auth/login", response_model=OrganizerLoginResponse)
async def login(body: OrganizerLoginRequest, response: Response, session: SessionDep):
    await rate_limit_login(body.username)
    organizer = (
        await session.execute(select(Organizer).where(Organizer.username == body.username))
    ).scalar_one_or_none()
    if organizer is None or not verify_password(body.password, organizer.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    token = create_organizer_token()
    csrf = create_csrf_token()
    session.add(
        OrganizerSession(
            organizer_id=organizer.id,
            token_hash=_hash_token(token),
            csrf_token=csrf,
            expires_at=datetime.now(UTC) + timedelta(hours=ORGANIZER_SESSION_HOURS),
        )
    )
    await session.commit()

    _set_organizer_cookie(response, token)
    return OrganizerLoginResponse(username=organizer.username, email=organizer.email, csrf=csrf)


@router.post("/auth/logout", dependencies=[Depends(organizer_csrf)])
async def logout(response: Response, session: SessionDep, organizer: CurrentOrganizer):
    response.delete_cookie(ORGANIZER_COOKIE, path="/")
    return {"ok": True}


# --- Dashboard ----------------------------------------------------------------


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(session: SessionDep, organizer: CurrentOrganizer):
    stats = await repo.dashboard_stats(session)
    by_filiere = await repo.waiting_by_filiere(session)
    recent = await repo.recent_history(session, limit=15)
    nstats = await repo.notification_stats(session)
    return DashboardResponse(
        stats=stats,
        waiting_by_filiere=by_filiere,
        recent_operations=recent,
        notification_stats=nstats,
    )


# --- Candidates ---------------------------------------------------------------


@router.get("/candidates", response_model=CandidateListResponse)
async def list_candidates(
    session: SessionDep,
    organizer: CurrentOrganizer,
    search: str | None = None,
    filiere: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    items, total = await repo.list_candidates(
        session,
        search=search,
        filiere_code=filiere,
        status_filter=status,
        page=max(1, page),
        page_size=min(200, max(1, page_size)),
    )
    return CandidateListResponse(items=items, total=total, page=page, page_size=page_size)


# --- Filieres -----------------------------------------------------------------


@router.get("/filieres")
async def list_filieres(session: SessionDep, organizer: CurrentOrganizer):
    filieres = (await session.execute(select(Filiere).order_by(Filiere.code))).scalars().all()
    return [
        {
            "code": f.code,
            "intitule": f.intitule,
            "departement": f.departement,
            "accreditation": f.accreditation,
        }
        for f in filieres
    ]


# --- Queues -------------------------------------------------------------------


@router.get("/queues", response_model=list[FiliereQueueOut])
async def list_queues(session: SessionDep, organizer: CurrentOrganizer):
    return await repo.filiere_queues(session)


@router.get("/queues/{filiere_code}", response_model=FiliereQueueDetail)
async def queue_detail(session: SessionDep, organizer: CurrentOrganizer, filiere_code: str):
    code = None if filiere_code == "_unspecified" else filiere_code
    waiting = await repo.filiere_queue_detail(session, code)
    intitule = "—"
    if code is not None:
        f = await session.get(Filiere, code)
        intitule = f.intitule if f else "—"
    return FiliereQueueDetail(code=code or "_unspecified", intitule=intitule, waiting=waiting, total_waiting=len(waiting))


# --- Attribution --------------------------------------------------------------


async def _post_commit_effects(outcome: AttributionOutcome, event_ids: list[int]) -> None:
    for eid in event_ids:
        await enqueue_job("deliver_notification", eid)
    await manager.send_to_candidate(
        outcome.notify_candidate_id,
        outcome.affected_filiere,
        {"type": "status_changed", "status": outcome.new_status},
    )
    await manager.broadcast_filiere(
        outcome.affected_filiere, {"type": "queue_changed", "filiere": outcome.affected_filiere}
    )
    await manager.broadcast_organizers({"type": "board_changed"})


async def _schedule_candidate_notification(
    session: SessionDep,
    candidate_id: int,
    event_type: NotificationEventType,
    position: int | None,
    filiere_code: str | None,
    dedup_key: str,
) -> int | None:
    candidate = await session.get(Candidate, candidate_id)
    if candidate is None:
        return None
    payload = notif.build_payload(event_type, candidate, position, filiere_code)
    event = await notif.schedule_notification(session, candidate_id, event_type, payload, dedup_key)
    return event.id if event else None


@router.post("/attributions/fifo", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def attribute_next(
    body: FifoRequest,
    session: SessionDep,
    organizer: CurrentOrganizer,
):
    code = None if body.filiere_code in (None, "", "_unspecified") else body.filiere_code
    return await _fifo(session, organizer, code, body.regulator, body.room)


async def _fifo(
    session: SessionDep,
    organizer: CurrentOrganizer,
    filiere_code: str | None,
    regulator: str | None = None,
    room: str | None = None,
):
    try:
        outcome = await attr.attribute_next(session, organizer.id, filiere_code, regulator, room)
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    event_ids: list[int] = []
    eid = await _schedule_candidate_notification(
        session, outcome.candidate_id, NotificationEventType.ATTRIBUTED, None, filiere_code,
        f"cand:{outcome.candidate_id}:attributed",
    )
    if eid:
        event_ids.append(eid)
    event_ids += await notif.schedule_threshold_notifications(session, filiere_code)

    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


@router.post("/attributions/manual", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def attribute_manual(
    body: ManualAttributionRequest,
    session: SessionDep,
    organizer: CurrentOrganizer,
):
    try:
        outcome = await attr.attribute_manual(
            session, organizer.id, body.candidate_id, body.reason, body.regulator, body.room
        )
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    event_ids: list[int] = []
    eid = await _schedule_candidate_notification(
        session, outcome.candidate_id, NotificationEventType.ATTRIBUTED, None, outcome.affected_filiere,
        f"cand:{outcome.candidate_id}:attributed",
    )
    if eid:
        event_ids.append(eid)
    event_ids += await notif.schedule_threshold_notifications(session, outcome.affected_filiere)

    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


@router.post("/attributions/{candidate_id}/undo", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def undo_attribution(candidate_id: int, session: SessionDep, organizer: CurrentOrganizer):
    try:
        outcome = await attr.undo_attribution(session, organizer.id, candidate_id)
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    event_ids = await _reentry_events(session, outcome, NotificationEventType.REVERSED)
    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


@router.post("/attributions/{candidate_id}/return", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def return_to_queue(candidate_id: int, session: SessionDep, organizer: CurrentOrganizer):
    try:
        outcome = await attr.return_to_queue(session, organizer.id, candidate_id)
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    event_ids = await _reentry_events(session, outcome, NotificationEventType.RETURNED)
    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


@router.post("/candidates/{candidate_id}/cancel", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def cancel_candidate(
    candidate_id: int,
    body: ReasonRequest,
    session: SessionDep,
    organizer: CurrentOrganizer,
):
    try:
        outcome = await attr.cancel_candidate(session, organizer.id, candidate_id, body.reason)
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    event_ids: list[int] = []
    eid = await _schedule_candidate_notification(
        session, outcome.candidate_id, NotificationEventType.CANCELLED, None, outcome.affected_filiere,
        f"cand:{outcome.candidate_id}:cancelled",
    )
    if eid:
        event_ids.append(eid)
    event_ids += await notif.schedule_threshold_notifications(session, outcome.affected_filiere)

    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


@router.post("/candidates/{candidate_id}/restore", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def restore_candidate(candidate_id: int, session: SessionDep, organizer: CurrentOrganizer):
    try:
        outcome = await attr.restore_candidate(session, organizer.id, candidate_id)
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    event_ids = await _reentry_events(session, outcome, NotificationEventType.RETURNED)
    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


@router.post("/operations/undo-last", response_model=AttributionResult, dependencies=[Depends(organizer_csrf)])
async def undo_last(session: SessionDep, organizer: CurrentOrganizer):
    try:
        outcome = await attr.undo_last(session, organizer.id)
    except AttributionError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc

    # Determine the appropriate notification based on resulting status.
    if outcome.new_status == "WAITING":
        event_type = NotificationEventType.REVERSED
        event_ids = await _reentry_events(session, outcome, event_type)
    else:
        event_ids = []
    await session.commit()
    await _post_commit_effects(outcome, event_ids)
    return _result(outcome)


async def _reentry_events(session, outcome: AttributionOutcome, event_type: NotificationEventType) -> list[int]:
    event_ids: list[int] = []
    eid = await _schedule_candidate_notification(
        session, outcome.candidate_id, event_type, None, outcome.affected_filiere,
        f"cand:{outcome.candidate_id}:{event_type.value}",
    )
    if eid:
        event_ids.append(eid)
    event_ids += await notif.schedule_threshold_notifications(session, outcome.affected_filiere)
    return event_ids


def _result(outcome: AttributionOutcome) -> AttributionResult:
    return AttributionResult(
        operation_id=outcome.operation_id,
        candidate_id=outcome.candidate_id,
        ensam_code=outcome.ensam_code,
        first_name=outcome.first_name,
        last_name=outcome.last_name,
        filiere_code=outcome.filiere_code or "",
        previous_position=outcome.previous_position,
        new_status=outcome.new_status,
        regulator=outcome.regulator,
        room=outcome.room,
        timestamp=outcome.timestamp,
    )


# --- History ------------------------------------------------------------------


@router.get("/history", response_model=HistoryResponse)
async def history(
    session: SessionDep,
    organizer: CurrentOrganizer,
    page: int = 1,
    page_size: int = 50,
):
    items, total = await repo.history_page(session, max(1, page), min(200, max(1, page_size)))
    return HistoryResponse(items=items, total=total, page=page, page_size=page_size)


# --- Notifications ------------------------------------------------------------


@router.get("/notifications", response_model=NotificationListResponse)
async def notifications(
    session: SessionDep,
    organizer: CurrentOrganizer,
    page: int = 1,
    page_size: int = 50,
):
    items, total = await repo.notification_page(session, max(1, page), min(200, max(1, page_size)))
    return NotificationListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/notifications/test", dependencies=[Depends(organizer_csrf)])
async def test_notification(
    body: NotificationTestRequest,
    session: SessionDep,
    organizer: CurrentOrganizer,
):
    """Send a test push to a candidate (diagnostics)."""
    from app.models import PushSubscription

    candidate = await session.get(Candidate, body.candidate_id)
    if candidate is None:
        raise HTTPException(404, "Candidate not found")

    subs = (
        await session.execute(
            select(PushSubscription).where(PushSubscription.candidate_id == candidate.id)
        )
    ).scalars().all()
    if not subs:
        return {"ok": False, "message": "Candidate has no push subscription", "subscriptions": 0}

    payload = notif.build_payload(NotificationEventType.ATTRIBUTED, candidate, None, candidate.filiere_code)
    event = await notif.schedule_notification(
        session,
        candidate.id,
        NotificationEventType.ATTRIBUTED,
        payload,
        f"test:{candidate.id}:{datetime.now(UTC).timestamp():.0f}",
    )
    await session.commit()

    event_id = event.id if event else None
    if event_id:
        await enqueue_job("deliver_notification", event_id)

    return {
        "ok": event_id is not None,
        "message": "Test notification scheduled" if event_id else "Duplicate test notification skipped",
        "subscriptions": len(subs),
        "event_id": event_id,
    }
