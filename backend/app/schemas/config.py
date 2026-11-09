"""Public configuration schema."""

from __future__ import annotations

from pydantic import BaseModel


class PublicConfigResponse(BaseModel):
    company_name: str
    event_open: bool
    vapid_public_key: str
    approaching_threshold: int
    urgent_threshold: int
    schoolapp_worker_url: str
    filieres: list[dict]
