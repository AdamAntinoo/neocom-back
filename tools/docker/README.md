# Docker — external services for `neocom-back`

Local **PostgreSQL** (processed/calculated node persistence) and **Redis** (BullMQ enrichment queue and optional SSE fan-out).

## Start / stop

From the `neocom-back` repository root:

```bash
npm run docker:up      # docker compose -f tools/docker/docker-compose.yml up -d
npm run docker:down    # stop and remove containers
npm run docker:ps      # status
```

Or:

```bash
docker compose -f tools/docker/docker-compose.yml up -d
docker compose -f tools/docker/docker-compose.yml down
```

## Connection (Nest)

`.env.async` is loaded by Nest (`AppModule`). Defaults match this compose file:

| Variable | Default |
| --- | --- |
| `DATABASE_URL` | `postgresql://neocom:neocom@localhost:6003/neocom_async` |
| `REDIS_URL` | `redis://localhost:6004` |

Without these variables the async module uses in-memory store and in-process enrichment (offline / unit tests).

After Postgres is healthy, apply schema with Flyway:

```bash
npm run db:migrate
```

See [../db/README.md](../db/README.md). Do not use `TYPEORM_SYNC=true` when Flyway owns the schema.
## Ports

| Service | Host port (dev-watch 600x) |
| --- | --- |
| Front | `6001` |
| Back | `6002` |
| PostgreSQL 16 | `6003` (container `5432`) |
| Redis 7 | `6004` (container `6379`) |

These follow the programme port scheme: after back `6002`, Postgres is `6003` and Redis the next port.
