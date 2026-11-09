"""Public (unauthenticated) endpoints — the call display."""

from __future__ import annotations

from fastapi import APIRouter

from app.repositories import organizer as repo
from app.security.deps import SessionDep

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/display")
async def public_display(session: SessionDep):
    """Recently-called candidates and the front of each filière queue."""
    return await repo.public_display(session)
