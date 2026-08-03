#!/usr/bin/env bash
# Run once on cPanel after extracting the upload zip into ~/hajiasal
# Usage (from Terminal in cPanel):
#   bash scripts/host-first-boot.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[host-boot] app root: $ROOT"

# Activate CloudLinux / cPanel Node virtualenv if present
if [ -f "$HOME/nodevenv/hajiasal/22/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$HOME/nodevenv/hajiasal/22/bin/activate"
elif [ -f "$HOME/nodevenv/hajiasal/20/bin/activate" ]; then
  # shellcheck disable=SC1091
  source "$HOME/nodevenv/hajiasal/20/bin/activate"
else
  shopt -s nullglob
  for act in "$HOME"/nodevenv/hajiasal/*/bin/activate; do
    # shellcheck disable=SC1090
    source "$act"
    break
  done
  shopt -u nullglob
fi

echo "[host-boot] node=$(command -v node || true) $(node -v 2>/dev/null || echo missing)"
echo "[host-boot] npm=$(command -v npm || true) $(npm -v 2>/dev/null || echo missing)"

if ! command -v npm >/dev/null 2>&1; then
  echo "[host-boot] ERROR: npm not found. Open Setup Node.js App → ensure app exists, then Run NPM Install, then re-run this script."
  exit 1
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  echo "[host-boot] WARNING: no .env file. Create it from .env.example OR set vars in Setup Node.js App → Environment variables."
fi

export NODE_ENV=production
npm install --no-audit --no-fund
npm run build

# Prepare standalone layout for root server.js
if [ -d .next/standalone ]; then
  mkdir -p .next/standalone/.next
  if [ -d .next/static ]; then
    rm -rf .next/standalone/.next/static
    cp -R .next/static .next/standalone/.next/static
  fi
  if [ -d public ]; then
    rm -rf .next/standalone/public
    cp -R public .next/standalone/public
  fi
  if [ ! -d .next/standalone/node_modules/mysql2 ]; then
    mkdir -p .next/standalone/node_modules
    npm install mysql2 --omit=dev --no-audit --no-fund --prefix .next/standalone || true
  fi
  echo "[host-boot] standalone ready"
else
  echo "[host-boot] WARNING: .next/standalone missing after build"
fi

mkdir -p tmp data
touch tmp/restart.txt
echo "[host-boot] done — app should restart now"
echo "[host-boot] test: https://hajiasal.ir/"
