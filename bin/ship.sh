#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[ship] pwd=$PWD"

# sanity
test -f docker-compose.yml || { echo "[ship] ERROR: docker-compose.yml missing"; exit 1; }

echo "[ship] compose config..."
docker compose config >/dev/null
echo "[ship] compose OK"

echo "[ship] up --build..."
docker compose up -d --build

echo "[ship] wait..."
sleep 4

echo "[ship] ps"
docker compose ps

BASE="http://localhost:8880"

echo "[ship] smoke: /api/health"
curl -sS --max-time 8 "$BASE/api/health" ; echo

echo "[ship] smoke: /api/contracts"
curl -sS --max-time 8 "$BASE/api/contracts" ; echo

echo "[ship] smoke: /api/providers/usage"
curl -sS --max-time 8 "$BASE/api/providers/usage" ; echo

echo "[ship] UI: $BASE/"
echo "[ship] OK"
