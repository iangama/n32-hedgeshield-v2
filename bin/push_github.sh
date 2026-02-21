#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-n32-hedgeshield-v2}"
VIS="${2:-public}" # public|private
USER="iangama"

cd "$(dirname "$0")/.."

test -f docker-compose.yml || { echo "[push] ERROR: docker-compose.yml missing"; exit 1; }

# gh + auth
command -v gh >/dev/null 2>&1 || { echo "[push] ERROR: gh not installed"; echo "sudo apt-get update && sudo apt-get install -y gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "[push] ERROR: gh not logged in"; echo "gh auth login"; exit 1; }

# git init if needed
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git init
fi
git branch -M main || true

# .gitignore safety (secrets)
if [ -d "secrets" ] || [ -f "secrets/fx_api_key.txt" ]; then
  if ! grep -qE '^secrets/?$' .gitignore 2>/dev/null; then
    printf '\nsecrets/\n' >> .gitignore
  fi
fi

git add -A

# commit if anything staged
if git diff --cached --quiet; then
  echo "[push] nothing new to commit"
else
  git commit -m "ship: HedgeShield V2" || true
fi

# set origin
ORIGIN_URL="https://github.com/${USER}/${REPO}.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$ORIGIN_URL"
else
  git remote add origin "$ORIGIN_URL"
fi

# create repo if missing
if ! gh repo view "${USER}/${REPO}" >/dev/null 2>&1; then
  echo "[push] creating repo ${USER}/${REPO} (${VIS})..."
  gh repo create "${USER}/${REPO}" --"${VIS}" --confirm
fi

echo "[push] pushing..."
git push -u origin main

echo "[push] OK: https://github.com/${USER}/${REPO}"
