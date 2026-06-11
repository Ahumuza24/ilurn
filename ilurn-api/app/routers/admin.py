import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.auth import require_role
from app.db import get_db
from app.domains.assessment.content import VALID_ASSESSMENT_TYPES, ensure_seed_items, list_items
from app.domains.classification.score_banding import get_score_band
from app.domains.users.age_group import derive_age_group
from app.models import AssessmentItem, AssessmentResult, User
from app.routers.users import _generate_registration_id
from app.schemas.admin import StudentCreateIn
from app.schemas.assessment import AssessmentItemIn, AssessmentItemOut, AssessmentItemPatchIn
from app.time import utc_now

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/students", dependencies=[Depends(require_role("ADMIN"))])
def get_students(db: DbSession = Depends(get_db)) -> dict[str, list[dict[str, object]]]:
    return {"students": _build_student_rows(db)}


@router.post("/students", dependencies=[Depends(require_role("ADMIN"))])
def create_student(payload: StudentCreateIn, db: DbSession = Depends(get_db)) -> dict[str, object]:
    try:
        age_group = derive_age_group(payload.dob)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    user = User(
        name=payload.name.strip(),
        age_group=age_group,
        registration_id=_generate_registration_id(),
        role="LEARNER",
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

    return {
        "id": user.id,
        "name": user.name,
        "age_group": user.age_group,
        "registration_id": user.registration_id,
        "last_assessment_date": None,
        "last_score": None,
        "score_band": "N/A",
    }


@router.get("/students/{user_id}", dependencies=[Depends(require_role("ADMIN"))])
def get_student_detail(user_id: int, db: DbSession = Depends(get_db)) -> dict[str, object]:
    user = db.get(User, user_id)
    if user is None or user.role != "LEARNER":
        raise HTTPException(status_code=404, detail="Learner not found.")

    results = (
        db.query(AssessmentResult)
        .filter(AssessmentResult.user_id == user_id)
        .order_by(AssessmentResult.completed_at.desc())
        .all()
    )
    return {
        "id": user.id,
        "name": user.name,
        "age_group": user.age_group,
        "registration_id": user.registration_id,
        "created_at": user.created_at.isoformat(),
        "results": [
            {
                "id": result.id,
                "assessment_type": result.assessment_type,
                "raw_score": result.raw_score,
                "letter_score": result.letter_score,
                "word_score": result.word_score,
                "score_band": get_score_band(result.raw_score),
                "completed_at": result.completed_at.isoformat(),
            }
            for result in results
        ],
    }


@router.get("/analytics", dependencies=[Depends(require_role("ADMIN"))])
def get_analytics(db: DbSession = Depends(get_db)) -> dict[str, object]:
    total_learners = db.query(func.count(User.id)).filter(User.role == "LEARNER").scalar() or 0
    total_assessments = db.query(func.count(AssessmentResult.id)).scalar() or 0
    assessed_learners = (
        db.query(func.count(func.distinct(AssessmentResult.user_id))).scalar() or 0
    )

    band_counts = {"Emerging": 0, "Developing": 0, "Proficient": 0}
    for (raw_score,) in db.query(AssessmentResult.raw_score).all():
        band_counts[get_score_band(raw_score)] += 1

    by_type_rows = (
        db.query(
            AssessmentResult.assessment_type,
            func.count(AssessmentResult.id),
            func.avg(AssessmentResult.raw_score),
        )
        .group_by(AssessmentResult.assessment_type)
        .all()
    )
    by_assessment_type = [
        {
            "assessment_type": assessment_type,
            "count": count,
            "average_score": round(float(avg_score), 1) if avg_score is not None else 0.0,
        }
        for assessment_type, count, avg_score in by_type_rows
    ]

    age_rows = (
        db.query(User.age_group, func.count(User.id))
        .filter(User.role == "LEARNER")
        .group_by(User.age_group)
        .all()
    )
    age_groups = [{"age_group": age_group, "count": count} for age_group, count in age_rows]

    recent_rows = (
        db.query(User.name, AssessmentResult)
        .join(AssessmentResult, AssessmentResult.user_id == User.id)
        .order_by(AssessmentResult.completed_at.desc())
        .limit(8)
        .all()
    )
    recent = [
        {
            "name": name,
            "assessment_type": result.assessment_type,
            "raw_score": result.raw_score,
            "score_band": get_score_band(result.raw_score),
            "completed_at": result.completed_at.isoformat(),
        }
        for name, result in recent_rows
    ]

    return {
        "total_learners": total_learners,
        "total_assessments": total_assessments,
        "assessed_learners": assessed_learners,
        "score_bands": band_counts,
        "by_assessment_type": by_assessment_type,
        "age_groups": age_groups,
        "recent": recent,
    }


@router.get("/assessment-items", response_model=list[AssessmentItemOut], dependencies=[Depends(require_role("ADMIN"))])
def get_assessment_items(
    assessment_type: str | None = None,
    db: DbSession = Depends(get_db),
) -> list[AssessmentItem]:
    if assessment_type is not None and assessment_type not in VALID_ASSESSMENT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid assessment type.")
    return list_items(db, assessment_type=assessment_type)


@router.post("/assessment-items", response_model=AssessmentItemOut, dependencies=[Depends(require_role("ADMIN"))])
def create_assessment_item(payload: AssessmentItemIn, db: DbSession = Depends(get_db)) -> AssessmentItem:
    _validate_item_payload(payload.assessment_type, payload.item_type, payload.sentence)
    now = utc_now()
    item = AssessmentItem(
        assessment_type=payload.assessment_type,
        item_type=payload.item_type,
        text=payload.text.strip(),
        sentence=payload.sentence.strip() if payload.sentence else None,
        difficulty=payload.difficulty.strip().lower(),
        sort_order=payload.sort_order,
        active=payload.active,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/assessment-items/{item_id}", response_model=AssessmentItemOut, dependencies=[Depends(require_role("ADMIN"))])
def update_assessment_item(
    item_id: int,
    payload: AssessmentItemPatchIn,
    db: DbSession = Depends(get_db),
) -> AssessmentItem:
    ensure_seed_items(db)
    item = db.get(AssessmentItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Assessment item not found.")

    next_item_type = payload.item_type if payload.item_type is not None else item.item_type
    next_sentence = payload.sentence if payload.sentence is not None else item.sentence
    _validate_item_payload(item.assessment_type, next_item_type, next_sentence)

    if payload.item_type is not None:
        item.item_type = payload.item_type
    if payload.text is not None:
        item.text = payload.text.strip()
    if payload.sentence is not None:
        item.sentence = payload.sentence.strip() if payload.sentence.strip() else None
    if payload.difficulty is not None:
        item.difficulty = payload.difficulty.strip().lower()
    if payload.sort_order is not None:
        item.sort_order = payload.sort_order
    if payload.active is not None:
        item.active = payload.active
    item.updated_at = utc_now()
    db.commit()
    db.refresh(item)
    return item


@router.delete("/assessment-items/{item_id}", dependencies=[Depends(require_role("ADMIN"))])
def delete_assessment_item(item_id: int, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    ensure_seed_items(db)
    item = db.get(AssessmentItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Assessment item not found.")
    db.delete(item)
    db.commit()
    return {"success": True}


@router.get("/export", dependencies=[Depends(require_role("ADMIN"))])
def export_students(format: str, db: DbSession = Depends(get_db)) -> Response:
    if format != "csv":
        raise HTTPException(status_code=400, detail="Only csv format is supported.")

    students = _build_student_rows(db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Learner", "Age Group", "Registration ID", "Last Assessment Date", "Score Band"])
    for student in students:
        registration_id = str(student["registration_id"])
        writer.writerow(
            [
                registration_id,
                student["age_group"],
                registration_id,
                student["last_assessment_date"] or "N/A",
                student["score_band"],
            ]
        )

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="ilurn-students.csv"'},
    )


def _build_student_rows(db: DbSession) -> list[dict[str, object]]:
    latest = (
        db.query(AssessmentResult.user_id, func.max(AssessmentResult.completed_at).label("latest_completed_at"))
        .group_by(AssessmentResult.user_id)
        .subquery()
    )
    rows = (
        db.query(User, AssessmentResult)
        .outerjoin(latest, User.id == latest.c.user_id)
        .outerjoin(
            AssessmentResult,
            (AssessmentResult.user_id == User.id)
            & (AssessmentResult.completed_at == latest.c.latest_completed_at),
        )
        .filter(User.role == "LEARNER")
        .order_by(User.created_at.desc())
        .all()
    )

    students = []
    for user, result in rows:
        students.append(
            {
                "id": user.id,
                "name": user.name,
                "age_group": user.age_group,
                "registration_id": user.registration_id,
                "last_assessment_date": result.completed_at.isoformat() if result else None,
                "last_score": result.raw_score if result else None,
                "score_band": get_score_band(result.raw_score) if result else "N/A",
            }
        )
    return students


def _validate_item_payload(assessment_type: str, item_type: str, sentence: str | None) -> None:
    if assessment_type == "word-reading" and item_type not in {"letter", "word"}:
        raise HTTPException(status_code=422, detail="Word reading items must be letters or words.")
    if assessment_type in {"spelling", "spelling-bee"} and item_type != "word":
        raise HTTPException(status_code=422, detail="Spelling items must be words.")
    if assessment_type == "spelling" and not sentence:
        raise HTTPException(status_code=422, detail="Spelling items require a cue sentence.")
