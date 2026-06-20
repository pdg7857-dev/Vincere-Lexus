#!/usr/bin/env bash
# One-command ENCRYPTED database backup.
#
#   npm run backup        # writes crm/backups/crm-<timestamp>.sql.gpg
#
# You'll be prompted for a passphrase (remember it — it's required to restore).
# The dump runs inside the Postgres container, so no host pg_dump is needed.
#
# RESTORE (into a running, empty db):
#   gpg -d backups/crm-YYYYMMDD-HHMMSS.sql.gpg \
#     | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#
set -euo pipefail
cd "$(dirname "$0")/.."   # -> crm/

# Load DB credentials from .env
set -a
[ -f .env ] && . ./.env
set +a

USER_NAME="${POSTGRES_USER:-crm}"
DB_NAME="${POSTGRES_DB:-crm}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p backups
OUT="backups/crm-${STAMP}.sql.gpg"

if ! command -v gpg >/dev/null 2>&1; then
  echo "gpg is required (encryption). Install GnuPG and retry." >&2
  exit 1
fi

echo "Dumping '${DB_NAME}' and encrypting (AES-256)…"
docker compose exec -T db pg_dump -U "${USER_NAME}" "${DB_NAME}" \
  | gpg --symmetric --cipher-algo AES256 -o "${OUT}"

echo "✓ Encrypted backup: crm/${OUT}"
echo "  Restore instructions are in this script's header and crm/README.md."
