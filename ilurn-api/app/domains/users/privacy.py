import hashlib
import os


def hash_parent_email(parent_email: str | None) -> str | None:
    if not parent_email:
        return None

    salt = os.getenv("ILURN_EMAIL_HASH_SALT", "ilurn-local-dev")
    normalized = parent_email.strip().lower()
    return hashlib.sha256(f"{salt}:{normalized}".encode("utf-8")).hexdigest()
