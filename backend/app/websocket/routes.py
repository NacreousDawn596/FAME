"""WebSocket endpoints with authentication."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.database import SessionFactory
from app.models import Candidate, OrganizerSession
from app.security.deps import CANDIDATE_COOKIE, ORGANIZER_COOKIE
from app.security.tokens import TokenError, decode_candidate_session
from app.services.queue import get_active_queue_entry
from app.websocket.manager import manager

router = APIRouter()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.websocket("/api/v1/ws/candidate")
async def candidate_ws(websocket: WebSocket) -> None:
    token = websocket.cookies.get(CANDIDATE_COOKIE)
    if not token:
        await websocket.close(code=4401)
        return
    try:
        claims = decode_candidate_session(token)
    except TokenError:
        await websocket.close(code=4401)
        return

    candidate_id = int(claims["sub"])
    async with SessionFactory() as session:
        candidate = await session.get(Candidate, candidate_id)
        if candidate is None:
            await websocket.close(code=4401)
            return
        entry = await get_active_queue_entry(session, candidate_id)
        filiere = entry.filiere_code if entry else candidate.filiere_code

        await manager.connect_candidate(websocket, candidate_id, filiere)
        try:
            while True:
                # Client pings / no-op; we push updates server-side.
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect_candidate(candidate_id, filiere)
        except Exception:
            manager.disconnect_candidate(candidate_id, filiere)


@router.websocket("/api/v1/ws/organizer")
async def organizer_ws(websocket: WebSocket) -> None:
    token = websocket.cookies.get(ORGANIZER_COOKIE)
    if not token:
        await websocket.close(code=4401)
        return
    token_hash = _hash_token(token)
    async with SessionFactory() as session:
        result = await session.execute(
            select(OrganizerSession).where(OrganizerSession.token_hash == token_hash)
        )
        org_session = result.scalar_one_or_none()
        if org_session is None or org_session.expires_at <= datetime.now(timezone.utc):
            await websocket.close(code=4401)
            return

        await manager.connect_organizer(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect_organizer(websocket)
        except Exception:
            manager.disconnect_organizer(websocket)
