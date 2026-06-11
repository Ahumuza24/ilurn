#!/usr/bin/env bash
set -euo pipefail

echo "Installing frontend dependencies..."
npm --prefix ilurn-client ci --include=dev

echo "Building frontend..."
npm --prefix ilurn-client run build

echo "Installing API dependencies..."
python -m pip install --upgrade pip
python -m pip install -r ilurn-api/requirements.txt
