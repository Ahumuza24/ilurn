import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.auth import get_current_user
from app.db import get_db
from app.domains.classification.score_banding import get_score_band
from app.domains.users.age_group import derive_age_group
from app.domains.users.privacy import hash_parent_email
from app.models import AssessmentResult, User
from app.schemas.user import ProgressOut, UserRegisterIn, UserRegisterOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserRegisterOut)
def register_user(payload: UserRegisterIn, db: DbSession = Depends(get_db)) -> UserRegisterOut:
    try:
        age_group = derive_age_group(payload.dob)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    user = User(
        name=payload.name,
        age_group=age_group,
        registration_id=_generate_registration_id(),
        parent_email_hash=hash_parent_email(payload.parent_email),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        user.registration_id = _generate_registration_id()
        db.add(user)
        db.commit()
        db.refresh(user)

    return UserRegisterOut(user_id=user.id, registration_id=user.registration_id, age_group=user.age_group)


@router.get("/{user_id}/progress", response_model=ProgressOut)
def get_user_progress(
    user_id: int,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressOut:
    if current_user.role != "ADMIN" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    results = (
        db.query(AssessmentResult)
        .filter(AssessmentResult.user_id == user_id)
        .order_by(AssessmentResult.completed_at.desc())
        .all()
    )
    progress = [
        {
            "assessment_type": result.assessment_type,
            "completed_at": result.completed_at.isoformat(),
            "score_band": get_score_band(result.raw_score),
        }
        for result in results
    ]
    return ProgressOut(progress=progress)


def _generate_registration_id() -> str:
    return f"ID-{secrets.token_urlsafe(5).replace('-', '').replace('_', '').upper()[:7]}"
