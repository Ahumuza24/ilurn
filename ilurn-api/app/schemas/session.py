from datetime import datetime

from pydantic import BaseModel, Field


class SessionStartIn(BaseModel):
    user_id: int = Field(gt=0)
    assessment_type: str = Field(min_length=1, max_length=64)


class SessionStartOut(BaseModel):
    session_id: int
    started_at: datetime


class SessionEndOut(BaseModel):
    session_id: int
    ended_at: datetime
    duration_ms: int
