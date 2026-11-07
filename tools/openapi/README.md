# OpenAPI (neocom-back)

Rules from OpenSpec `back-openapi` (BACK-SVC-060…063):

1. **OpenAPI first** — when a port has an OpenAPI surface, update that specification as the first development stage for new back code.
2. **Schema names** — name schemas after their **domain / interchange** model names (e.g. `BlueprintV1Dto`, `PilotV2`, `SpaceLocation`).
3. **Versioned paths** — every endpoint path includes a version prefix (e.g. `v1`).
4. **Domain model wins** — if OpenAPI and the domain/DTO disagree on fields or names, correct OpenAPI to match the code.
5. **Spec file SemVer** — after a release that shipped an adapter OpenAPI file, any further edit to that file before the next release **bumps the minor** (`info.version` and the filename `…-vX.Y.Z.yaml`). Do not leave a released filename/version for post-release edits.

Each **inbound adapter** under `src/infrastructure/adapters/inbound/` has a matching OpenAPI file that documents:

- Happy-path request/response DTOs
- Supported **ExceptionCatalog** / HTTP error responses (`NeocomError`)

Template style reference (external example): `gateway-adapter-service-v0.2.0.yaml`.

Runtime TypeScript types come from **`neocom-domain`** and back DTOs under `infrastructure/adapters/inbound/dto`. Do **not** regenerate Nest DTO classes under `src/generated`.

## Specs in this folder

| File | Inbound adapter | Controllers |
| --- | --- | --- |
| `auth-service-v0.1.0.yaml` | auth | `auth/v1-auth.controller.ts` |
| `pilot-service-v0.2.0.yaml` | pilot | `pilot/v1-pilot.controller.ts` (get pilot + assets list / by-location) |
| `industry-service-v0.1.0.yaml` | industry | `industry/v1-industry.controller.ts` |
| `manufacture-service-v0.1.0.yaml` | manufacture | `industry/v1-blueprint-list.controller.ts` |
| `universe-service-v0.1.0.yaml` | universe | `universe/v1-universe.controller.ts` |
| `gateway-adapter-service-v0.2.0.yaml` | *(template example only — not a NEOCOM runtime adapter)* | — |

## Postman

Import **one** collection: `tools/postman/neocom-back.postman_collection.json` (folder per adapter → Happy path + Exceptions). See `tools/postman/README.md`.
