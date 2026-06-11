"""phase1_schema

Revision ID: 0001_phase1_schema
Revises:
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_phase1_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("age_group", sa.String(length=32), nullable=False),
        sa.Column("registration_id", sa.String(length=32), nullable=False),
        sa.Column("parent_email_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("registration_id"),
    )
    op.create_index(op.f("ix_users_age_group"), "users", ["age_group"], unique=False)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_registration_id"), "users", ["registration_id"], unique=True)

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("assessment_type", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sessions_id"), "sessions", ["id"], unique=False)
    op.create_index(op.f("ix_sessions_user_id"), "sessions", ["user_id"], unique=False)

    op.create_table(
        "assessment_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("assessment_type", sa.String(length=64), nullable=False),
        sa.Column("raw_score", sa.Integer(), nullable=False),
        sa.Column("letter_score", sa.Integer(), nullable=False),
        sa.Column("word_score", sa.Integer(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessment_results_id"), "assessment_results", ["id"], unique=False)
    op.create_index(op.f("ix_assessment_results_session_id"), "assessment_results", ["session_id"], unique=False)
    op.create_index(op.f("ix_assessment_results_user_id"), "assessment_results", ["user_id"], unique=False)

    op.create_table(
        "question_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("result_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.String(length=64), nullable=False),
        sa.Column("response", sa.String(length=255), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("response_time_ms", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["result_id"], ["assessment_results.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_question_responses_id"), "question_responses", ["id"], unique=False)
    op.create_index(op.f("ix_question_responses_result_id"), "question_responses", ["result_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_question_responses_result_id"), table_name="question_responses")
    op.drop_index(op.f("ix_question_responses_id"), table_name="question_responses")
    op.drop_table("question_responses")
    op.drop_index(op.f("ix_assessment_results_user_id"), table_name="assessment_results")
    op.drop_index(op.f("ix_assessment_results_session_id"), table_name="assessment_results")
    op.drop_index(op.f("ix_assessment_results_id"), table_name="assessment_results")
    op.drop_table("assessment_results")
    op.drop_index(op.f("ix_sessions_user_id"), table_name="sessions")
    op.drop_index(op.f("ix_sessions_id"), table_name="sessions")
    op.drop_table("sessions")
    op.drop_index(op.f("ix_users_registration_id"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_age_group"), table_name="users")
    op.drop_table("users")
