from datetime import date

from pydantic import BaseModel, Field


class StudentCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dob: date
