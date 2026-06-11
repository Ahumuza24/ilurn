from datetime import date

from pydantic import BaseModel, Field, field_validator


class UserRegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dob: date
    parent_email: str | None = Field(default=None, max_length=254)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Name is required.")
        return trimmed

    @field_validator("parent_email")
    @classmethod
    def validate_parent_email(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        trimmed = value.strip()
        if "@" not in trimmed or "." not in trimmed.rsplit("@", 1)[-1]:
            raise ValueError("Parent email must be a valid email address.")
        return trimmed


class UserRegisterOut(BaseModel):
    user_id: int
    registration_id: str
    age_group: str


class ProgressItemOut(BaseModel):
    assessment_type: str
    completed_at: str
    score_band: str


class ProgressOut(BaseModel):
    progress: list[ProgressItemOut]
