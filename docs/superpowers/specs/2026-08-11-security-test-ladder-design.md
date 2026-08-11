# Security test ladder design

**Date:** 2026-08-11  
**Status:** Confirmed (work on `main`, no PR)

## Goal

Harden tenant isolation and security with a **small, high-value** unit test program. Prefer public contracts, table-driven cases, and mocked I/O. Avoid low-value coverage and e2e for this program.

## Priority

Tenant isolation / security, starting at public portfolio resolution (`Host` + `profileName` → `userId`).

## Non-goals

- Playwright / e2e
- Component / snapshot tests
- Career CRM, mail, AI feature suites
- Full Better Auth or oRPC handler integration matrices
- Exhaustive branch coverage of every router

## Phases (~8–15 cases each)

### Phase 1 — Public portfolio resolution

**Unit under test:** `packages/api/src/lib/public-portfolio/resolve-context.ts`

**Style:** Unit tests with mocked `userRepository`, `userCustomDomainRepository`, `profileSlugAliasRepository`.

**Cases (required):**

1. Verified custom-domain Host resolves that tenant (`mode: "custom_domain"`).
2. Unverified / unknown Host is ignored (falls through).
3. Path: live `profileName`, slug alias, invalid/reserved slug → null, unknown slug → null.
4. Explicit wrong slug never falls back to `sessionUserId` (security-critical).
5. Session fallback only when Host/path do not match.

**Infra:** Add Vite+ unit test wiring to `@tsu-stack/api` (`test:unit`, `vite.config.ts`).

### Phase 2 — Private never leaks on public GitHub surface

**Unit under test:** `packages/github/src/shared/public-repo-access.ts` (extend existing tests).

**Cases:** Existing cache-suffix / reject helpers plus:

- `assertRepoVisibleOnPublicSurface` no-ops on private surface; rejects private repo on public surface.
- `withPublicGithubClient` retries anonymous only on public surface + auth error.
- Synthetic 404 status recognized for not-found path.

**Infra:** Add `test:unit` to `@tsu-stack/github` if missing so monorepo suite picks it up.

### Phase 3 — Invite code resolution order

**Units:** Cookie helpers (existing exports) + pure invite-code extraction.

**Production change allowed:** Extract pure resolution helpers from private `extractInviteCode` in `auth.ts` into a testable module (behavior-preserving).

**Cases:**

- body `inviteCode` wins over cookie and OAuth state
- cookie / Cookie header when body missing
- OAuth state last
- fail-closed when all sources missing
- cookie serialize/read round-trip and clear cookie

## Conventions

- Location: package-local `__tests__/` or co-located `*.test.ts` matching nearby package style
- Runner: Vite+ (`vp test run`), not standalone Vitest config files
- Policy: `.agents/testing.md` — behavior-driven, public contracts, table-driven where useful

## Success criteria

- All three phases green under package `test:unit` / monorepo `test:unit:run`
- No product behavior changes except pure extractions for testability
- Roughly 25–45 tests total across the three phases (including existing Phase 2 base)
