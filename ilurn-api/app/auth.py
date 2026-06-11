from collections.abc import Callable

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DbSession

from app.db import get_db
from app.domains.auth.tokens import SESSION_COOKIE_NAME, hash_token
from app.models import AuthSession, User
from app.time import utc_now


def get_current_user(request: Request, db: DbSession = Depends(get_db)) -> User:
    token = _get_request_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")

    auth_session = (
        db.query(AuthSession)
        .filter(
            AuthSession.token_hash == hash_token(token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > utc_now(),
        )
        .first()
    )
    if auth_session is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    user = db.get(User, auth_session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return user


def require_role(*roles: str) -> Callable[[User], User]:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
        return current_user

    return dependency


def _get_request_token(request: Request) -> str | None:
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token

    authorization = request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()

    return None
