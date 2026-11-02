#!/usr/bin/env bash
# Restore a database backup. Usage: deploy/restore.sh backups/lyrit-db-<stamp>.sql.gz.age
# Requires the age private key in BACKUP_AGE_IDENTITY (path). Test this regularly on staging.
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.production
FILE=${1:?backup file required}
read -r -p "This will OVERWRITE database ${POSTGRES_DB:-lyrit}. Type 'restore' to continue: " ok
[ "$ok" = "restore" ] || exit 1
age -d -i "$BACKUP_AGE_IDENTITY" "$FILE" | gunzip | docker compose exec -T db psql -U "${POSTGRES_USER:-lyrit}" -d "${POSTGRES_DB:-lyrit}" -v ON_ERROR_STOP=1
echo "Restore complete."
