"""Aggregate model imports so Alembic autogenerate and `Base.metadata` see all tables."""

from app.database import Base
from app.models.activity import ActivityLog
from app.models.attribution import AttributionEvent
from app.models.candidate import Candidate, Filiere, QueueEntry
from app.models.company import Company, Recruiter
from app.models.notification import (
    NotificationDelivery,
    NotificationEvent,
    PushSubscription,
)
from app.models.organizer import Organizer, OrganizerSession

__all__ = [
    "ActivityLog",
    "AttributionEvent",
    "Base",
    "Candidate",
    "Company",
    "Filiere",
    "NotificationDelivery",
    "NotificationEvent",
    "Organizer",
    "OrganizerSession",
    "PushSubscription",
    "QueueEntry",
    "Recruiter",
]
