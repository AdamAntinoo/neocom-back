# npm scripts (`package.json`)

Always run `nvm use` in this repo before `node` / `npm` / `npx` (alias `neocom` from `.nvmrc`).

## Typical workflows

### Day-to-day API development (no Postgres/Redis)

```bash
nvm use
npm install          # also runs prepare → enables .githooks
npm run start:dev    # watch mode; PORT from .env.application (dev-watch: 6002)
```

Unit tests do not need Docker. Async code uses in-memory store + in-process enrichment when `DATABASE_URL` / `REDIS_URL` are unset.

### Day-to-day with async persistence

```bash
npm run docker:up    # Postgres :6003, Redis :6004
npm run db:migrate   # Flyway apply tools/db/sql
# ensure .env.async has DATABASE_URL / REDIS_URL (committed defaults)
npm run start:dev
```

Git hooks also run Flyway around commits when Docker is up (see [tools/db/README.md](tools/db/README.md)).

### Before a pull request / CI-like local check

```bash
npm run lint
npm test
npm run test:e2e     # if e2e specs apply to your change
npm run build
```

---

## Script reference

### Run the server

| Script | What it does | When to use |
| --- | --- | --- |
| `start` | One-shot Nest start (no watch) | Quick smoke after a build; rarely for daily work |
| `start:dev` | Prints banner, then Nest **watch** mode | **Default local development** |
| `start:debug` | Same as `start:dev` plus Node inspector | Debugging with a debugger attached |
| `start:prod` | Runs `node dist/main` | After `build`, to mimic production locally |
| `banner` | Generates the startup banner asset | Called by `start:dev` / `start:debug`; rarely alone |

Set `PORT` in `.env.application` (programme: **6002** for dev-watch). Load order includes `.env.async` when present (`AppModule`).

### Build and version

| Script | What it does | When to use |
| --- | --- | --- |
| `build` | `nest build` → `dist/` | Before `start:prod`, packaging, or verifying compile |
| `deploy` | `nest deploy` | Nest deployment tooling when that path is configured; not for local Flyway/Docker |
| `version:sync` | Writes GitVersion SemVer into `package.json` | Release / CD sync; see README Version section |
| `prepare` | Sets `git config core.hooksPath .githooks` | **Automatic** on `npm install`; do not rely on running it by hand |

### Quality

| Script | What it does | When to use |
| --- | --- | --- |
| `lint` | Oxlint (type-aware) on `src/` and `test/` | Before commit / PR; fix issues it reports |
| `format` | Prettier write on `src/**/*.ts` and `test/**/*.ts` | When you want formatting applied in bulk |
| `test` | Vitest **once** (unit `*.spec.ts`) | Default test gate; CI and pre-PR |
| `test:watch` | Vitest watch | TDD while editing |
| `test:cov` | Vitest with coverage | Coverage reports / gates |
| `test:debug` | Vitest with inspector, no file parallelism | Stepping through a failing unit test |
| `test:e2e` | Vitest with `vitest.config.e2e.ts` | HTTP / app-level e2e under `test/` |

### Docker (external services)

Compose file: `tools/docker/docker-compose.yml`. Details: [tools/docker/README.md](tools/docker/README.md).

| Script | What it does | When to use |
| --- | --- | --- |
| `docker:up` | Start Postgres + Redis in background | Before local TypeORM / BullMQ / SSE Redis work |
| `docker:down` | Stop and remove those containers | End of session or when freeing ports |
| `docker:ps` | Show compose service status | Check health / whether stack is up |

Host ports (dev-watch 600x): Postgres **6003**, Redis **6004**.

### Database (Flyway)

SQL versions: `tools/db/sql/`. Details: [tools/db/README.md](tools/db/README.md). Requires Docker (Flyway image) and Postgres reachable on **6003**.

| Script | What it does | When to use |
| --- | --- | --- |
| `db:migrate` | Apply pending Flyway migrations | After `docker:up`, after adding/changing `V*__*.sql`, or when schema is behind |
| `db:info` | Show applied / pending versions | Diagnose drift before migrate |
| `db:validate` | Checksum / version validation | Confirm applied migrations still match repo files |
| `db:sync` | Soft-fail migrate (same as post-commit hooks) | Manual “align DB now” without failing if Docker is down |

**Do not** use `TYPEORM_SYNC=true` when Flyway owns the schema. Prefer `db:migrate`.

Hooks (`.githooks/`): `pre-commit` runs sync **strict** (blocks if Docker is up and migrate fails); `post-commit` / `post-merge` / `post-checkout` run soft sync.

### Code generation

| Script | What it does | When to use |
| --- | --- | --- |
| `openapi:pilot` | Generate Nest TypeScript from `tools/openapi/pilot-service-*.yaml` into `src/generated/pilot`, then fix imports | When the pilot OpenAPI contract changes; commit generated output with the change |

Requires `openapi-generator` on your PATH (or install the CLI the team uses for this script).

---

## Path aliases (not scripts)

Declared in `package.json` `imports` and `tsconfig.json` `paths`. Use in source imports:

| Alias | Target |
| --- | --- |
| `@App/*` | `application/*` |
| `@Domain/*` | `domain/*` |
| `@Infra/*` | `infrastructure/*` |
| `@Inbound/*` | `infrastructure/adapters/inbound/*` |
| `@Outbound/*` | `infrastructure/adapters/outbound/*` |
| `@Generated/*` | `generated/*` |

---

## What not to confuse

| Need | Use | Avoid |
| --- | --- | --- |
| Local API coding | `start:dev` | `start:prod` without a fresh `build` |
| Schema change | Edit `tools/db/sql/V*__*.sql` + `db:migrate` | Turning on TypeORM synchronize in shared/local-with-Flyway |
| “Is Redis/Postgres up?” | `docker:ps` | Guessing from Nest logs alone |
| Unit vs e2e | `test` vs `test:e2e` | Assuming `test` covers HTTP e2e |
| Align DB after pull | hooks or `db:sync` / `db:migrate` | Hand-editing tables to match entities |
