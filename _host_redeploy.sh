#!/bin/bash
set -u
LOG=/home/uabkxfzi/redeploy-out.txt
ZIP=/home/uabkxfzi/hajiasal-host-upload.zip
STAGE=/home/uabkxfzi/_deploy_stage
NODE=/opt/alt/alt-nodejs22/root/usr/bin/node
MYSQL="mysql --defaults-extra-file=/home/uabkxfzi/.my.cnf.hajiasal --connect-timeout=15 --force"

{
  echo "START $(date)"
  if [ ! -f "$ZIP" ]; then echo "MISSING ZIP"; exit 1; fi
  rm -rf "$STAGE"
  mkdir -p "$STAGE"
  echo "EXTRACT ZIP"
  unzip -oq "$ZIP" -d "$STAGE"
  test -f "$STAGE/server.js" || { echo "BAD ZIP LAYOUT"; ls -la "$STAGE"; exit 1; }
  test -f "$STAGE/.next/standalone/server.js" || { echo "MISSING STANDALONE"; exit 1; }

  write_htaccess() {
    local dir="$1"
    local root="$2"
    cat > "$dir/.htaccess" <<EOF
# BEGIN HajiAsal Passenger
PassengerEnabled On
PassengerAppRoot "$root"
PassengerAppType node
PassengerStartupFile server.js
PassengerNodejs "$NODE"
PassengerFriendlyErrorPages Off
# END HajiAsal Passenger
EOF
  }

  for app in hajiasal hajiasal-admin hajiasal-seller; do
    echo "=== DEPLOY $app ==="
    APPDIR=/home/uabkxfzi/$app
    mkdir -p "$APPDIR" "$APPDIR/tmp" "$APPDIR/data"
    [ -f "$APPDIR/.env" ] && cp -a "$APPDIR/.env" "/tmp/${app}.env.bak"
    rm -rf "$APPDIR/.next"
    cp -a "$STAGE"/. "$APPDIR"/
    if [ -f "/tmp/${app}.env.bak" ]; then
      cp -a "/tmp/${app}.env.bak" "$APPDIR/.env"
    fi
    if [ -f "$APPDIR/.env" ] && ! grep -q '^MYSQL_POOL_SIZE=' "$APPDIR/.env"; then
      echo 'MYSQL_POOL_SIZE=2' >> "$APPDIR/.env"
    fi
    if [ -f "$APPDIR/.env" ]; then
      cp -a "$APPDIR/.env" "$APPDIR/.next/standalone/.env"
    fi
    write_htaccess "$APPDIR" "$APPDIR"
    mkdir -p "$APPDIR/tmp"
    date -Iseconds > "$APPDIR/tmp/restart.txt"
    : > "$APPDIR/stderr.log"
  done

  write_htaccess /home/uabkxfzi/public_html /home/uabkxfzi/hajiasal

  mkdir -p /home/uabkxfzi/hajiasal-shared/uploads \
    /home/uabkxfzi/hajiasal/public \
    /home/uabkxfzi/hajiasal-admin/public \
    /home/uabkxfzi/hajiasal-seller/public \
    /home/uabkxfzi/hajiasal/.next/standalone/public \
    /home/uabkxfzi/hajiasal-admin/.next/standalone/public \
    /home/uabkxfzi/hajiasal-seller/.next/standalone/public
  ln -sfn /home/uabkxfzi/hajiasal-shared/uploads /home/uabkxfzi/hajiasal/public/uploads
  ln -sfn /home/uabkxfzi/hajiasal-shared/uploads /home/uabkxfzi/hajiasal-admin/public/uploads
  ln -sfn /home/uabkxfzi/hajiasal-shared/uploads /home/uabkxfzi/hajiasal-seller/public/uploads
  ln -sfn /home/uabkxfzi/hajiasal-shared/uploads /home/uabkxfzi/hajiasal/.next/standalone/public/uploads
  ln -sfn /home/uabkxfzi/hajiasal-shared/uploads /home/uabkxfzi/hajiasal-admin/.next/standalone/public/uploads
  ln -sfn /home/uabkxfzi/hajiasal-shared/uploads /home/uabkxfzi/hajiasal-seller/.next/standalone/public/uploads

  chmod 600 /home/uabkxfzi/.my.cnf.hajiasal 2>/dev/null || true
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    echo "MIG TRY $i"
    if $MYSQL -e "SELECT 1" >/dev/null 2>/tmp/mig-err; then
      echo "CONNECTED"
      $MYSQL < /home/uabkxfzi/hajiasal/mysql-migrations/010_seller_applications.sql 2>&1 || true
      $MYSQL -e "SHOW TABLES LIKE 'seller_applications';" 2>&1 || true
      break
    else
      echo "connect fail: $(cat /tmp/mig-err 2>/dev/null)"
      sleep 12
    fi
  done

  rm -rf "$STAGE"
  echo "DONE $(date)"
} > "$LOG" 2>&1