from datetime import date

import pytest

from app.domains.assessment.scoring import ResponseForScoring, compute_word_reading_score
from app.domains.classification.score_banding import get_score_band
from app.domains.users.age_group import derive_age_group


def response(question_id: str, is_correct: bool) -> ResponseForScoring:
    return ResponseForScoring(
        question_id=question_id,
        response="ok" if is_correct else "",
        is_correct=is_correct,
        response_time_ms=1000,
    )


def test_word_reading_counts_letter_and_word_scores() -> None:
    score = compute_word_reading_score(
        [
            response("letter_0", True),
            response("letter_1", False),
            response("word_0", True),
            response("word_1", True),
        ]
    )

    assert score.raw_score == 3
    assert score.letter_score == 1
    assert score.word_score == 2
    assert score.apply_10_rule is False


def test_word_reading_applies_10_rule_after_consecutive_wrong() -> None:
    score = compute_word_reading_score([response(f"word_{index}", False) for index in range(12)])

    assert score.raw_score == 0
    assert score.apply_10_rule is True


def test_word_reading_applies_5_rule_when_first_five_words_include_error() -> None:
    score = compute_word_reading_score(
        [
            response("word_0", True),
            response("word_1", True),
            response("word_2", False),
            response("word_3", True),
            response("word_4", True),
        ]
    )

    assert score.apply_5_rule is True


@pytest.mark.parametrize(
    ("raw_score", "band"),
    [(19, "Emerging"), (20, "Developing"), (39, "Developing"), (40, "Proficient")],
)
def test_score_band_boundaries(raw_score: int, band: str) -> None:
    assert get_score_band(raw_score) == band


@pytest.mark.parametrize(
    ("dob", "expected"),
    [
        (date(2022, 6, 10), "TODDLER"),
        (date(2020, 6, 10), "PRE_PRIMARY"),
        (date(2016, 6, 10), "PUPIL"),
        (date(2010, 6, 10), "STUDENT"),
    ],
)
def test_age_group_from_dob(dob: date, expected: str) -> None:
    assert derive_age_group(dob, today=date(2026, 6, 10)) == expected
