#!/usr/bin/env bash
# cPanel deploy helper for Haji Asal (Next.js standalone)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV=production

# Exact venv from Setup Node.js App (hajiasal / Node 22), then fallbacks
activate_node() {
  local activate
  for activate in \
    "$HOME/nodevenv/hajiasal/22/bin/activate" \
    "$HOME/nodevenv/hajiasal/20/bin/activate" \
    "$HOME/nodevenv/hajiasal-admin/22/bin/activate" \
    "$HOME/nodevenv/hajiasal-seller/22/bin/activate" \
    "$HOME/nodevenv/hajiasal"/*/bin/activate \
    "$HOME/nodevenv/hajiasal-admin"/*/bin/activate \
    "$HOME/nodevenv/hajiasal-seller"/*/bin/activate
  do
    if [ -f "$activate" ]; then
      # shellcheck disable=SC1090
      source "$activate"
      echo "[cpanel-deploy] activated: $activate"
      return 0
    fi
  done

  for candidate in \
    /opt/cpanel/ea-nodejs22/bin \
    /opt/cpanel/ea-nodejs20/bin \
    /opt/cpanel/ea-nodejs18/bin
  do
    if [ -d "$candidate" ] && [ -x "$candidate/node" ]; then
      export PATH="$candidate:$PATH"
      echo "[cpanel-deploy] PATH prepend: $candidate"
      return 0
    fi
  done

  return 1
}

activate_node || true

echo "[cpanel-deploy] cwd=$ROOT"
echo "[cpanel-deploy] node=$(command -v node || true) $(node -v 2>/dev/null || echo missing)"
echo "[cpanel-deploy] npm=$(command -v npm || true) $(npm -v 2>/dev/null || echo missing)"

if ! command -v npm >/dev/null 2>&1; then
  echo "[cpanel-deploy] ERROR: npm not found."
  echo "[cpanel-deploy] In Terminal run:"
  echo "  source /home/uabkxfzi/nodevenv/hajiasal/22/bin/activate && cd /home/uabkxfzi/hajiasal"
  echo "  npm install && npm run build && mkdir -p tmp && touch tmp/restart.txt"
  exit 1
fi

npm install --no-audit --no-fund
npm run build

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
else
  echo "[cpanel-deploy] ERROR: .next/standalone missing after build."
  exit 1
fi

mkdir -p tmp
touch tmp/restart.txt 2>/dev/null || true

# Best-effort Telegram production update alert (never fails deploy)
if [ "${SKIP_TELEGRAM_DEPLOY_NOTIFY:-}" != "1" ] && [ -f "$ROOT/scripts/telegram-deploy-notify.mjs" ]; then
  # shellcheck disable=SC1091
  set -a
  [ -f "$ROOT/.env" ] && . "$ROOT/.env" || true
  set +a
  export APP_ROLE="${APP_ROLE:-storefront}"
  # Prefer admin URL + secret if present on multi-app hosts
  if [ -z "${TELEGRAM_DEPLOY_NOTIFY_URL:-}" ] && [ -f "$HOME/hajiasal-admin/.env" ]; then
    # shellcheck disable=SC1091
    set -a
    . "$HOME/hajiasal-admin/.env" || true
    set +a
  fi
  # Refresh Persian changelog from git when available (helps next upload without .git)
  node "$ROOT/scripts/telegram-deploy-notify.mjs" --write-changelog-only 2>/dev/null || true
  node "$ROOT/scripts/telegram-deploy-notify.mjs" \
    --app "${APP_ROLE}" \
    --title "آپدیت پروداکشن حاجی‌عسل" \
    || echo "[cpanel-deploy] telegram notify skipped"
fi

echo "[cpanel-deploy] done"
