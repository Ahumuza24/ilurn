"""assessment_items_cms

Revision ID: 0003_assessment_items_cms
Revises: 0002_role_based_auth
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_assessment_items_cms"
down_revision: Union[str, None] = "0002_role_based_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assessment_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assessment_type", sa.String(length=64), nullable=False),
        sa.Column("item_type", sa.String(length=32), nullable=False),
        sa.Column("text", sa.String(length=255), nullable=False),
        sa.Column("sentence", sa.String(length=500), nullable=True),
        sa.Column("difficulty", sa.String(length=32), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessment_items_active"), "assessment_items", ["active"], unique=False)
    op.create_index(op.f("ix_assessment_items_assessment_type"), "assessment_items", ["assessment_type"], unique=False)
    op.create_index(op.f("ix_assessment_items_id"), "assessment_items", ["id"], unique=False)
    op.create_index(op.f("ix_assessment_items_sort_order"), "assessment_items", ["sort_order"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_assessment_items_sort_order"), table_name="assessment_items")
    op.drop_index(op.f("ix_assessment_items_id"), table_name="assessment_items")
    op.drop_index(op.f("ix_assessment_items_assessment_type"), table_name="assessment_items")
    op.drop_index(op.f("ix_assessment_items_active"), table_name="assessment_items")
    op.drop_table("assessment_items")
