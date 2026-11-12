# Back CI quality gates (CICD-B-021 / B-022)

| Gate | Suite | Where enforced |
| --- | --- | --- |
| Lint + format | `npm run lint`, `npm run format:check` | GitHub Actions `back-ci` lint job |
| Unit / TDD | `npm run test:tdd` / `test:coverage` | `back-ci` unit job |
| Acceptance (interim) | `npm run test:e2e` (Vitest e2e) | `back-ci` acceptance job — Gherkin/Cucumber is a later `back-cicd` apply |
| Coverage upload | LCOV at `coverage/lcov.info` | SonarCloud via `sonar-project.properties` |
| Sonar quality gate | org `adamantinoo`, project key from caller | `back-ci` sonar job; failure blocks publish |

SonarCloud project settings remain the source of truth for numeric thresholds (new coverage, duplication). Local agents use the same suites and this table.

## Command catalog environment (CICD-B-040…044)

| Command | Setup |
| --- | --- |
| `test:tdd` / `test:coverage` | Node via `nvm use` (alias `neocom`); `npm ci` once |
| `test:e2e` | Same Node; Nest boots in-process (Vitest). CI starts Redis `:6004` + Postgres `:6003` (compose ports / `.env.async`). No live ESI; ports overridden in specs |
| `test:bdd` / `test:sdd` | Stubs until Cucumber/OpenAPI Gherkin land |
| `test:all` | Runs tdd → bdd → sdd in sequence |
| CI Node pin | Caller workflow `node-version: 24.21.0` (`.nvmrc` alias is not downloadable on Actions) |

## External sources mock vs live (CICD-B-003 / B-004)

| Source | Default for automated tests | Notes |
| --- | --- | --- |
| Universe ESI | MAY use real feeds when a scenario opts in | Record the choice on the scenario when Gherkin lands |
| Other ESI / upstreams | Mock (provider override or future WireMock) | Live only when a scenario records that choice |

Interim Vitest e2e uses Nest provider overrides (no live ESI). WireMock catalog is a later `back-cicd` apply.
