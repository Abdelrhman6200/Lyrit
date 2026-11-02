#!/usr/bin/env bash
# Daily PostgreSQL + uploads backup, encrypted and copied OFF the VPS (PRD §15.3).
# Requires: age (https://age-encryption.org) public key in BACKUP_AGE_RECIPIENT,
#           rclone remote (e.g. S3/Backblaze/R2) in BACKUP_REMOTE.
# Cron (host): 15 3 * * * /opt/lyrit/deploy/backup.sh >> /var/log/lyrit-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.production
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DIR=backups; mkdir -p "$DIR"
DB_FILE="$DIR/lyrit-db-$STAMP.sql.gz.age"
UP_FILE="$DIR/lyrit-uploads-$STAMP.tar.gz.age"

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-lyrit}" -d "${POSTGRES_DB:-lyrit}" --no-owner --clean --if-exists \
  | gzip -9 | age -r "$BACKUP_AGE_RECIPIENT" > "$DB_FILE"
docker compose exec -T app tar -C /app/storage -czf - uploads | age -r "$BACKUP_AGE_RECIPIENT" > "$UP_FILE"

rclone copy "$DIR" "$BACKUP_REMOTE/$(date -u +%Y/%m)" --include "*$STAMP*"
# Keep 7 days locally; retention on the remote is configured with a bucket lifecycle rule (e.g. 35 daily / 12 monthly).
find "$DIR" -name 'lyrit-*' -mtime +7 -delete
echo "[$STAMP] backup ok: $DB_FILE $UP_FILE"
