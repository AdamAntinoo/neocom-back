# Postman (neocom-back)

## Import

1. `neocom-back.postman_collection.json`
2. `neocom-industry-blueprints.postman_collection.json` (async manufacture list / SSE)
3. `neocom-local.postman_environment.json` — select **NEOCOM local**

## Authentication (outside Postman)

SSO login is **not** driven from Postman. Use the real front:

1. Start **neocom-back** and **neocom-front**.
2. Log in through the UI (EVE SSO → front callback → `POST /v1/auth/callback`). That writes `tokens.json` on the back.
3. In Postman, run **Session → 00 Load session from back** (or **00b** for the first stored character).
4. The test script fills `neocomAccessCookie`, `characterId`, `characterName`, `pilotId`, and `authorization` on the environment.
5. Authenticated requests send `Cookie: neocom_access={{neocomAccessCookie}}` (and `Authorization: {{authorization}}` where the pilot endpoint distinguishes public vs logged-in).

Endpoint used by step 3: `GET /v1/auth/session?characterId=` — local tooling only (disabled when `ENVIRONMENT=production`).

Contract tests for `POST /v1/auth/callback` remain under **Auth** (synthetic code/state). They are not the day-to-day login path.
