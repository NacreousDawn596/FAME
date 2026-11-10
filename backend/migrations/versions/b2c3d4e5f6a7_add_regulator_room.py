"""add regulator and room to queue_entries and attribution_events

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-10

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("queue_entries", sa.Column("regulator", sa.String(length=255), nullable=True))
    op.add_column("queue_entries", sa.Column("room", sa.String(length=255), nullable=True))
    op.add_column("attribution_events", sa.Column("regulator", sa.String(length=255), nullable=True))
    op.add_column("attribution_events", sa.Column("room", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("attribution_events", "room")
    op.drop_column("attribution_events", "regulator")
    op.drop_column("queue_entries", "room")
    op.drop_column("queue_entries", "regulator")
