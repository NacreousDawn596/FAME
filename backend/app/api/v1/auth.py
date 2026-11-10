"""Candidate authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.config import settings
from app.schemas.auth import SchoolAppAuthRequest
from app.schemas.candidate import CandidateProfile
from app.security.deps import CANDIDATE_COOKIE, CurrentCandidate, SessionDep
from app.security.tokens import (
    TokenError,
    create_candidate_session,
    create_csrf_token,
    verify_schoolapp_assertion,
)
from app.services.activity import log_activity
from app.services.queue import register_candidate

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_candidate_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=CANDIDATE_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        max_age=60 * 60 * 24 * 30,
        path="/",
    )


@router.post("/schoolapp")
async def schoolapp_auth(
    body: SchoolAppAuthRequest,
    response: Response,
    session: SessionDep,
):
    """Verify a SchoolApp-signed assertion and establish a candidate session."""
    try:
        identity = verify_schoolapp_assertion(body.assertion)
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    if not identity.ensam_code:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Assertion missing identity")

    candidate = await register_candidate(session, identity)
    await log_activity(
        session,
        actor_type="candidate",
        actor_id=candidate.id,
        action="candidate.login",
        details={
            "ensam_code": candidate.ensam_code,
            "name": f"{candidate.first_name} {candidate.last_name}".strip(),
            "email": candidate.email,
            "phone": candidate.phone,
            "filiere": candidate.filiere_code,
            "year": candidate.year,
        },
    )
    await session.commit()

    csrf = create_csrf_token()
    token = create_candidate_session(candidate.id, candidate.ensam_code, csrf)
    _set_candidate_cookie(response, token)

    return {
        "candidate": CandidateProfile(
            id=candidate.id,
            ensam_code=candidate.ensam_code,
            first_name=candidate.first_name,
            last_name=candidate.last_name,
            year=candidate.year,
            email=candidate.email,
            phone=candidate.phone,
            filiere_code=candidate.filiere_code,
        ),
        "csrf": csrf,
    }


@router.get("/me")
async def get_me(candidate: CurrentCandidate):
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


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(CANDIDATE_COOKIE, path="/")
    return {"ok": True}
