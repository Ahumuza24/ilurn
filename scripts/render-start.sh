#!/usr/bin/env bash
set -euo pipefail

echo "Running database migrations..."
cd ilurn-api
python -m alembic upgrade head
cd ..

echo "Starting iLurn..."
exec python -m uvicorn app.main:app --app-dir ilurn-api --host 0.0.0.0 --port "${PORT:-8000}"
