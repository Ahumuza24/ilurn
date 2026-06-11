from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app.auth import get_current_user
from app.db import get_db
from app.models import Session as AssessmentSession
from app.models import User
from app.schemas.session import SessionEndOut, SessionStartIn, SessionStartOut
from app.time import utc_now

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/start", response_model=SessionStartOut)
def start_session(
    payload: SessionStartIn,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionStartOut:
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.role != "LEARNER":
        raise HTTPException(status_code=400, detail="Sessions can only be started for learners.")
    if current_user.role != "ADMIN" and current_user.id != payload.user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    session = AssessmentSession(user_id=payload.user_id, assessment_type=payload.assessment_type)
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionStartOut(session_id=session.id, started_at=session.started_at)


@router.patch("/{session_id}/end", response_model=SessionEndOut)
def end_session(
    session_id: int,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionEndOut:
    session = db.get(AssessmentSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if current_user.role != "ADMIN" and current_user.id != session.user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    session.ended_at = utc_now()
    db.commit()
    db.refresh(session)

    duration_ms = int((session.ended_at - session.started_at).total_seconds() * 1000)
    return SessionEndOut(session_id=session.id, ended_at=session.ended_at, duration_ms=duration_ms)
