"""Candidate-facing endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.models import PushSubscription
from app.schemas.candidate import (
    CandidateMeResponse,
    CandidateProfile,
    ContactUpdateRequest,
    PushSubscriptionRequest,
    PushSubscriptionResponse,
)
from app.security.csrf import candidate_csrf
from app.security.deps import CurrentCandidate, SessionDep
from app.services.queue import get_candidate_status, withdraw_candidate

router = APIRouter(prefix="/candidate", tags=["candidate"])


def _profile(candidate) -> CandidateProfile:
    return CandidateProfile(
        id=candidate.id,
        ensam_code=candidate.ensam_code,
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        year=candidate.year,
        email=candidate.email,
        phone=candidate.phone,
        filiere_code=candidate.filiere_code,
    )


@router.get("/me", response_model=CandidateMeResponse)
async def get_me(session: SessionDep, candidate: CurrentCandidate):
    queue = await get_candidate_status(session, candidate)
    return CandidateMeResponse(candidate=_profile(candidate), queue=queue)


@router.get("/queue")
async def get_queue(session: SessionDep, candidate: CurrentCandidate):
    return await get_candidate_status(session, candidate)


@router.get("/status")
async def get_status(session: SessionDep, candidate: CurrentCandidate):
    return await get_candidate_status(session, candidate)


@router.post("/push-subscriptions", response_model=PushSubscriptionResponse, dependencies=[Depends(candidate_csrf)])
async def add_push_subscription(
    body: PushSubscriptionRequest,
    session: SessionDep,
    candidate: CurrentCandidate,
):
    # Deduplicate by endpoint; update if already present.
    existing = (
        await session.execute(
            select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
        )
    ).scalar_one_or_none()

    if existing is not None:
        if existing.candidate_id != candidate.id:
            existing.candidate_id = candidate.id
        existing.p256dh = body.p256dh
        existing.auth = body.auth
        existing.expiration_time = body.expiration_time
        sub = existing
    else:
        sub = PushSubscription(
            candidate_id=candidate.id,
            endpoint=body.endpoint,
            p256dh=body.p256dh,
            auth=body.auth,
            expiration_time=body.expiration_time,
        )
        session.add(sub)

    await session.commit()
    await session.refresh(sub)
    return PushSubscriptionResponse(id=sub.id, endpoint=sub.endpoint, created_at=sub.created_at)


@router.delete("/push-subscriptions/{subscription_id}", dependencies=[Depends(candidate_csrf)])
async def remove_push_subscription(
    subscription_id: int,
    session: SessionDep,
    candidate: CurrentCandidate,
):
    sub = await session.get(PushSubscription, subscription_id)
    if sub is None or sub.candidate_id != candidate.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")
    await session.delete(sub)
    await session.commit()
    return {"ok": True}


@router.post("/withdraw", dependencies=[Depends(candidate_csrf)])
async def withdraw(session: SessionDep, candidate: CurrentCandidate):
    withdrew = await withdraw_candidate(session, candidate.id)
    if not withdrew:
        raise HTTPException(status.HTTP_409_CONFLICT, "Not currently waiting")
    await session.commit()
    return {"ok": True}


@router.post("/contact", dependencies=[Depends(candidate_csrf)])
async def update_contact(
    body: ContactUpdateRequest,
    session: SessionDep,
    candidate: CurrentCandidate,
):
    if body.email is not None:
        candidate.email = body.email.strip() or None
    if body.phone is not None:
        candidate.phone = body.phone.strip() or None
    await session.commit()
    return {
        "ok": True,
        "email": candidate.email,
        "phone": candidate.phone,
    }
