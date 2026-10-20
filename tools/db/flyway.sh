#!/usr/bin/env bash
# Run Flyway against local Docker Postgres using the official image.
# Usage: ./tools/db/flyway.sh info|migrate|validate|...
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CMD="${1:-info}"
shift || true

FLYWAY_IMAGE="${FLYWAY_IMAGE:-flyway/flyway:10.22.0}"
# host.docker.internal works on Docker Desktop; Linux compose uses host-gateway.
JDBC_URL="${FLYWAY_URL:-jdbc:postgresql://host.docker.internal:6003/neocom_async}"
USER="${FLYWAY_USER:-neocom}"
PASS="${FLYWAY_PASSWORD:-neocom}"

exec docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "${ROOT}/tools/db/sql:/flyway/sql:ro" \
  "${FLYWAY_IMAGE}" \
  -url="${JDBC_URL}" \
  -user="${USER}" \
  -password="${PASS}" \
  -locations=filesystem:/flyway/sql \
  -baselineOnMigrate=true \
  -validateOnMigrate=true \
  "${CMD}" "$@"
