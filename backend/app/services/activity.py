"""Activity / audit logging: persists every user & organizer action.

Each event is written to the `activity_logs` table (queryable) and appended to a
log file (`ACTIVITY_LOG_PATH`).
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import ActivityLog

_file_logger = logging.getLogger("fame.activity")
_file_logger.setLevel(logging.INFO)
_file_logger.propagate = False


def _ensure_file_handler() -> None:
    if any(isinstance(h, logging.FileHandler) for h in _file_logger.handlers):
        return
    path = Path(settings.activity_log_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    handler = logging.FileHandler(path)
    handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    _file_logger.addHandler(handler)


async def log_activity(
    session: AsyncSession,
    *,
    actor_type: str,
    actor_id: int | None,
    action: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Record an activity event to the DB (within the caller's transaction)."""
    details_json = json.dumps(details, ensure_ascii=False, default=str) if details else None
    session.add(
        ActivityLog(
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            details=details_json,
        )
    )

    # Append to the log file (best-effort, independent of the DB commit).
    try:
        _ensure_file_handler()
        _file_logger.info(
            "%s|%s|%s|%s",
            actor_type,
            actor_id if actor_id is not None else "-",
            action,
            details_json or "-",
        )
    except Exception:  # noqa: BLE001 - logging must never break the request
        pass
