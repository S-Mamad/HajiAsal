#!/usr/bin/env bash
# Linux production build for cPanel upload zip
set -euo pipefail
cd /app

echo "[linux-build] node=$(node -v) npm=$(npm -v)"

# Avoid leaking local Windows .env into container if mounted; use build-safe empty MySQL
# so prerender falls back instead of hanging on unreachable host DB.
export NODE_ENV=production
unset MYSQL_HOST MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE MYSQL_PORT || true

npm ci --no-audit --no-fund
npm run build

# Prepare standalone layout expected by root server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -R public .next/standalone/public

# mysql2 is marked serverExternalPackages — ensure it exists inside standalone
if [ ! -d .next/standalone/node_modules/mysql2 ]; then
  echo "[linux-build] installing mysql2 into standalone..."
  mkdir -p .next/standalone/node_modules
  npm install mysql2 --omit=dev --no-audit --no-fund --prefix .next/standalone
fi

mkdir -p tmp data
echo "[linux-build] done"
ls -la .next/standalone/server.js
ls -la .next/standalone/.next/static | head
