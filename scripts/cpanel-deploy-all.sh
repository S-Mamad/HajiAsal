#!/usr/bin/env bash
# Deploy same repo to three cPanel Node app folders (storefront / admin / seller).
# Usage (on host after git pull into a source checkout):
#   bash scripts/cpanel-deploy-all.sh
#
# Override paths:
#   DEPLOY_STOREFRONT=/home/USER/hajiasal \
#   DEPLOY_ADMIN=/home/USER/hajiasal-admin \
#   DEPLOY_SELLER=/home/USER/hajiasal-seller \
#   bash scripts/cpanel-deploy-all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STOREFRONT="${DEPLOY_STOREFRONT:-/home/uabkxfzi/hajiasal}"
ADMIN="${DEPLOY_ADMIN:-/home/uabkxfzi/hajiasal-admin}"
SELLER="${DEPLOY_SELLER:-/home/uabkxfzi/hajiasal-seller}"
SHARED_UPLOADS="${DEPLOY_SHARED_UPLOADS:-/home/uabkxfzi/hajiasal-shared/uploads}"

rsync_one() {
  local dest="$1"
  echo "[cpanel-deploy-all] rsync → $dest"
  mkdir -p "$dest" "$dest/tmp"
  rsync -a --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='data' \
    --exclude='test-results' \
    --exclude='playwright-report' \
    --exclude='public/uploads' \
    "$ROOT"/ "$dest"/
}

link_uploads() {
  local dest="$1"
  mkdir -p "$SHARED_UPLOADS"
  mkdir -p "$dest/public"
  if [ -e "$dest/public/uploads" ] && [ ! -L "$dest/public/uploads" ]; then
    echo "[cpanel-deploy-all] migrating real uploads dir → shared"
    # Merge existing files into shared, then replace with symlink
    shopt -s nullglob
    for item in "$dest/public/uploads"/*; do
      base="$(basename "$item")"
      if [ ! -e "$SHARED_UPLOADS/$base" ]; then
        mv "$item" "$SHARED_UPLOADS/$base"
      fi
    done
    shopt -u nullglob
    rm -rf "$dest/public/uploads"
  fi
  rm -f "$dest/public/uploads"
  ln -sfn "$SHARED_UPLOADS" "$dest/public/uploads"
  echo "[cpanel-deploy-all] linked uploads → $dest/public/uploads"
}

build_one() {
  local dest="$1"
  local role="$2"
  echo "[cpanel-deploy-all] build ($role) in $dest"
  (
    cd "$dest"
    export APP_ROLE="$role"
    # Bake public URLs into middleware/client if present in .env
    set -a
    # shellcheck disable=SC1091
    [ -f .env ] && . ./.env
    set +a
    export APP_ROLE="$role"
    if [ -x "$dest/scripts/cpanel-deploy.sh" ]; then
      bash "$dest/scripts/cpanel-deploy.sh"
    else
      npm install --no-audit --no-fund
      npm run build
    fi
    mkdir -p tmp
    touch tmp/restart.txt
  )
}

rsync_one "$STOREFRONT"
rsync_one "$ADMIN"
rsync_one "$SELLER"

link_uploads "$STOREFRONT"
link_uploads "$ADMIN"
link_uploads "$SELLER"

build_one "$STOREFRONT" "storefront"
build_one "$ADMIN" "admin"
build_one "$SELLER" "seller"

echo "[cpanel-deploy-all] done"
echo "Ensure each app .env has the matching APP_ROLE and shared MYSQL_* / AUTH_SESSION_SECRET / SMS_*."
