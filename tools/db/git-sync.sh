#!/usr/bin/env bash
# Keep local Postgres schema aligned with tools/db/sql via Flyway.
# Used by .githooks (pre-commit, post-commit, post-merge, post-checkout).
#
# Usage: tools/db/git-sync.sh [--strict]
#   --strict  exit non-zero when Docker is up but migrate fails (pre-commit)
#   default   warn and exit 0 on failure (post-* hooks must not break git)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

STRICT=0
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "[db-sync] Docker unavailable — skip Flyway (npm run docker:up && npm run db:migrate)"
  exit 0
fi

if bash tools/db/flyway.sh migrate; then
  echo "[db-sync] Flyway migrate ok"
  exit 0
fi

echo "[db-sync] Flyway migrate failed — is Postgres up? (npm run docker:up)"
if [[ "$STRICT" -eq 1 ]]; then
  exit 1
fi
exit 0
