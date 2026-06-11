# iLurn

Phase 1 iLurn implementation aligned to the PRD stack:

- `ilurn-client/`: React + Vite frontend
- `ilurn-api/`: FastAPI + SQLAlchemy + Alembic backend
- SQLite local database

## Setup

```bash
npm --prefix ilurn-client install
python -m venv .venv
. .venv/bin/activate
pip install -r ilurn-api/requirements.txt
```

## Development

Run the API:

```bash
npm run dev:api
```

Run the frontend in another terminal:

```bash
npm run dev
```

The Vite dev server proxies `/users`, `/sessions`, `/assessments`, `/admin`, and `/health` to FastAPI on port `8000`.
It also proxies `/auth` for signup, login, logout, and session checks.

Admin account signup requires an environment variable:

```bash
export ILURN_ADMIN_SIGNUP_CODE="choose-a-local-admin-code"
```

Use that code when creating an admin account from the signup screen. Learner accounts do not need an admin code.

After login, admins can manage learner records and the Phase 1 test item bank from `/dashboard/admin`. The Test CMS section edits Word Reading, Spelling Test, and Spelling Bee prompts.

## Database

```bash
cd ilurn-api
alembic upgrade head
```

Alembic is the schema path; run migrations before starting the API against a new local database.
The CMS migration creates `assessment_items`; the API seeds the editable item bank from the Phase 1 defaults the first time content is requested.

## Verification

```bash
cd ilurn-api && pytest -v
cd ..
npm run lint
npm run build
npm test
```

## Deploy to Render

This repo includes a native Render blueprint in `render.yaml`. It does not use Docker.

Recommended MVP setup:

1. Push this repository to GitHub.
2. In Render, choose **New +** → **Blueprint**.
3. Select this repo and let Render read `render.yaml`.
4. When prompted, set `ILURN_ADMIN_SIGNUP_CODE` to a private code you will use when creating the first admin account.
5. Deploy.

The blueprint creates:

- A free Python web service named `ilurn`
- A free Render Postgres database named `ilurn-db`
- A build step that installs frontend dependencies, builds Vite, then installs FastAPI dependencies
- A start step that runs Alembic migrations and launches Uvicorn

Render free-tier notes:

- Do not use SQLite for deployed free-tier data. Free web services have an ephemeral filesystem, so a local SQLite file can disappear after redeploys, restarts, or spin-downs.
- Free Render Postgres is better for an MVP, but it expires after 30 days and has no backups. Export or upgrade before the expiry date if you need to keep real data.
- Free web services spin down after idle time, so the first request after inactivity can be slow.

Manual Render setup, if you do not use the blueprint:

- Runtime: `Python`
- Build command: `./scripts/render-build.sh`
- Start command: `./scripts/render-start.sh`
- Health check path: `/health`
- Environment variables:
  - `ILURN_DATABASE_URL`: your Render Postgres internal connection string
  - `ILURN_ADMIN_SIGNUP_CODE`: your private admin signup code
  - `ILURN_EMAIL_HASH_SALT`: a long random secret
  - `ILURN_COOKIE_SECURE`: `true`
