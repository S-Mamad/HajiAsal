#!/usr/bin/env bash
# cPanel deploy helper for Haji Asal (Next.js standalone)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV=production

# Prefer CloudLinux / cPanel Node binaries when present
for candidate in \
  /opt/cpanel/ea-nodejs22/bin \
  /opt/cpanel/ea-nodejs20/bin \
  /opt/cpanel/ea-nodejs18/bin \
  "$HOME/nodevenv/hajiasal"/*/bin
do
  if [ -d "$candidate" ] && [ -x "$candidate/node" ]; then
    export PATH="$candidate:$PATH"
    break
  fi
done

echo "[cpanel-deploy] node=$(command -v node || true) $(node -v 2>/dev/null || echo missing)"
echo "[cpanel-deploy] npm=$(command -v npm || true) $(npm -v 2>/dev/null || echo missing)"

if ! command -v npm >/dev/null 2>&1; then
  echo "[cpanel-deploy] npm not found in PATH."
  echo "[cpanel-deploy] Open cPanel → Setup Node.js App → Run NPM Install, then npm run build."
  mkdir -p tmp
  exit 0
fi

# Full install: Next build needs some dev tooling on host
npm install --no-audit --no-fund
npm run build

# Prepare standalone layout for Passenger (server.js at project root)
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
  # Keep root .env available to standalone process via chdir in server.js
fi

mkdir -p tmp
echo "[cpanel-deploy] done"
