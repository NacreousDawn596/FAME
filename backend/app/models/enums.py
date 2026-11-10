"""Shared enum types for FAME domain models."""

from __future__ import annotations

import enum


class QueueStatus(enum.StrEnum):
    WAITING = "WAITING"
    ATTRIBUTED = "ATTRIBUTED"
    CANCELLED = "CANCELLED"
    WITHDRAWN = "WITHDRAWN"
    COMPLETED = "COMPLETED"


class AttributionOperation(enum.StrEnum):
    FIFO = "FIFO"
    MANUAL = "MANUAL"
    UNDO = "UNDO"
    RETURN = "RETURN"
    CANCEL = "CANCEL"
    RESTORE = "RESTORE"
    REASSIGN = "REASSIGN"
    COMPLETE = "COMPLETE"


class NotificationEventType(enum.StrEnum):
    POSITION_CHANGED = "POSITION_CHANGED"
    APPROACHING = "APPROACHING"
    URGENT = "URGENT"
    IMMEDIATE = "IMMEDIATE"
    ATTRIBUTED = "ATTRIBUTED"
    RETURNED = "RETURNED"
    REVERSED = "REVERSED"
    CANCELLED = "CANCELLED"


class NotificationStatus(enum.StrEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class DeliveryStatus(enum.StrEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    INVALID = "INVALID"
