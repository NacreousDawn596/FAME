"""add candidate email and phone

Revision ID: a1b2c3d4e5f6
Revises: 2dc8537c799a
Create Date: 2026-11-09

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "2dc8537c799a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidates", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("candidates", sa.Column("phone", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "phone")
    op.drop_column("candidates", "email")
