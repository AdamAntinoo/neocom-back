# OpenAPI (neocom-back)

Rules from OpenSpec `back-openapi` (BACK-SVC-060…063):

1. **OpenAPI first** — when a port has an OpenAPI surface, update that specification as the first development stage for new back code.
2. **Schema names** — name schemas after their **domain model** names (e.g. `BlueprintV1`, `PilotV2`, `PublicPilotV1`).
3. **Versioned paths** — every endpoint path includes a version prefix (e.g. `v1`).
4. **Domain model wins** — if OpenAPI and the domain model disagree on fields or names, correct OpenAPI to match the domain model.

Runtime TypeScript types come from **`neocom-domain`** (`file:../neocom-domain`). Do **not** regenerate Nest DTO classes under `src/generated` — that tree is removed / deprecated.

## Specs in this folder

| File | API |
| --- | --- |
| `pilot-service-v0.1.0.yaml` | Pilot (`GET /v1/pilots/{pilotId}`) → `PublicPilotV1` / `PilotV2` |
| `industry-service-v0.1.0.yaml` | Industry pilot blueprints (`GET /v1/pilots/{pilotId}/blueprints`) → `BlueprintV1[]` |
| `gateway-adapter-service-v0.2.0.yaml` | Gateway adapter (legacy) |
