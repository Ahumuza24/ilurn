from sqlalchemy.orm import Session as DbSession

from app.domains.assessment.questions import SPELLING_WORDS, WRAT_LETTERS, WRAT_WORDS, _word_difficulty
from app.models import AssessmentItem
from app.time import utc_now


SPELLING_BEE_WORDS = ["apple", "tree", "dog", "run", "happy", "yellow", "friend", "school", "music", "teacher"]
VALID_ASSESSMENT_TYPES = {"word-reading", "spelling", "spelling-bee"}


def ensure_seed_items(db: DbSession) -> None:
    if db.query(AssessmentItem).first() is not None:
        return

    now = utc_now()
    items: list[AssessmentItem] = []
    items.extend(
        AssessmentItem(
            assessment_type="word-reading",
            item_type="letter",
            text=letter,
            sentence=None,
            difficulty="letter",
            sort_order=index,
            active=True,
            created_at=now,
            updated_at=now,
        )
        for index, letter in enumerate(WRAT_LETTERS)
    )
    items.extend(
        AssessmentItem(
            assessment_type="word-reading",
            item_type="word",
            text=word,
            sentence=None,
            difficulty=_word_difficulty(index),
            sort_order=1000 + index,
            active=True,
            created_at=now,
            updated_at=now,
        )
        for index, word in enumerate(WRAT_WORDS)
    )
    items.extend(
        AssessmentItem(
            assessment_type="spelling",
            item_type="word",
            text=item["word"],
            sentence=item["sentence"],
            difficulty=_word_difficulty(index),
            sort_order=index,
            active=True,
            created_at=now,
            updated_at=now,
        )
        for index, item in enumerate(SPELLING_WORDS)
    )
    items.extend(
        AssessmentItem(
            assessment_type="spelling-bee",
            item_type="word",
            text=word,
            sentence=None,
            difficulty=_word_difficulty(index),
            sort_order=index,
            active=True,
            created_at=now,
            updated_at=now,
        )
        for index, word in enumerate(SPELLING_BEE_WORDS)
    )
    db.add_all(items)
    db.commit()


def list_items(db: DbSession, assessment_type: str | None = None, active_only: bool = False) -> list[AssessmentItem]:
    ensure_seed_items(db)
    query = db.query(AssessmentItem)
    if assessment_type is not None:
        query = query.filter(AssessmentItem.assessment_type == assessment_type)
    if active_only:
        query = query.filter(AssessmentItem.active.is_(True))
    return query.order_by(AssessmentItem.assessment_type.asc(), AssessmentItem.sort_order.asc(), AssessmentItem.id.asc()).all()


def get_word_reading_questions_from_db(db: DbSession) -> list[dict[str, str]]:
    items = list_items(db, "word-reading", active_only=True)
    letters = [item for item in items if item.item_type == "letter"]
    words = [item for item in items if item.item_type == "word"]
    return [
        {"id": f"letter_{index}", "type": "letter", "text": item.text, "difficulty": item.difficulty}
        for index, item in enumerate(letters)
    ] + [
        {"id": f"word_{index}", "type": "word", "text": item.text, "difficulty": item.difficulty}
        for index, item in enumerate(words)
    ]


def get_spelling_questions_from_db(db: DbSession) -> list[dict[str, str]]:
    items = list_items(db, "spelling", active_only=True)
    return [
        {
            "id": f"spell_{index}",
            "type": "word",
            "text": item.text,
            "sentence": item.sentence or f"Spell the word {item.text}.",
            "difficulty": item.difficulty,
        }
        for index, item in enumerate(items)
    ]


def get_spelling_bee_questions_from_db(db: DbSession) -> list[dict[str, str]]:
    items = list_items(db, "spelling-bee", active_only=True)
    return [
        {
            "id": f"bee_{index}",
            "type": "word",
            "text": item.text,
            "sentence": item.sentence or "",
            "difficulty": item.difficulty,
        }
        for index, item in enumerate(items)
    ]
