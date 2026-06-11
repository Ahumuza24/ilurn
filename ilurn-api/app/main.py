from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import admin, assessments, auth, sessions, tts, users


def create_app() -> FastAPI:
    app = FastAPI(title="iLurn API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(sessions.router)
    app.include_router(assessments.router)
    app.include_router(admin.router)
    app.include_router(tts.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    dist_path = Path(__file__).resolve().parents[2] / "ilurn-client" / "dist"
    if dist_path.exists():
        app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")

    return app


app = create_app()
