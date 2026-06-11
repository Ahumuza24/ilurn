from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from app.auth import get_current_user
from app.db import get_db
from app.domains.assessment.content import (
    get_spelling_bee_questions_from_db,
    get_spelling_questions_from_db,
    get_word_reading_questions_from_db,
)
from app.domains.assessment.scoring import (
    ResponseForScoring,
    compute_spelling_score,
    compute_word_reading_score,
)
from app.models import AssessmentResult, QuestionResponse, Session as AssessmentSession, User
from app.schemas.assessment import AssessmentSubmitIn, ScoreOut, SpellingBeeSubmitIn, SpellingScoreOut

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("/word-reading/questions")
def word_reading_questions(age_group: str = Query(...), db: DbSession = Depends(get_db)) -> dict[str, list[dict[str, str]]]:
    _validate_age_group(age_group)
    return {"questions": get_word_reading_questions_from_db(db)}


@router.post("/word-reading/submit", response_model=ScoreOut)
def submit_word_reading(
    payload: AssessmentSubmitIn,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScoreOut:
    _validate_assessment_owner(payload.user_id, payload.session_id, db, current_user)
    score = compute_word_reading_score(_to_domain_responses(payload))
    _persist_result(payload, "word-reading", score, db)
    return ScoreOut(**score.__dict__)


@router.get("/spelling/questions")
def spelling_questions(age_group: str = Query("PUPIL"), db: DbSession = Depends(get_db)) -> dict[str, list[dict[str, str]]]:
    _validate_age_group(age_group)
    return {"questions": get_spelling_questions_from_db(db)}


@router.get("/spelling-bee/questions")
def spelling_bee_questions(db: DbSession = Depends(get_db)) -> dict[str, list[dict[str, str]]]:
    return {"questions": get_spelling_bee_questions_from_db(db)}


@router.post("/spelling/submit", response_model=SpellingScoreOut)
def submit_spelling(
    payload: AssessmentSubmitIn,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SpellingScoreOut:
    _validate_assessment_owner(payload.user_id, payload.session_id, db, current_user)
    score = compute_spelling_score(_to_domain_responses(payload))
    _persist_result(payload, "spelling", score, db)
    return SpellingScoreOut(**score.__dict__, discontinued=score.apply_10_rule)


@router.post("/spelling-bee/submit")
def submit_spelling_bee(
    payload: SpellingBeeSubmitIn,
    db: DbSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    _validate_assessment_owner(payload.user_id, payload.session_id, db, current_user)
    scaled_score = min(payload.score * 5, 100)
    result = AssessmentResult(
        user_id=payload.user_id,
        session_id=payload.session_id,
        assessment_type="spelling-bee",
        raw_score=scaled_score,
        letter_score=0,
        word_score=payload.score,
    )
    db.add(result)
    db.commit()
    return {"success": True}


def _persist_result(payload: AssessmentSubmitIn, assessment_type: str, score, db: DbSession) -> None:
    result = AssessmentResult(
        user_id=payload.user_id,
        session_id=payload.session_id,
        assessment_type=assessment_type,
        raw_score=score.raw_score,
        letter_score=score.letter_score,
        word_score=score.word_score,
    )
    db.add(result)
    db.flush()

    for response in payload.responses:
        db.add(
            QuestionResponse(
                result_id=result.id,
                question_id=response.question_id,
                response=response.response,
                is_correct=response.is_correct,
                response_time_ms=response.response_time_ms,
            )
        )
    db.commit()


def _to_domain_responses(payload: AssessmentSubmitIn) -> list[ResponseForScoring]:
    return [
        ResponseForScoring(
            question_id=response.question_id,
            response=response.response,
            is_correct=response.is_correct,
            response_time_ms=response.response_time_ms,
        )
        for response in payload.responses
    ]


def _validate_assessment_owner(user_id: int, session_id: int, db: DbSession, current_user: User) -> None:
    user = db.get(User, user_id)
    session = db.get(AssessmentSession, session_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != user_id:
        raise HTTPException(status_code=400, detail="Session does not belong to user.")
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions.")


def _validate_age_group(age_group: str) -> None:
    if age_group not in {"TODDLER", "PRE_PRIMARY", "PUPIL", "STUDENT"}:
        raise HTTPException(status_code=422, detail="Invalid age group.")
