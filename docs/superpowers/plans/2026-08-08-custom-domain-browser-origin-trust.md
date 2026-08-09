# Custom Domain Browser Origin Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow browser clients on verified custom domains (and the primary `VITE_WEB_URL` origin) to call the API with credentialed CORS, using one shared origin-trust helper for Hono CORS and Better Auth `trustedOrigins`.

**Architecture:** Add `packages/auth/src/allowed-browser-origin.ts` as the single allow/deny policy (static primary origins + `userCustomDomainRepository.findVerifiedByHostname`, fail-closed, ~60s in-process cache with explicit invalidation). Wire Hono CORS and Better Auth to that helper; invalidate the cache from domain router mutations.

**Tech Stack:** Hono `cors`, Better Auth `trustedOrigins` (async function), `@tsu-stack/db` `userCustomDomainRepository`, `@tsu-stack/core` `normalizeHostname`, Vitest for unit tests.

**Spec:** [docs/superpowers/specs/2026-08-08-custom-domain-browser-origin-trust-design.md](../specs/2026-08-08-custom-domain-browser-origin-trust-design.md)

## Global Constraints

- No new env vars.
- Auth must not import `@tsu-stack/api`.
- Fail-closed: lookup/parse errors → deny (`null`), never throw from CORS `origin` callback.
- `credentials: true` → echo exact Origin string, never `*`.
- files-gateway / Mastra / Socket.IO CORS: **do not change**.
- Dashboard/sign-in remain primary-host only (no product change).
- Multi-instance cache invalidation is best-effort; other processes rely on ≤60s TTL.
- Follow monorepo conventions: flat auth modules, export from `@tsu-stack/auth` index, `#@/` only inside packages.

## File map

| File                                                      | Responsibility                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Create `packages/auth/src/allowed-browser-origin.ts`      | Static origins, resolve Origin, trustedOrigins list, cache invalidate |
| Create `packages/auth/src/allowed-browser-origin.test.ts` | Unit tests (vitest)                                                   |
| Modify `packages/auth/src/index.ts`                       | Re-export helper API                                                  |
| Modify `packages/auth/src/auth.ts`                        | Dynamic `trustedOrigins`                                              |
| Modify `packages/auth/package.json`                       | `test:unit` + vitest (if missing)                                     |
| Modify `apps/server/src/app.ts`                           | CORS uses helper; delete local `buildAllowedOrigins`                  |
| Modify `packages/api/src/routers/domain.router.ts`        | Invalidate cache on set/verify/remove paths that change trust         |
| Modify `.agents/auth.md`                                  | Gotcha: origin trust for custom domains                               |
| Modify `CONTEXT.md`                                       | One sentence under Custom domain                                      |

---

### Task 1: Shared origin-trust helper + unit tests

**Files:**

- Create: `packages/auth/src/allowed-browser-origin.ts`
- Create: `packages/auth/src/allowed-browser-origin.test.ts` (co-located `*.test.ts` — do **not** copy core’s vitest `include` that only matches `__tests__/`, or tests will never run)
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/auth/package.json` (auth has **no** `scripts` today — add full `"scripts": { "test:unit": "vp test" }` and `vite-plus` in `devDependencies` like `@tsu-stack/core`; run install so `vp` resolves)

**Interfaces:**

- Produces:
  - `buildStaticAllowedOrigins(webUrl: string): Set<string>`
  - `resolveAllowedBrowserOrigin(origin: string): Promise<string | null>`
  - `resolveTrustedOriginsForRequest(request?: Request): Promise<string[]>`
  - `invalidateAllowedOriginCache(hostnameOrOrigin?: string): void`

- [ ] **Step 1: Add test file with pure static-origin cases**

```ts
// packages/auth/src/allowed-browser-origin.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildStaticAllowedOrigins,
  invalidateAllowedOriginCache,
  resolveAllowedBrowserOrigin
} from "./allowed-browser-origin";

describe("buildStaticAllowedOrigins", () => {
  it("includes the VITE_WEB_URL origin", () => {
    const set = buildStaticAllowedOrigins("https://app.example.com");
    expect(set.has("https://app.example.com")).toBe(true);
  });

  it("adds loopback peers when primary is localhost", () => {
    const set = buildStaticAllowedOrigins("http://localhost:3000");
    expect(set.has("http://localhost:3000")).toBe(true);
    expect(set.has("http://127.0.0.1:3000")).toBe(true);
  });

  it("returns empty set for invalid webUrl", () => {
    expect(buildStaticAllowedOrigins("not-a-url").size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
cd packages/auth && pnpm exec vp test src/allowed-browser-origin.test.ts
```

Expected: fail to resolve module / no test script — proceed to implement helper + package script.

- [ ] **Step 3: Implement helper**

Create `packages/auth/src/allowed-browser-origin.ts`:

```ts
import { normalizeHostname } from "@tsu-stack/core";
import { userCustomDomainRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const CACHE_TTL_MS = 60_000;

type CacheEntry = { allowed: boolean; expiresAt: number };
const originCache = new Map<string, CacheEntry>();

export function buildStaticAllowedOrigins(webUrl: string): Set<string> {
  const origins = new Set<string>();
  try {
    const web = new URL(webUrl);
    origins.add(web.origin);
    if (LOOPBACK_HOSTS.has(web.hostname)) {
      for (const host of LOOPBACK_HOSTS) {
        if (host.startsWith("[")) continue;
        origins.add(`${web.protocol}//${host}${web.port ? `:${web.port}` : ""}`);
      }
    }
  } catch {
    // invalid URL → empty static set
  }
  return origins;
}

const staticAllowedOrigins = buildStaticAllowedOrigins(ENV_SERVER.VITE_WEB_URL);

/**
 * Best-effort per-process cache. Omit arg → clear all.
 * With hostname or Origin → drop matching entries only.
 * Multi-instance: other processes rely on TTL ≤ 60s.
 */
export function invalidateAllowedOriginCache(hostnameOrOrigin?: string): void {
  if (!hostnameOrOrigin) {
    originCache.clear();
    return;
  }
  let hostKey = hostnameOrOrigin.trim().toLowerCase();
  try {
    if (hostnameOrOrigin.includes("://")) {
      hostKey = normalizeHostname(new URL(hostnameOrOrigin).host);
    } else {
      hostKey = normalizeHostname(hostnameOrOrigin);
    }
  } catch {
    hostKey = hostnameOrOrigin.trim().toLowerCase();
  }
  for (const key of originCache.keys()) {
    try {
      const h = normalizeHostname(new URL(key).host);
      if (h === hostKey || key === hostnameOrOrigin) {
        originCache.delete(key);
      }
    } catch {
      if (key === hostnameOrOrigin) originCache.delete(key);
    }
  }
}

/**
 * Fail-closed: parse/DB errors → null (deny). Never throw for CORS origin callback.
 * CORS may run outside runWithDb — getDb() singleton fallback is OK for this read.
 */
export async function resolveAllowedBrowserOrigin(origin: string): Promise<string | null> {
  if (!origin) return null;

  const cached = originCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed ? origin : null;
  }

  try {
    if (staticAllowedOrigins.has(origin)) {
      originCache.set(origin, { allowed: true, expiresAt: Date.now() + CACHE_TTL_MS });
      return origin;
    }

    const hostname = normalizeHostname(new URL(origin).host);
    if (!hostname) {
      originCache.set(origin, { allowed: false, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const row = await userCustomDomainRepository.findVerifiedByHostname(hostname);
    const allowed = Boolean(row);
    originCache.set(origin, { allowed, expiresAt: Date.now() + CACHE_TTL_MS });
    return allowed ? origin : null;
  } catch {
    return null;
  }
}

export async function resolveTrustedOriginsForRequest(request?: Request): Promise<string[]> {
  const origins = [...staticAllowedOrigins];
  const header = request?.headers.get("origin");
  if (!header) return origins;

  const allowed = await resolveAllowedBrowserOrigin(header);
  if (allowed && !origins.includes(allowed)) {
    origins.push(allowed);
  }
  return origins;
}
```

- [ ] **Step 4: Export from index**

In `packages/auth/src/index.ts`, add:

```ts
export {
  buildStaticAllowedOrigins,
  invalidateAllowedOriginCache,
  resolveAllowedBrowserOrigin,
  resolveTrustedOriginsForRequest
} from "./allowed-browser-origin";
```

- [ ] **Step 5: Add test tooling to auth package**

`packages/auth/package.json` currently has no `scripts` key. Add:

```json
"scripts": {
  "test:unit": "vp test"
}
```

Under `devDependencies`, add `"vite-plus": "catalog:"` (same as `packages/core`). Run workspace install so `vp` resolves.

Do **not** add a vitest config that only includes `**/__tests__/**/*.test.ts` — co-located `allowed-browser-origin.test.ts` must be picked up by default globs.

- [ ] **Step 6: Extend tests for fail-closed + cache invalidate; mock db**

Add to the test file (mock `@tsu-stack/db` before importing if needed — or use `vi.mock`):

```ts
vi.mock("@tsu-stack/db", () => ({
  userCustomDomainRepository: {
    findVerifiedByHostname: vi.fn()
  }
}));

import { userCustomDomainRepository } from "@tsu-stack/db";

afterEach(() => {
  invalidateAllowedOriginCache();
  vi.clearAllMocks();
});

describe("resolveAllowedBrowserOrigin", () => {
  it("denies empty origin", async () => {
    expect(await resolveAllowedBrowserOrigin("")).toBeNull();
  });

  it("allows verified custom domain origin", async () => {
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockResolvedValue({
      id: "1",
      userId: "u",
      hostname: "portfolio.example.com",
      status: "verified",
      verificationToken: "t",
      verifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as never);

    await expect(resolveAllowedBrowserOrigin("https://portfolio.example.com")).resolves.toBe(
      "https://portfolio.example.com"
    );
  });

  it("denies when repository throws (fail-closed)", async () => {
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockRejectedValue(
      new Error("db down")
    );
    await expect(resolveAllowedBrowserOrigin("https://other.example.com")).resolves.toBeNull();
  });

  it("clear-all invalidation drops cached deny", async () => {
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockResolvedValue(null);
    await resolveAllowedBrowserOrigin("https://soon.example.com");
    vi.mocked(userCustomDomainRepository.findVerifiedByHostname).mockResolvedValue({
      hostname: "soon.example.com",
      status: "verified"
    } as never);
    // still cached deny until invalidate
    await expect(resolveAllowedBrowserOrigin("https://soon.example.com")).resolves.toBeNull();
    invalidateAllowedOriginCache();
    await expect(resolveAllowedBrowserOrigin("https://soon.example.com")).resolves.toBe(
      "https://soon.example.com"
    );
  });
});
```

Note: static primary allow tests may depend on `ENV_SERVER.VITE_WEB_URL` at import time for `resolveAllowedBrowserOrigin` static path — prefer testing `buildStaticAllowedOrigins` for primary cases; for resolve, rely on mock custom domain path.

- [ ] **Step 7: Run tests — expect PASS**

```bash
cd packages/auth && pnpm test:unit
```

Expected: all tests green.

- [ ] **Step 8: Commit**

```bash
git add packages/auth/src/allowed-browser-origin.ts \
  packages/auth/src/allowed-browser-origin.test.ts \
  packages/auth/src/index.ts \
  packages/auth/package.json
git commit -m "feat(auth): shared browser origin trust helper for custom domains"
```

---

### Task 2: Wire Better Auth trustedOrigins

**Files:**

- Modify: `packages/auth/src/auth.ts` (replace `trustedOrigins: [webOrigin]`)

**Interfaces:**

- Consumes: `resolveTrustedOriginsForRequest` from `./allowed-browser-origin`

- [ ] **Step 1: Update auth config**

Near the existing import block, add:

```ts
import { resolveTrustedOriginsForRequest } from "./allowed-browser-origin";
```

Replace:

```ts
trustedOrigins: [webOrigin],
```

with:

```ts
trustedOrigins: async (request) => resolveTrustedOriginsForRequest(request),
```

Keep `webOrigin` if still used elsewhere in the file (verify callbacks). Do not remove unrelated logic.

- [ ] **Step 2: Typecheck auth package**

```bash
pnpm exec tsc -p packages/auth --noEmit
```

Expected: no errors on `trustedOrigins` signature (Better Auth accepts `string[] | ((request?: Request) => string[] | Promise<string[]>)`).

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/auth.ts
git commit -m "feat(auth): dynamic trustedOrigins for verified custom domains"
```

---

### Task 3: Wire Hono CORS on the API server

**Files:**

- Modify: `apps/server/src/app.ts`

**Interfaces:**

- Consumes: `resolveAllowedBrowserOrigin` from `@tsu-stack/auth`

- [ ] **Step 1: Replace local allowlist with shared helper**

Remove `LOOPBACK_HOSTS`, `buildAllowedOrigins`, and `allowedOrigins` constants (lines ~41–61 today).

Add import:

```ts
import { resolveAllowedBrowserOrigin } from "@tsu-stack/auth";
```

Set cors options:

```ts
const corsOptions: NonNullable<Parameters<typeof cors>[0]> = {
  allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "x-evlog-source"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  origin: (origin: string) => resolveAllowedBrowserOrigin(origin)
};
```

Keep existing `app.use("*", … cors …)` and `app.options("*", …)` middleware registration unchanged.

- [ ] **Step 2: Typecheck server**

```bash
pnpm exec tsc -p apps/server --noEmit
```

Expected: pass (async origin callback is supported by Hono cors).

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "fix(server): CORS allows verified custom domain origins"
```

---

### Task 4: Invalidate cache on domain mutations

**Files:**

- Modify: `packages/api/src/routers/domain.router.ts`

**Interfaces:**

- Consumes: `invalidateAllowedOriginCache` from `@tsu-stack/auth`

- [ ] **Step 1: Import invalidator**

```ts
import { invalidateAllowedOriginCache } from "@tsu-stack/auth";
```

- [ ] **Step 2: Call after mutations that change trust**

After successful **set** (upsert resets to pending — clear **previous and new** host trust):

```ts
const previous = await userCustomDomainRepository.findByUserId(userId);
const row = await userCustomDomainRepository.upsertForUser({/* existing args */});
if (previous?.hostname) {
  invalidateAllowedOriginCache(previous.hostname);
}
invalidateAllowedOriginCache(row.hostname);
return toDomainOutput(row);
```

(If previous === new hostname, double-invalidate is fine / cheap.)

After **verify** success:

```ts
const verified = await userCustomDomainRepository.markVerified(userId);
if (!verified) {
  throw errors.DOMAIN_NOT_SET();
}
invalidateAllowedOriginCache(verified.hostname);
return toDomainOutput(verified);
```

After **verify** DNS failure (`markFailed`):

```ts
await userCustomDomainRepository.markFailed(userId);
invalidateAllowedOriginCache(current.hostname);
throw errors.DNS_NOT_VERIFIED();
```

After **remove** success:

```ts
const current = await userCustomDomainRepository.findByUserId(context.session.user.id);
const removed = await userCustomDomainRepository.remove(context.session.user.id);
if (!removed) {
  throw errors.DOMAIN_NOT_SET();
}
if (current?.hostname) {
  invalidateAllowedOriginCache(current.hostname);
}
return { success: true };
```

Note: for remove, load hostname **before** delete if not already loaded (adjust handler to match existing structure with minimal churn).

- [ ] **Step 3: Typecheck api package**

```bash
pnpm exec tsc -p packages/api --noEmit
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/domain.router.ts
git commit -m "fix(api): bust origin trust cache on custom domain mutations"
```

---

### Task 5: Docs (auth gotcha + glossary)

**Files:**

- Modify: `.agents/auth.md` (Gotchas section)
- Modify: `CONTEXT.md` (Custom domain bullet)

- [ ] **Step 1: Auth gotcha**

Append under Gotchas in `.agents/auth.md`:

```markdown
- **Custom domain browser → API:** Host routing alone is not enough. Verified custom domain Origins must pass API CORS and Better Auth `trustedOrigins` via `resolveAllowedBrowserOrigin` / `resolveTrustedOriginsForRequest` in `@tsu-stack/auth` (`allowed-browser-origin.ts`). Primary `VITE_WEB_URL` must match the real primary origin exactly. files-gateway / Mastra CORS stay primary-only.
```

- [ ] **Step 2: CONTEXT.md**

Under **Custom domain**, add after the existing sentences:

```markdown
Browser oRPC from that host requires API origin trust (verified hostname in CORS / Better Auth), not only Host → userId routing.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/auth.md CONTEXT.md
git commit -m "docs: custom domain origin trust for CORS and auth"
```

---

### Task 6: Manual verification checklist

No code. Operator / implementer after deploy or local stack:

- [ ] **Step 1: Primary origin preflight**

```bash
curl -sI -X OPTIONS "$VITE_SERVER_URL/rpc/github/getSetupStatus" \
  -H "Origin: $(node -e "console.log(new URL(process.env.VITE_WEB_URL).origin)")" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected: `access-control-allow-origin` echoes primary origin; `access-control-allow-credentials: true`.

- [ ] **Step 2: Verified custom domain preflight**

```bash
curl -sI -X OPTIONS "$VITE_SERVER_URL/rpc/github/getSetupStatus" \
  -H "Origin: https://<verified-custom-hostname>" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected: ACAO echoes that Origin.

- [ ] **Step 3: Pending / unknown origin**

```bash
curl -sI -X OPTIONS "$VITE_SERVER_URL/rpc/github/getSetupStatus" \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST"
```

Expected: **no** `access-control-allow-origin` (or not evil.example).

- [ ] **Step 4: Browser**

Open verified custom domain portfolio + repos; confirm no CORS errors on public oRPC in console.

- [ ] **Step 5: Regression**

Primary path portfolio and dashboard still work; file upload from dashboard still works (primary origin).

---

## Spec coverage (self-check)

| Spec requirement                                       | Task                  |
| ------------------------------------------------------ | --------------------- |
| Shared helper in packages/auth                         | Task 1                |
| Dynamic trustedOrigins                                 | Task 2                |
| Hono CORS uses helper; delete local builder            | Task 3                |
| Invalidate on domain mutations                         | Task 4                |
| .agents/auth.md + CONTEXT.md                           | Task 5                |
| Fail-closed / cache semantics                          | Task 1 implementation |
| No files/mastra/socket changes                         | Global Constraints    |
| Ops / curl verification                                | Task 6                |
| Unit tests (static, verified, fail-closed, invalidate) | Task 1                |

## Placeholder scan

No TBD/TODO placeholders in task steps.
