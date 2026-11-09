"""Shared enum types for FAME domain models."""

from __future__ import annotations

import enum


class QueueStatus(str, enum.Enum):
    WAITING = "WAITING"
    ATTRIBUTED = "ATTRIBUTED"
    CANCELLED = "CANCELLED"
    WITHDRAWN = "WITHDRAWN"


class AttributionOperation(str, enum.Enum):
    FIFO = "FIFO"
    MANUAL = "MANUAL"
    UNDO = "UNDO"
    RETURN = "RETURN"
    CANCEL = "CANCEL"
    RESTORE = "RESTORE"
    REASSIGN = "REASSIGN"


class NotificationEventType(str, enum.Enum):
    POSITION_CHANGED = "POSITION_CHANGED"
    APPROACHING = "APPROACHING"
    URGENT = "URGENT"
    IMMEDIATE = "IMMEDIATE"
    ATTRIBUTED = "ATTRIBUTED"
    RETURNED = "RETURNED"
    REVERSED = "REVERSED"
    CANCELLED = "CANCELLED"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class DeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    INVALID = "INVALID"
