import hashlib
import secrets
from datetime import timedelta

from sqlalchemy.orm import Session as DbSession

from app.models import AuthSession
from app.time import utc_now


SESSION_COOKIE_NAME = "ilurn_session"
SESSION_DAYS = 7


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_auth_session(db: DbSession, user_id: int) -> tuple[str, AuthSession]:
    token = generate_session_token()
    session = AuthSession(
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=utc_now() + timedelta(days=SESSION_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session
