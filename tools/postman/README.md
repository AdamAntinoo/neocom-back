# Postman (neocom-back)

## Import

1. `neocom-back.postman_collection.json`
2. `neocom-local.postman_environment.json` — select **NEOCOM local**

## OAuth2 / real ESI

**If `tokens.json` already has your character:** run **OAuth2 → 00 Bind stored ESI session**.

**Fresh EVE login:**

1. Start **neocom-back** only. Keep **neocom-front stopped** (so it cannot consume the SSO code).
2. Run **01 Build authorize URL** → open **Visualize** (or Postman Console) → open the link in a browser.
3. Log in at EVE. The browser will fail on `http://localhost:6001/app/login-callback?...` — copy that **full URL** into env `ssoRedirectUrl`.
4. Run **02 Exchange code via back**, then **03/04**.

Codes are one-time. Do not let the Angular callback page POST first.
