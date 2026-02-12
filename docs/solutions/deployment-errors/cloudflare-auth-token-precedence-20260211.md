---
module: cloudflare-deployment
date: 2026-02-11
problem_type: configuration_error
component: wrangler-cli
symptoms:
  - "Cloudflare API authentication error code 10000"
  - "Asset upload endpoint rejection despite Super Administrator role"
  - "Request to /accounts/.../workers/scripts/whyitshot/assets-upload-session failed"
root_cause: "CLOUDFLARE_API_TOKEN env var took precedence over configured global API key, causing wrangler to use incompatible auth method for asset upload endpoint"
severity: high
tags:
  - cloudflare
  - wrangler
  - authentication
  - environment-variables
  - workers-deployment
---

# Cloudflare Workers Deploy Auth Failure (Error 10000)

## Problem Statement

`npm run deploy` (which runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`) failed during the asset upload phase:

```
[ERROR] A request to the Cloudflare API
(/accounts/.../workers/scripts/whyitshot/assets-upload-session) failed.
Authentication error [code: 10000]
```

Wrangler reported the user was logged in with a User API Token from `CLOUDFLARE_API_TOKEN` and had Super Administrator role, but the asset upload session endpoint still rejected the request.

## Root Cause Analysis

Wrangler's authentication precedence hierarchy:

1. `CLOUDFLARE_API_TOKEN` (User API Token) — checked first
2. `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` (Global API Key) — fallback
3. `wrangler login` browser session — last resort

The `CLOUDFLARE_API_TOKEN` was set in the shell environment but lacked the granular `Workers Scripts` permission required for the asset upload endpoint. Account-level Super Administrator role does not automatically grant token-level permissions for all API endpoints.

Meanwhile, `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` were configured in `~/.zshrc` and had full access — but wrangler never reached them because the token took precedence.

## Investigation Steps

1. **Checked `.env.local`** — No Cloudflare vars present
2. **Checked shell environment** — Found `CLOUDFLARE_API_TOKEN` was exported
3. **Checked `~/.zshrc`** — Found working `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` already configured
4. **Identified auth precedence** — Wrangler prefers API token over global API key when both exist

## Working Solution

Unset the API token to let wrangler fall back to global API key auth:

```bash
unset CLOUDFLARE_API_TOKEN && npm run deploy
```

Deploy succeeded immediately with 6 new assets uploaded.

## Prevention

- **Standardize on one auth method.** For this project, use `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL` (global API key). Do not set `CLOUDFLARE_API_TOKEN` unless it has explicit Workers Scripts permission.
- **If deploy fails with auth error**, first check: `echo $CLOUDFLARE_API_TOKEN` — if set, unset it.
- **If using API tokens**, verify these scopes in the Cloudflare dashboard: Workers Scripts (Edit), Workers Routes (Edit).

## Cross-References

- Related: `docs/solutions/security-issues/nextjs-16-api-security-hardening.md` (mentions Cloudflare Workers deployment context)
- Cloudflare auth docs: https://developers.cloudflare.com/fundamentals/api/get-started/
