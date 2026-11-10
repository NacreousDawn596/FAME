"""Immutable attribution audit-log model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import AttributionOperation

if TYPE_CHECKING:
    pass


class AttributionEvent(Base):
    __tablename__ = "attribution_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("candidates.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    organizer_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("organizers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    operation_type: Mapped[AttributionOperation] = mapped_column(
        Enum(
            AttributionOperation,
            name="attribution_operation",
            native_enum=False,
            values_callable=lambda e: [x.value for x in e],
        ),
        nullable=False,
    )
    previous_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    previous_filiere: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_filiere: Mapped[str | None] = mapped_column(String(32), nullable=True)
    previous_queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    new_queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    related_event_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("attribution_events.id", ondelete="SET NULL"), nullable=True
    )
    undo_of: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("attribution_events.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(String(512), nullable=True)
    regulator: Mapped[str | None] = mapped_column(String(255), nullable=True)
    room: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
