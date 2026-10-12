#!/usr/bin/env bash
# =============================================================================
# Eduvia — One-Command Database Restore Script (On-Premises)
# =============================================================================
# Usage: ./scripts/restore-db.sh /path/to/backups/eduvia_backup_YYYYMMDD_HHMMSS.dump
# =============================================================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup.dump>"
    exit 1
fi

DUMP_PATH="$1"

if [ ! -f "${DUMP_PATH}" ]; then
    echo "ERROR: Backup file does not exist: ${DUMP_PATH}" >&2
    exit 1
fi

# Verify SHA256 checksum if exists
if [ -f "${DUMP_PATH}.sha256" ]; then
    echo "Verifying SHA-256 checksum..."
    sha256sum -c "${DUMP_PATH}.sha256"
fi

echo "==================================================================="
echo "WARNING: Restoring will overwrite existing data in 'eduvia-db'!"
echo "Target backup: ${DUMP_PATH}"
echo "==================================================================="
read -p "Type 'RESTORE' to proceed: " CONFIRM

if [ "${CONFIRM}" != "RESTORE" ]; then
    echo "Aborted by operator. No changes made."
    exit 0
fi

echo "Streaming dump into container 'eduvia-db' via pg_restore..."
docker exec -i eduvia-db pg_restore -U postgres -d postgres --clean --if-exists < "${DUMP_PATH}"

echo "Database restore completed successfully!"
