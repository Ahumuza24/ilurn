from datetime import date


def derive_age_group(dob: date, today: date | None = None) -> str:
    reference_date = today or date.today()
    age = reference_date.year - dob.year - ((reference_date.month, reference_date.day) < (dob.month, dob.day))

    if age < 1 or age > 18:
        raise ValueError("Learner age must be between 1 and 18 years.")
    if age <= 4:
        return "TODDLER"
    if age <= 6:
        return "PRE_PRIMARY"
    if age <= 12:
        return "PUPIL"
    return "STUDENT"
