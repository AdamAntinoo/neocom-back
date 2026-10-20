# neocom-back

NestJS server for the NEOCOM ecosystem. Node comes from the nvm alias `neocom`.

```bash
nvm use
npm install
npm test
npm run start:dev
```

npm scripts (what each does and when to use it): **[SCRIPTS.md](SCRIPTS.md)**.

The server listens on port 3000 unless `PORT` is set.

Path aliases (see `tsconfig.json` / `package.json` `imports`): `@App`, `@Domain`, `@Infra`, `@Inbound` → `adapters/inbound`, `@Outbound` → `adapters/outbound`, `@Generated`.

## External services (Docker) and schema (Flyway)

PostgreSQL and Redis live under `tools/docker/`. Schema versions live under `tools/db/` and are applied with **Flyway** (repo-owned DB state).

```bash
npm run docker:up      # start Postgres :6003 and Redis :6004
npm run db:migrate     # apply Flyway SQL under tools/db/sql/
npm run db:info
npm run docker:down
```

Git hooks (`.githooks/`, enabled by `npm install` / `prepare`) run Flyway **before and after every commit** (and after merge/checkout) so the local DB stays in sync with `tools/db/sql/`. See [tools/db/README.md](tools/db/README.md).

`.env.async` supplies `DATABASE_URL` and `REDIS_URL`. Leave `TYPEORM_SYNC=false` when using Flyway. See [tools/docker/README.md](tools/docker/README.md) and [tools/db/README.md](tools/db/README.md).
## Version

Versions come from [GitVersion](https://gitversion.net/) in continuous deployment mode (`GitVersion.yml`). There is no version-source tag yet. `package.json` starts at `0.0.1`. On `main`, each later commit increments the minor version.

```bash
npm run version:sync   # write GitVersion major.minor.patch into package.json
```
