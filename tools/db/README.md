# Database schema — Flyway

Schema state for `neocom-back` is versioned in this repo under `tools/db/sql/` and applied with **[Flyway](https://documentation.red-gate.com/flyway)**. TypeORM entities map to these tables; they do **not** own migrations in shared environments (`TYPEORM_SYNC` stays off except optional local spikes).

## Layout

| Path | Role |
| --- | --- |
| `sql/V{n}__description.sql` | Versioned migrations (Flyway naming) |
| `flyway.conf` | Default JDBC URL / user for local Docker Postgres |

Current baseline:

- `V1__processed_nodes.sql` — `processed_nodes` table for async enrichment

## Prerequisites

1. Postgres running (`npm run docker:up` from the repo root).
2. Docker available to run the Flyway image (no local Flyway install required).

## Git hooks (keep DB in sync)

Flyway runs **before and after every commit** (and after merge / branch checkout) so local Postgres stays aligned with `tools/db/sql/`:

| Hook | Behaviour |
| --- | --- |
| `pre-commit` | `git-sync.sh --strict` — migrate; **blocks** the commit if Docker is up and migrate fails |
| `post-commit` | migrate again (covers versions just committed); warns only if it fails |
| `post-merge` / `post-checkout` | migrate after pull or branch switch |

Hooks live in `.githooks/`. `npm install` (via `prepare`) sets `core.hooksPath` to `.githooks`. One-shot without install:

```bash
git config core.hooksPath .githooks
```

If Docker or Postgres is down, hooks **skip** with a message (pre-commit does not block offline work).

## Commands

From `neocom-back` root:

```bash
npm run db:info       # pending / applied versions
npm run db:migrate    # apply pending migrations
npm run db:validate   # checksum / version check
npm run db:sync       # same as git hooks (soft-fail)
```

These wrap `tools/db/flyway.sh`, which runs the official `flyway/flyway` image against `sql/` (no local Flyway install). Defaults match `flyway.conf` and local Docker Postgres (`neocom` / `neocom_async`).

Override when needed:

```bash
FLYWAY_URL='jdbc:postgresql://host.docker.internal:6003/neocom_async' \
FLYWAY_USER=neocom FLYWAY_PASSWORD=neocom \
  npm run db:migrate
```
## Adding a migration

1. Add `tools/db/sql/V{next}__short_name.sql` (never edit an already-applied `V*` file).
2. Run `npm run db:migrate`.
3. Align TypeORM entities under `src/infrastructure/` with the new columns.

## Relation to TypeORM

| Mode | When |
| --- | --- |
| Flyway migrate | Default for local-with-Docker and any shared/CI DB |
| `TYPEORM_SYNC=true` | Optional offline spike only; do not use when Flyway owns the schema |
