#!/usr/bin/env bash
set -euo pipefail

rm -rf /work
mkdir -p /work /out

tar -C /src \
  --exclude=node_modules \
  --exclude=.next \
  --exclude='*.zip' \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=_linux_build_out \
  --exclude=_hajiasal_upload_stage \
  --exclude=_hajiasal_host_stage \
  -cf - . | tar -C /work -xf -

cd /work
unset MYSQL_HOST MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE MYSQL_PORT || true

echo "[linux-build] node=$(node -v) npm=$(npm -v)"
# Must install with NODE_ENV unset so Next build tools (tailwind, typescript) are present
unset NODE_ENV || true
npm ci --no-audit --no-fund
export NODE_ENV=production
npm run build

mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -R public .next/standalone/public

if [ ! -d .next/standalone/node_modules/mysql2 ]; then
  echo "[linux-build] installing mysql2 into standalone..."
  npm install mysql2 --omit=dev --no-audit --no-fund --prefix .next/standalone
fi

# Export host runtime package into /out
find /out -mindepth 1 -maxdepth 1 -exec rm -rf {} +
mkdir -p /out/.next /out/tmp /out/data /out/public /out/mysql-migrations /out/scripts /out/docs

cp -a server.js package.json package-lock.json /out/
cp -a next.config.ts /out/ 2>/dev/null || true
cp -a .cpanel.yml /out/ 2>/dev/null || true
cp -a .env.example /out/ 2>/dev/null || true
cp -a README-UPLOAD-FA.md /out/ 2>/dev/null || true
cp -a DATABASE-SQL-FA.md /out/ 2>/dev/null || true
cp -a env.production.host.example /out/ 2>/dev/null || true
cp -a docs/HOST-DEPLOY-FA.md /out/docs/ 2>/dev/null || true
cp -a docs/DATABASE-SQL-FA.md /out/docs/ 2>/dev/null || true
cp -a docs/env.production.host.example /out/docs/ 2>/dev/null || true
cp -a public/. /out/public/
cp -a mysql-migrations/. /out/mysql-migrations/
cp -a scripts/cpanel-deploy.sh /out/scripts/ 2>/dev/null || true
cp -a .next/standalone /out/.next/standalone
cp -a .next/static /out/.next/static

printf 'ok\n' > /out/tmp/.gitkeep
printf 'ok\n' > /out/data/.gitkeep

# Host instruction (short)
cat > /out/INSTALL-ON-HOST.txt <<'EOF'
1) Extract this zip into /home/uabkxfzi/hajiasal (files at root, not nested folder)
2) Create .env from .env.example (fill MYSQL_* and secrets)
3) Setup Node.js App → Application root: hajiasal → Startup file: server.js
4) Restart app (touch tmp/restart.txt)
5) Run mysql-migrations/008_product_management_upgrade.sql in phpMyAdmin if not yet
EOF

echo "[linux-build] exported"
ls -la /out
test -f /out/.next/standalone/server.js
test -d /out/.next/standalone/.next/static
test -d /out/.next/standalone/public
echo "[linux-build] OK"
