"""In-memory WebSocket connection manager.

Candidate connections are filière-scoped; organizer connections are board-wide.
Sensitive data is never broadcast to unauthorized clients.
"""

from __future__ import annotations

import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        # filiere_code -> { candidate_id: WebSocket }
        self._candidate_filiere: dict[str | None, dict[int, WebSocket]] = defaultdict(dict)
        self._organizers: set[WebSocket] = set()

    async def connect_candidate(
        self, ws: WebSocket, candidate_id: int, filiere_code: str | None
    ) -> None:
        await ws.accept()
        self._candidate_filiere[filiere_code][candidate_id] = ws

    def disconnect_candidate(self, candidate_id: int, filiere_code: str | None) -> None:
        bucket = self._candidate_filiere.get(filiere_code)
        if bucket is not None:
            bucket.pop(candidate_id, None)
            if not bucket:
                self._candidate_filiere.pop(filiere_code, None)

    async def connect_organizer(self, ws: WebSocket) -> None:
        await ws.accept()
        self._organizers.add(ws)

    def disconnect_organizer(self, ws: WebSocket) -> None:
        self._organizers.discard(ws)

    async def send_to_candidate(self, candidate_id: int, filiere_code: str | None, message: dict[str, Any]) -> None:
        bucket = self._candidate_filiere.get(filiere_code)
        ws = bucket.get(candidate_id) if bucket else None
        if ws is not None:
            await self._safe_send(ws, message)

    async def broadcast_filiere(self, filiere_code: str | None, message: dict[str, Any]) -> None:
        bucket = self._candidate_filiere.get(filiere_code)
        if not bucket:
            return
        text = json.dumps(message)
        for ws in list(bucket.values()):
            await self._safe_send_text(ws, text)

    async def broadcast_organizers(self, message: dict[str, Any]) -> None:
        text = json.dumps(message)
        for ws in list(self._organizers):
            await self._safe_send_text(ws, text)

    @staticmethod
    async def _safe_send(ws: WebSocket, message: dict[str, Any]) -> None:
        await ConnectionManager._safe_send_text(ws, json.dumps(message))

    @staticmethod
    async def _safe_send_text(ws: WebSocket, text: str) -> None:
        try:
            await ws.send_text(text)
        except Exception:
            pass


manager = ConnectionManager()
