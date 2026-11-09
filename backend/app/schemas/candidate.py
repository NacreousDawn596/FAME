"""Candidate-facing schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CandidateProfile(BaseModel):
    id: int
    ensam_code: str
    first_name: str
    last_name: str
    year: str | None
    filiere_code: str | None


class QueueStatusResponse(BaseModel):
    status: str
    position: int | None
    filiere_code: str | None
    filiere_name: str | None
    company_name: str
    joined_at: datetime | None
    attributed_at: datetime | None
    message: str


class CandidateMeResponse(BaseModel):
    candidate: CandidateProfile
    queue: QueueStatusResponse


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    expiration_time: datetime | None = None


class PushSubscriptionResponse(BaseModel):
    id: int
    endpoint: str
    created_at: datetime
