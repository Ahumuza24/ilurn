from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


UserRole = Literal["LEARNER", "ADMIN"]


class AuthSignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = "LEARNER"
    dob: date | None = None
    parent_email: str | None = Field(default=None, max_length=254)
    admin_code: str | None = Field(default=None, max_length=128)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Name is required.")
        return trimmed

    @field_validator("email", "parent_email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        trimmed = value.strip().lower()
        if "@" not in trimmed or "." not in trimmed.rsplit("@", 1)[-1]:
            raise ValueError("Email must be a valid email address.")
        return trimmed


class AuthLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthUserOut(BaseModel):
    user_id: int
    name: str
    email: str | None
    role: str
    registration_id: str | None
    age_group: str | None


class AuthOut(BaseModel):
    user: AuthUserOut
    redirect_to: str
