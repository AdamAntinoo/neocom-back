# Postman (neocom-back)

## Import

1. **`neocom-back.postman_collection.json`** — single collection covering every inbound adapter
2. **`neocom-local.postman_environment.json`** — select **NEOCOM local**

There is no second collection. Manufacture list/SSE lives under the **Manufacture** folder.

## Collection layout

Each adapter folder mirrors `src/infrastructure/adapters/inbound/`:

| Folder | OpenAPI |
| --- | --- |
| Auth | `tools/openapi/auth-service-v0.1.0.yaml` |
| Pilot | `tools/openapi/pilot-service-v0.1.0.yaml` |
| Industry | `tools/openapi/industry-service-v0.1.0.yaml` |
| Manufacture | `tools/openapi/manufacture-service-v0.1.0.yaml` |
| Universe | `tools/openapi/universe-service-v0.1.0.yaml` |

Inside each folder:

1. **Happy path** — nominal success requests
2. **Exceptions** — one request per documented API error outcome

## Authentication (outside Postman)

SSO login is **not** driven from Postman for day-to-day use. Prefer the front:

1. Start **neocom-back** and **neocom-front**.
2. Log in through the UI (EVE SSO → front callback → `POST /v1/auth/callback`). That writes `tokens.json` on the back.
3. In Postman, run **Auth → Happy path → Load session from back**.
4. The test script fills `neocomAccessCookie`, `characterId`, `characterName`, `pilotId`, and `authorization`.
5. Authenticated requests send `Cookie: neocom_access={{neocomAccessCookie}}` (and `Authorization: {{authorization}}` where Pilot distinguishes public vs logged-in).

`GET /v1/auth/session` is local tooling only (disabled when `ENVIRONMENT=production`).

Contract tests for `POST /v1/auth/callback` remain under **Auth → Happy path / Exceptions**.
