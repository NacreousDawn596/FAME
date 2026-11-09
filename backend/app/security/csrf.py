"""CSRF verification for cookie-authenticated state-changing requests."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select

from app.models import OrganizerSession
from app.security.deps import (
    SessionDep,
)
from app.security.tokens import TokenError, decode_candidate_session


def _hash_token(token: str) -> str:
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()


async def candidate_csrf(
    session: SessionDep,
    fame_session: Annotated[str | None, Cookie()] = None,
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> None:
    if not fame_session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        claims = decode_candidate_session(fame_session)
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from exc
    if not x_csrf_token or not secrets.compare_digest(x_csrf_token, claims["csrf"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid CSRF token")


async def organizer_csrf(
    session: SessionDep,
    fame_organizer_session: Annotated[str | None, Cookie()] = None,
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> None:
    if not fame_organizer_session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    token_hash = _hash_token(fame_organizer_session)
    result = await session.execute(
        select(OrganizerSession).where(OrganizerSession.token_hash == token_hash)
    )
    org_session = result.scalar_one_or_none()
    if org_session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")
    if not x_csrf_token or not secrets.compare_digest(x_csrf_token, org_session.csrf_token):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid CSRF token")


CandidateCSRF = Annotated[None, Depends(candidate_csrf)]
OrganizerCSRF = Annotated[None, Depends(organizer_csrf)]
