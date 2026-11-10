"""Candidate, filière, and queue-entry models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import QueueStatus

if TYPE_CHECKING:
    from app.models.notification import PushSubscription


class Filiere(Base):
    __tablename__ = "filieres"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    intitule: Mapped[str] = mapped_column(String(255), nullable=False)
    departement: Mapped[str] = mapped_column(String(128), nullable=False)
    accreditation: Mapped[str] = mapped_column(String(16), nullable=False)

    queue_entries: Mapped[list[QueueEntry]] = relationship(back_populates="filiere")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ensam_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    year: Mapped[str | None] = mapped_column(String(16), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    filiere_code: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("filieres.code", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    queue_entries: Mapped[list[QueueEntry]] = relationship(back_populates="candidate")
    push_subscriptions: Mapped[list[PushSubscription]] = relationship(
        back_populates="candidate"
    )


class QueueEntry(Base):
    __tablename__ = "queue_entries"
    __table_args__ = (
        # A candidate may only have one *active* (non-cancelled) entry per filière.
        # Enforced at the application layer + via the unique partial index below in Alembic.
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    candidate_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    filiere_code: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("filieres.code", ondelete="CASCADE"), nullable=True, index=True
    )
    status: Mapped[QueueStatus] = mapped_column(
        Enum(QueueStatus, name="queue_status", native_enum=False, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
        default=QueueStatus.WAITING,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    attributed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Assigned regulator / room (set when the candidate is attributed).
    regulator: Mapped[str | None] = mapped_column(String(255), nullable=True)
    room: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Optimistic-locking version; incremented on every state transition.
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    candidate: Mapped[Candidate] = relationship(back_populates="queue_entries")
    filiere: Mapped[Filiere] = relationship(back_populates="queue_entries")
