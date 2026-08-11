# Security Test Ladder Implementation Plan

> **For agentic workers:** Execute on `main` (no PR). Steps use checkbox syntax.

**Goal:** Ship three high-value security unit suites for portfolio resolution, public GitHub surface, and invite code order.

**Architecture:** Mocked-repo unit tests for resolve-context; extend pure github helpers; extract pure invite resolution for auth.

**Tech Stack:** Vite+, Vitest (`vp test run`), vi.mock for `@tsu-stack/db`

**Spec:** `docs/superpowers/specs/2026-08-11-security-test-ladder-design.md`

---

### Task 1: Wire `@tsu-stack/api` unit tests

**Files:**

- Create: `packages/api/vite.config.ts`
- Modify: `packages/api/package.json`

- [ ] Add `test:unit`: `vp test run` and `vite-plus` devDependency
- [ ] vite.config include: `**/__tests__/**/*.test.ts`, `**/*.test.ts`

### Task 2: Phase 1 — resolvePublicPortfolioContext

**Files:**

- Create: `packages/api/src/lib/public-portfolio/__tests__/resolve-context.test.ts`

- [ ] Mock user / custom-domain / alias repos
- [ ] Table cases for Host, path, alias, session, fail-closed wrong slug
- [ ] Run `pnpm --filter @tsu-stack/api test:unit`

### Task 3: Phase 2 — public-repo-access gaps

**Files:**

- Modify: `packages/github/src/shared/public-repo-access.test.ts`
- Modify: `packages/github/package.json` (+ vite.config if needed)

- [ ] Tests for assertRepoVisibleOnPublicSurface + withPublicGithubClient
- [ ] Add `test:unit` script

### Task 4: Phase 3 — invite extraction + tests

**Files:**

- Create: `packages/auth/src/invite-code.ts` (pure extract)
- Modify: `packages/auth/src/auth.ts`, `packages/auth/src/index.ts`, `packages/auth/src/invite-cookie.ts` if needed
- Create: `packages/auth/src/invite-code.test.ts` (or co-located)

- [ ] Extract pure source order
- [ ] Wire auth.ts to use it
- [ ] Cookie + extract tests
- [ ] Run auth unit suite

### Task 5: Verify + commit

- [ ] `pnpm test:unit:run` (or per-package)
- [ ] Commit on main
