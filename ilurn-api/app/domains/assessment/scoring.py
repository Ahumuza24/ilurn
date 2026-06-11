from dataclasses import dataclass


@dataclass(frozen=True)
class ResponseForScoring:
    question_id: str
    response: str
    is_correct: bool
    response_time_ms: int


@dataclass(frozen=True)
class ScoreResult:
    raw_score: int
    letter_score: int
    word_score: int
    apply_5_rule: bool
    apply_10_rule: bool


def compute_word_reading_score(responses: list[ResponseForScoring]) -> ScoreResult:
    letter_score = 0
    word_score = 0
    raw_score = 0
    consecutive_wrong = 0
    apply_10_rule = False

    for response in responses:
        if response.is_correct:
            consecutive_wrong = 0
            raw_score += 1
            if response.question_id.startswith("letter_"):
                letter_score += 1
            else:
                word_score += 1
        else:
            consecutive_wrong += 1

        if consecutive_wrong >= 10:
            apply_10_rule = True
            break

    first_five_words = [item for item in responses if item.question_id.startswith("word_")][:5]
    apply_5_rule = len(first_five_words) == 5 and any(not item.is_correct for item in first_five_words)

    return ScoreResult(
        raw_score=raw_score,
        letter_score=letter_score,
        word_score=word_score,
        apply_5_rule=apply_5_rule,
        apply_10_rule=apply_10_rule,
    )


def compute_spelling_score(responses: list[ResponseForScoring]) -> ScoreResult:
    normalized = [
        ResponseForScoring(
            question_id=response.question_id.replace("spell_", "word_", 1),
            response=response.response,
            is_correct=response.is_correct,
            response_time_ms=response.response_time_ms,
        )
        for response in responses
    ]
    return compute_word_reading_score(normalized)
