#!/usr/bin/env bash
set -e

# Przejdź do katalogu projektu niezależnie od miejsca wywołania skryptu
cd "$(dirname "$0")"

echo "=========================================================="
echo "          DYSKURS — Uruchamianie środowiska lokalnego     "
echo "=========================================================="

# 1. Sprawdź środowisko wirtualne Pythona
if [ ! -d "backend/venv" ]; then
    echo "Tworzenie venv dla backendu..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install --upgrade pip
    backend/venv/bin/pip install -r backend/requirements.txt
fi

# 2. Sprawdź node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "Instalacja pakietów npm dla frontendu..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "Uruchamianie serwerów deweloperskich..."
echo "Backend API:  http://localhost:8000 (Swagger: http://localhost:8000/docs)"
echo "Frontend Web: http://localhost:3000"
echo ""

# Uruchom Backend i Frontend równolegle
trap 'kill %1; kill %2' SIGINT

PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --reload --port 8000 &
(cd frontend && npm run dev) &

wait
