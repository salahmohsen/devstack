# Resend-only career mail hardening

## Contract

Gmail has no runtime integration: no OAuth mail scopes requested by the app, API sync/watch procedures, MCP methods, push route, worker, or connection controls. Career mail sends require the authenticated tenant's saved Resend key and career address. Inbound requires that tenant's key, enabled inbox, and webhook signing secret. Email remains optional.

Settings and onboarding share the existing Resend configuration component and tenant mail-settings API. Replies, outreach, apply-package sends, and the agent reply tool use the checked send helpers. Google basic sign-in and operator-funded authentication/product notifications remain separate.

## Evidence

- Executed the actual API sender and agent sender with stubbed persistence/decryption and HTTP delivery. Eight checks per sender: no settings, corrupt key, blank key, missing sender, invalid recipient, successful tenant-owned delivery with attachment and HTML escaping, provider failure, and a second tenant without credentials. Platform credentials were present throughout; absent tenant credentials produced no network request.
- Executed the actual inbound handler with real HMAC signature verification and stubbed persistence/content fetching. Eight checks: unknown token, disabled inbox, missing user key, missing signing secret, missing signature headers, invalid signature, valid tenant-scoped ingestion, and wrong recipient. Invalid requests performed no content fetch or insert.
- The controlled loop passed 24 checks. Command: `node --experimental-vm-modules /tmp/devstack-resend-only-harness.mjs` (session-local harness; no real mail sent).
- Generated `packages/db/migrations/20261104180116_simple_firedrake/migration.sql`: only `DROP TABLE "user_gmail_sync"`. Executed successfully against a verified localhost database inside `BEGIN` / `ROLLBACK`; no user data deleted. The migration remains unapplied.
- Server production build passed. Web production build passed with `packages/env/.env` loaded; direct invocation initially lacked required Vite URL variables.
- Package checks: API, agent, DB, web, core, env, and MCP passed. Existing warnings remain in API, agent, DB, web, and core; env and MCP reported none.
- Workspace format/lint/typecheck passed: `vp run -w fix -- apps packages scripts .agents/mcp.md .github/README.md PRODUCT.md docker-compose.yml` reported zero errors and 113 existing warnings. The unscoped initial run was stopped after several minutes without a result; explicit workspace paths avoided unrelated nested worktrees.
- React Doctor changed-scope scan reported no new issues. Impeccable detector returned an empty findings list for the connection controls, onboarding connection step, and Resend configuration component.
- `bash -n scripts/dev.sh` and `git diff --check` passed.

## Boundaries and gaps

- Existing imported Gmail messages retain their historical provider tag and remain readable; historical migration snapshots are preserved.
- UI was compiled and mechanically checked. No browser interaction was performed.
- No API or agent service was listening locally, so authenticated HTTP, live agent auth, and end-to-end delivery were not exercised. Tenant boundaries were checked at the actual sender/handler seam with controlled dependencies.
- No external Google grants, Pub/Sub subscriptions, running Redis jobs, production configuration, or deployment was changed.
- The unrelated pre-existing `docker-compose.infra.yml` change is outside this task.

## Lesson

Added “Provider removal includes every delivery fallback” to the AI feature harness lessons.

## PR review follow-up

- Reproduced missing Resend setup during loading/error and the enabled sole-login disconnect using a controlled server render of the actual connection component. The same render harness now passes all four states (loading, error, sole login, alternative login); dependencies and UI primitives are stubbed, so browser interaction remains unverified.
- Added a shared `canDisconnect` field computed from the authenticated user's account count. Google and GitHub controls now disable sole-login removal and explain why; the API's final-account guard remains authoritative.
- Reproduced inbound content-fetch failure returning 200 before the fix. Added two API regression tests: unavailable content returns 503 without persistence and a later retry saves its body; a successfully fetched email with legitimately empty content remains accepted. Both tests pass.
- Corrected the README's obsolete multi-board discovery copy after verifying the single Freehire implementation.
- Re-ran the 24 controlled mail checks and focused format/lint/type checks: passed. Server and web production builds passed again. React Doctor reported no new issues; the UI detector returned no findings.
