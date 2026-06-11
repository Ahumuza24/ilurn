from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


AssessmentType = Literal["word-reading", "spelling", "spelling-bee"]
AssessmentItemType = Literal["letter", "word"]


class QuestionResponseIn(BaseModel):
    question_id: str = Field(min_length=1, max_length=64)
    response: str = Field(max_length=255)
    is_correct: bool
    response_time_ms: int = Field(ge=0, le=300_000)


class AssessmentSubmitIn(BaseModel):
    user_id: int = Field(gt=0)
    session_id: int = Field(gt=0)
    responses: list[QuestionResponseIn] = Field(min_length=1)


class ScoreOut(BaseModel):
    raw_score: int
    letter_score: int
    word_score: int
    apply_5_rule: bool
    apply_10_rule: bool


class SpellingScoreOut(ScoreOut):
    discontinued: bool


class SpellingBeeSubmitIn(BaseModel):
    user_id: int = Field(gt=0)
    session_id: int = Field(gt=0)
    score: int = Field(ge=0, le=100)


class AssessmentItemIn(BaseModel):
    assessment_type: AssessmentType
    item_type: AssessmentItemType = "word"
    text: str = Field(min_length=1, max_length=255)
    sentence: str | None = Field(default=None, max_length=500)
    difficulty: str = Field(default="easy", min_length=1, max_length=32)
    sort_order: int = Field(ge=0, le=10_000)
    active: bool = True


class AssessmentItemPatchIn(BaseModel):
    item_type: AssessmentItemType | None = None
    text: str | None = Field(default=None, min_length=1, max_length=255)
    sentence: str | None = Field(default=None, max_length=500)
    difficulty: str | None = Field(default=None, min_length=1, max_length=32)
    sort_order: int | None = Field(default=None, ge=0, le=10_000)
    active: bool | None = None


class AssessmentItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_type: str
    item_type: str
    text: str
    sentence: str | None
    difficulty: str
    sort_order: int
    active: bool
