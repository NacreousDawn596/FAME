"""Organizer-facing schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class FiliereOut(BaseModel):
    code: str
    intitule: str
    departement: str
    accreditation: str


class FiliereQueueOut(BaseModel):
    code: str
    intitule: str
    waiting: int
    attributed: int
    cancelled: int
    first_waiting: str | None  # "Name (ENSAM code)" of the first candidate
    first_waiting_joined_at: datetime | None


class CandidateRow(BaseModel):
    id: int
    ensam_code: str
    first_name: str
    last_name: str
    year: str | None
    filiere_code: str | None
    status: str
    position: int | None
    joined_at: datetime | None


class CandidateListResponse(BaseModel):
    items: list[CandidateRow]
    total: int
    page: int
    page_size: int


class QueuePreviewItem(BaseModel):
    candidate_id: int
    ensam_code: str
    first_name: str
    last_name: str
    position: int
    joined_at: datetime


class FiliereQueueDetail(BaseModel):
    code: str
    intitule: str
    waiting: list[QueuePreviewItem]
    total_waiting: int


class AttributionResult(BaseModel):
    operation_id: int
    candidate_id: int
    ensam_code: str
    first_name: str
    last_name: str
    filiere_code: str
    previous_position: int | None
    new_status: str
    regulator: str | None
    room: str | None
    timestamp: datetime


class ManualAttributionRequest(BaseModel):
    candidate_id: int
    reason: str | None = None
    regulator: str | None = None
    room: str | None = None


class FifoRequest(BaseModel):
    filiere_code: str | None = None
    regulator: str | None = None
    room: str | None = None


class NotificationTestRequest(BaseModel):
    candidate_id: int


class ReasonRequest(BaseModel):
    reason: str | None = None


class HistoryItem(BaseModel):
    id: int
    candidate_id: int
    ensam_code: str
    organizer_username: str | None
    operation_type: str
    previous_state: str | None
    new_state: str | None
    previous_filiere: str | None
    new_filiere: str | None
    previous_queue_position: int | None
    new_queue_position: int | None
    undo_of: int | None
    reason: str | None
    created_at: datetime


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    page: int
    page_size: int


class DashboardStats(BaseModel):
    total_candidates: int
    waiting: int
    attributed: int
    cancelled: int


class WaitingByFiliere(BaseModel):
    code: str
    intitule: str
    waiting: int


class NotificationStat(BaseModel):
    total: int
    sent: int
    failed: int
    pending: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    waiting_by_filiere: list[WaitingByFiliere]
    recent_operations: list[HistoryItem]
    notification_stats: NotificationStat


class NotificationOut(BaseModel):
    id: int
    candidate_id: int
    ensam_code: str
    event_type: str
    status: str
    created_at: datetime
    sent_at: datetime | None


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    total: int
    page: int
    page_size: int
