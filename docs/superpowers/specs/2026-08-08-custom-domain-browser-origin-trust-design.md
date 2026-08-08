# Custom Domain Browser Origin Trust

**Date:** 2026-08-08  
**Status:** Design approved (brainstorm)  
**Related:** [Multi-user tenancy](./2026-07-27-multi-user-tenancy-restructure-design.md), [CONTEXT.md](../../../CONTEXT.md) custom domain / primary app host, [`.agents/auth.md`](../../../.agents/auth.md)

## Problem

Verified custom domains already resolve **Host → tenant** for public portfolio and repos. Browser clients on those hosts call the API at `VITE_SERVER_URL` (e.g. `https://custom.example` → `https://api…/rpc/…`).

Today API **CORS** and Better Auth **`trustedOrigins`** only allow the primary web origin from `VITE_WEB_URL`. Preflight succeeds with method/header allow lists but **no `Access-Control-Allow-Origin`**, so public oRPC fails in the browser.

This is a **completion gap** for an intentional product feature (per-user domain in dashboard → public profile/repos on that Host), not a reason to remove custom domains.

## Product decision

| Choice                 | Decision                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| Feature fate           | **Keep + finish** custom domains                                   |
| v1 browser→API surface | **Public only** — portfolio + public repos/GitHub chrome           |
| Dashboard / sign-in    | Stay on **primary** `VITE_WEB_URL` (existing policy)               |
| Origin allow mechanism | **Dynamic verified DB lookup + short cache** (plus static primary) |
| TLS                    | Still **operator-owned** (no ACME in app)                          |

## Goals

1. From a **verified** custom domain Origin, credentialed CORS preflight and RPC to the API succeed for **public** procedures.
2. Better Auth `trustedOrigins` uses the **same** allow rules as Hono CORS (no drift).
3. No redeploy when a user verifies a domain.
4. Primary origin remains always allowed; loopback peer behavior for local dev is preserved.

## Non-goals (v1)

- Dashboard, settings, or sign-in on custom Host
- Owner-only / private GitHub extras on custom origin as a requirement
- Expanding **files-gateway**, **Mastra agent CORS**, or tightening Socket.IO in this epic
- Multiple custom domains per user (keep existing one-row-per-user)
- Auto www/apex aliasing of primary host
- New env vars (no `CORS_EXTRA_ORIGINS` required for the product path)

## Origin allow rules

| Origin                                                                     | Allow?                             |
| -------------------------------------------------------------------------- | ---------------------------------- |
| Origin of `VITE_WEB_URL`                                                   | Always                             |
| Loopback peers of primary when primary hostname is loopback (existing)     | Always                             |
| Origin whose hostname is **`user_custom_domain` with `status = verified`** | Yes — echo exact Origin            |
| Pending / failed custom domain                                             | No                                 |
| Primary hostname registered as custom domain                               | Already blocked by domain settings |
| Arbitrary third parties                                                    | No                                 |

**Matching**

- Parse `Origin` → hostname with `normalizeHostname` from `@tsu-stack/core`.
- Echo the **exact** Origin string when allowed (required for `credentials: true`).
- Empty / missing Origin: no `Access-Control-Allow-Origin` (unchanged).

**Cache**

- In-process map, key = Origin (or scheme + normalized host), value = allow/deny.
- TTL ≈ **60s**.
- **`invalidateAllowedOriginCache(hostnameOrOrigin?)`:** omit arg → **clear entire map**; with arg → drop entries for that hostname/Origin only.
- Multi-instance: invalidation is **best-effort per process**; other instances rely on TTL (≤60s). No Redis pub/sub required for v1.
- **Invalidate** on domain verify / fail / remove / upsert (hostname change) so new domains work without waiting for TTL on the mutating instance.

## Current config audit

| Touchpoint                       | Today                                   | v1 action                         |
| -------------------------------- | --------------------------------------- | --------------------------------- |
| `apps/server` Hono CORS          | Static `VITE_WEB_URL` (+ loopback) only | **Fix** — use shared helper       |
| Better Auth `trustedOrigins`     | `[webOrigin]` only                      | **Fix** — dynamic via same helper |
| Host → portfolio resolution      | `findVerifiedByHostname`                | Keep                              |
| Domain settings (claim primary)  | Rejects primary host                    | Keep                              |
| `files-gateway` `allowedOrigins` | Primary only                            | **No change** (dashboard uploads) |
| Mastra agent CORS                | Primary only                            | **No change**                     |
| Socket.IO github-gateway         | `origin: "*"`                           | **No change** this epic           |

### Ops (required, not code-only)

Shared helper **adds** verified custom hosts on top of a correct primary. Deploy must set:

1. **`VITE_WEB_URL`** = primary app origin users actually open (exact origin; avoid silent `www` mismatch).
2. **`VITE_SERVER_URL`** = public API origin browsers call.
3. After ship: `OPTIONS` with `Origin: https://<verified-custom>` returns  
   `Access-Control-Allow-Origin: <that origin>` and `Access-Control-Allow-Credentials: true`.

Production symptoms where **even** the primary Origin gets no ACAO usually mean empty/wrong `VITE_WEB_URL` on the API process — fix env, not only code.

## Shared helper (single source of truth)

### Placement (conventions)

| Convention      | Choice                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Package         | **`packages/auth`** — origin trust is auth/session-adjacent; server already imports auth; **auth must not import api** (api depends on auth). |
| File style      | Flat module like `invite-cookie.ts` / `profile-name.ts`: `packages/auth/src/allowed-browser-origin.ts`                                        |
| Pure host parse | Reuse `normalizeHostname` in `@tsu-stack/core` (not duplicated).                                                                              |
| DB              | Only `userCustomDomainRepository.findVerifiedByHostname`.                                                                                     |
| Env             | `VITE_WEB_URL` via existing `@tsu-stack/env/server` — **no new env keys**.                                                                    |
| Exports         | Re-export from `packages/auth/src/index.ts` for `@tsu-stack/auth` consumers.                                                                  |

### API shape

```ts
/** Static primary (+ loopback peers when applicable). */
buildStaticAllowedOrigins(webUrl: string): Set<string>

/** Echo Origin if allowed; null if denied. */
resolveAllowedBrowserOrigin(origin: string): Promise<string | null>

/** Better Auth: primary list + request Origin when verified custom domain. */
resolveTrustedOriginsForRequest(request?: Request): Promise<string[]>

/** Best-effort cache bust after domain mutations. */
invalidateAllowedOriginCache(hostnameOrOrigin?: string): void
```

### DB access note

CORS may run **outside** `runWithDb`. `getDb()` already falls back to the PG singleton when ALS is unset — acceptable for this **read-only** verified-host check. Document in code comment; do not invent a second pool.

**Fail-closed:** if hostname parse fails or the verified-domain lookup throws, `resolveAllowedBrowserOrigin` returns **`null`** (deny). Never throw out of the CORS `origin` callback in a way that turns every preflight into a 500.

### Dependency direction (unchanged)

```text
apps/server → auth, api, db, env
packages/api → auth, db, core, env   (invalidate via auth export)
packages/auth → core, env, db
```

## Wire-up

| Consumer                    | Change                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/app.ts`    | `cors({ origin: (o) => resolveAllowedBrowserOrigin(o), credentials: true, … })`; **delete** local `buildAllowedOrigins` / static `allowedOrigins` |
| `packages/auth/src/auth.ts` | `trustedOrigins: (request) => resolveTrustedOriginsForRequest(request)`                                                                           |
| Domain router mutations     | Call `invalidateAllowedOriginCache` after verify / fail / remove / upsert                                                                         |
| files / mastra / socket     | Out of scope                                                                                                                                      |

## Request flow

```text
Browser on https://custom.example
  → OPTIONS/POST https://api…/rpc/…
  → Hono cors → resolveAllowedBrowserOrigin(Origin)
       1. static primary (VITE_WEB_URL)
       2. else verified custom hostname
       3. cache; echo Origin if allow
  → oRPC (existing Host / profileName resolution)
```

## Edge cases

| Case                                   | Behavior                            |
| -------------------------------------- | ----------------------------------- |
| Wrong primary `VITE_WEB_URL` in deploy | Static deny; fix ops                |
| Pending / failed domain                | Deny                                |
| Just verified                          | Invalidate on markVerified          |
| Removed / re-pending                   | Invalidate; deny                    |
| Invalid Origin                         | null / deny                         |
| Credentialed CORS                      | Never `*`; always echo exact Origin |

## Implementation plan (checklist)

1. **`packages/auth/src/allowed-browser-origin.ts`** + export from **`packages/auth/src/index.ts`**
2. **`packages/auth/src/auth.ts`** — dynamic `trustedOrigins` via helper
3. **`apps/server/src/app.ts`** — CORS uses helper; remove local `buildAllowedOrigins` duplicate
4. **`packages/api` domain router** — `invalidateAllowedOriginCache` on verify / fail / remove / upsert
5. **`.agents/auth.md`** + brief **`CONTEXT.md`** note (browser API needs origin trust, not only Host routing)
6. **This spec** under `docs/superpowers/specs/` (this file)

Optional follow-up (not blocking v1): unit tests next to the helper for static allow, verified allow, pending deny, cache invalidation.

## Verification

1. Unit (recommended): static primary; verified host; pending deny; invalid origin; cache.
2. Curl after deploy: custom Origin preflight includes ACAO + credentials.
3. Browser: custom domain portfolio + repos — no CORS errors on public oRPC.
4. Regression: primary path portfolio; dashboard primary-only; files still primary-only.

## Docs updates (same change set)

- **`.agents/auth.md` Gotchas:** custom domain Origins must be allowed via shared helper (CORS + `trustedOrigins`); primary `VITE_WEB_URL` must match the real primary origin.
- **`CONTEXT.md` (Custom domain):** Host routing alone is insufficient for browser oRPC — API origin trust for verified hostnames is required.

## Success criteria

- [ ] Public portfolio and public repos work from a verified custom domain without CORS console errors.
- [ ] Primary origin still allowed; local loopback peers still work in dev.
- [ ] Newly verified domain works without process restart (invalidate or ≤60s TTL).
- [ ] CORS and Better Auth cannot drift (one helper).
- [ ] No expansion of files/agent CORS for custom domains in this epic.
