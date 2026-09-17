#!/usr/bin/env bash
# =============================================================================
# new-migration.sh — Scaffold a new DbUp migration script
#
# Usage:
#   ./scripts/new-migration.sh <service> <description>
#
# Examples:
#   ./scripts/new-migration.sh project AddBranchColumn
#   ./scripts/new-migration.sh authentication AddRefreshTokensTable
#   ./scripts/new-migration.sh deployment AddLogsTable
#   ./scripts/new-migration.sh environment AddSecretsTable
#
# Supported services: authentication, project, deployment, environment
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Validate arguments
# ---------------------------------------------------------------------------
if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <service> <description>"
  echo ""
  echo "  Services: authentication | project | deployment | environment"
  echo ""
  echo "  Examples:"
  echo "    $0 project AddBranchColumn"
  echo "    $0 authentication AddRefreshTokensTable"
  exit 1
fi

SERVICE="${1,,}"   # lowercase
DESCRIPTION="$2"

# ---------------------------------------------------------------------------
# Map service name → backend project directory
# ---------------------------------------------------------------------------
declare -A SERVICE_MAP=(
  [authentication]="src/backend/Harbor.Authentication"
  [project]="src/backend/Harbor.Project"
  [deployment]="src/backend/Harbor.Deployment"
  [environment]="src/backend/Harbor.Environment"
)

if [[ -z "${SERVICE_MAP[$SERVICE]+x}" ]]; then
  echo "❌ Unknown service: '$SERVICE'"
  echo "   Valid services: ${!SERVICE_MAP[*]}"
  exit 1
fi

PROJECT_DIR="${SERVICE_MAP[$SERVICE]}"
SCRIPTS_DIR="$PROJECT_DIR/Scripts"

# ---------------------------------------------------------------------------
# Ensure Scripts directory exists
# ---------------------------------------------------------------------------
mkdir -p "$SCRIPTS_DIR"

# ---------------------------------------------------------------------------
# Determine next sequence number
# ---------------------------------------------------------------------------
LAST_NUM=$(find "$SCRIPTS_DIR" -maxdepth 1 -name "*.sql" \
  | sed -E 's/.*\/([0-9]+)_.*/\1/' \
  | sort -n \
  | tail -1)

if [[ -z "$LAST_NUM" ]]; then
  NEXT_NUM=1
else
  NEXT_NUM=$((10#$LAST_NUM + 1))
fi

# Zero-pad to 4 digits (e.g. 0001, 0012, 0123)
PADDED=$(printf "%04d" "$NEXT_NUM")

# ---------------------------------------------------------------------------
# Build filename
# ---------------------------------------------------------------------------
FILENAME="${PADDED}_${DESCRIPTION}.sql"
FILEPATH="$SCRIPTS_DIR/$FILENAME"

# ---------------------------------------------------------------------------
# Refuse to overwrite an existing file
# ---------------------------------------------------------------------------
if [[ -f "$FILEPATH" ]]; then
  echo "❌ File already exists: $FILEPATH"
  exit 1
fi

# ---------------------------------------------------------------------------
# Write the migration template
# ---------------------------------------------------------------------------
cat > "$FILEPATH" <<EOF
-- Migration: ${FILENAME}
-- Service:   Harbor.$(echo "${SERVICE^}")
-- Created:   $(date -u +"%Y-%m-%d %H:%M UTC")
--
-- Description:
--   ${DESCRIPTION}
--
-- IMPORTANT: Do NOT modify this file after it has been applied to any environment.
--            Checksum validation will detect and reject any changes.
--            To fix a mistake, create a new migration instead.
-- =============================================================================

-- TODO: Write your migration SQL here

EOF

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "✅ Created migration: $FILEPATH"
echo ""
echo "   Next steps:"
echo "   1. Open the file and write your SQL"
echo "   2. Commit together with your code changes"
echo "   3. The migration runs automatically on next service startup"
echo ""
