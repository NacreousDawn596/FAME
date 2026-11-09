"""FastAPI dependencies for candidate & organizer authentication."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Candidate, Organizer, OrganizerSession
from app.security.tokens import TokenError, decode_candidate_session

# Cookie names.
CANDIDATE_COOKIE = "fame_session"
ORGANIZER_COOKIE = "fame_organizer_session"

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# --- Candidate -----------------------------------------------------------------


async def get_current_candidate(
    session: SessionDep,
    fame_session: Annotated[str | None, Cookie()] = None,
) -> Candidate:
    if not fame_session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        claims = decode_candidate_session(fame_session)
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from exc
    candidate_id = int(claims["sub"])
    candidate = await session.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    return candidate


CurrentCandidate = Annotated[Candidate, Depends(get_current_candidate)]


# --- Organizer ----------------------------------------------------------------


async def get_current_organizer(
    session: SessionDep,
    fame_organizer_session: Annotated[str | None, Cookie()] = None,
) -> Organizer:
    if not fame_organizer_session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    token_hash = _hash_token(fame_organizer_session)
    result = await session.execute(
        select(OrganizerSession).where(OrganizerSession.token_hash == token_hash)
    )
    org_session = result.scalar_one_or_none()
    if org_session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    if org_session.expires_at <= datetime.now(timezone.utc):
        await session.delete(org_session)
        await session.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    organizer = await session.get(Organizer, org_session.organizer_id)
    if organizer is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    return organizer


CurrentOrganizer = Annotated[Organizer, Depends(get_current_organizer)]
