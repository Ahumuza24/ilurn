import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session as DbSession

from app.auth import get_current_user
from app.db import get_db
from app.domains.auth.passwords import hash_password, verify_password
from app.domains.auth.tokens import SESSION_COOKIE_NAME, SESSION_DAYS, create_auth_session, hash_token
from app.domains.users.age_group import derive_age_group
from app.domains.users.privacy import hash_parent_email
from app.models import AuthSession, User
from app.schemas.auth import AuthLoginIn, AuthOut, AuthSignupIn, AuthUserOut
from app.time import utc_now
from app.routers.users import _generate_registration_id

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthOut)
def signup(payload: AuthSignupIn, response: Response, db: DbSession = Depends(get_db)) -> AuthOut:
    age_group = "ADMIN"
    registration_id = f"ADM-{_generate_registration_id().replace('ID-', '')}"
    parent_email_hash = None

    if payload.role == "LEARNER":
        if payload.dob is None:
            raise HTTPException(status_code=422, detail="Date of birth is required for learners.")
        try:
            age_group = derive_age_group(payload.dob)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        registration_id = _generate_registration_id()
        parent_email_hash = hash_parent_email(payload.parent_email)
    elif payload.role == "ADMIN":
        expected_code = os.getenv("ILURN_ADMIN_SIGNUP_CODE")
        if not expected_code or payload.admin_code != expected_code:
            raise HTTPException(status_code=403, detail="Invalid admin signup code.")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        age_group=age_group,
        registration_id=registration_id,
        parent_email_hash=parent_email_hash,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc

    token, _ = create_auth_session(db, user.id)
    _set_session_cookie(response, token)
    return _auth_response(user)


@router.post("/login", response_model=AuthOut)
def login(payload: AuthLoginIn, response: Response, db: DbSession = Depends(get_db)) -> AuthOut:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive.")

    token, _ = create_auth_session(db, user.id)
    _set_session_cookie(response, token)
    return _auth_response(user)


@router.get("/me", response_model=AuthOut)
def me(current_user: User = Depends(get_current_user)) -> AuthOut:
    return _auth_response(current_user)


@router.post("/logout")
def logout(request: Request, response: Response, db: DbSession = Depends(get_db)) -> dict[str, bool]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        auth_session = db.query(AuthSession).filter(AuthSession.token_hash == hash_token(token)).first()
        if auth_session is not None and auth_session.revoked_at is None:
            auth_session.revoked_at = utc_now()
            db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"success": True}


def _auth_response(user: User) -> AuthOut:
    return AuthOut(user=_serialize_user(user), redirect_to=_redirect_for_role(user.role))


def _serialize_user(user: User) -> AuthUserOut:
    return AuthUserOut(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        registration_id=user.registration_id if user.role == "LEARNER" else None,
        age_group=user.age_group if user.role == "LEARNER" else None,
    )


def _redirect_for_role(role: str) -> str:
    if role == "ADMIN":
        return "/dashboard/admin"
    return "/dashboard/learner"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        httponly=True,
        secure=os.getenv("ILURN_COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        max_age=SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )
