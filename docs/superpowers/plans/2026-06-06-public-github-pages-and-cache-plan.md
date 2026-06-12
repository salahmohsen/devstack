# Public GitHub Pages And Cache Plan Implementation Plan

> Historical planning artifact from 2026-06-06. Treat current code under `packages/github`, `packages/api`, `apps/server`, and `apps/web` as the source of truth when this plan disagrees with the implementation.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port DiffKit's public GitHub profile and repository read experience into `portfolio-v2`, using the existing dashboard-managed GitHub credentials and a durable server-side cache/invalidation system that matches DiffKit's core behavior.

**Architecture:** Keep all GitHub integration logic out of `apps/web` and out of `packages/core`. Create a dedicated `@tsu-stack/github` package that owns GitHub API access, durable cache reads/writes, webhook invalidation, and public read services. Expose those reads through new public oRPC routes in `packages/api`, then consume them from feature-owned query modules in `apps/web`. Reuse the existing `app_settings` dashboard flow as the owner-managed credential source, but treat it as a single-owner public source and degrade gracefully when no GitHub config is present.

**Tech Stack:** Cloudflare Workers, Hono, oRPC, TanStack Start, TanStack Query, Drizzle ORM, Neon Postgres, Cloudflare KV, GitHub REST + GraphQL APIs.

---

## Review Corrections Added On 2026-06-06

This review found five implementation gaps in the first draft and resolves them in the tasks below:

- `packages/github` must explicitly add GitHub API dependencies. `portfolio-v2` does not currently depend on Octokit.
- Worker bindings must be passed from `apps/server` through request context into `packages/api` and `packages/github`; do not rely on implicit `cloudflare:workers` globals inside a generic package.
- `/` is the canonical public profile page for the configured owner. `/$owner` is optional as a shareable alias and must not become a multi-user public profile system by accident.
- DiffKit-style live updates require both a Durable Object binding and a Worker-level WebSocket intercept before the Hono/oRPC fallback.
- Webhook invalidation only works for events GitHub actually sends to this app. The implementation must define the supported webhook event set and document any manual setup required for the configured account/repositories.

## Source Extraction Rule

Extract the GitHub profile/repository components, data mappers, cache helpers, revalidation helpers, webhook handling ideas, and WebSocket signal-relay behavior from the current DiffKit checkout at `/Users/salah/Developer/diffkit`. Treat DiffKit as the source implementation for behavior and UI composition, then adapt that code to `portfolio-v2` package boundaries, oRPC APIs, Postgres cache tables, and server Worker bindings.

Primary DiffKit source files to inspect during implementation:

- `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/index.tsx`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/$repo/index.tsx`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/components/profile/`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github.functions.ts`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github-cache.ts`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github-cache-policy.ts`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github-revalidation.ts`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/use-github-signal-stream.ts`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/signal-relay.server.ts`
- `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/api/webhooks/github.ts`

Do not invent replacement behavior where DiffKit already has a working implementation. The implementation work is extraction, pruning private/auth-only branches, and adapting to `portfolio-v2` conventions.

## Home Page Replacement Decision

The public root route should stop rendering the current marketing landing page and instead render the GitHub profile page for the configured owner.

Keep the existing navbar shell and controls that already exist in `portfolio-v2`:

- `apps/web/src/features/navbar/config/nav-links.config.ts` already provides the links for `Playground`, `Dashboard`, and `API Docs`
- `apps/web/src/shared/ui/locale-switcher.tsx` already provides the localisation button
- `apps/web/src/shared/ui/theme-switcher.tsx` already provides the theme mode button
- `apps/web/src/features/navbar/ui/user-dropdown.tsx` already provides the user button

That means the home-page work is primarily:

- remove the current marketing sections from `apps/web/src/pages/home/ui/home-page.tsx`
- make the root route render the new public GitHub profile page instead
- keep the current navbar controls, adjusting layout only if the new profile page needs spacing or responsiveness changes

## Current Repo Snapshot

`portfolio-v2` already has the key owner-config pieces:

- Public root mount: `apps/web/src/routes/{-$locale}/(root-layout)/index.tsx`
- Owner-only dashboard shell: `apps/web/src/routes/{-$locale}/(auth)/route.tsx`
- GitHub config screen: `apps/web/src/pages/dashboard/ui/github-config-page.tsx`
- Owner-managed GitHub settings table: `packages/db/src/schema/app-settings.schema.ts`
- Owner-managed GitHub settings API: `packages/api/src/routers/app-settings/index.ts`
- Server API boundary: `apps/server/src/app.ts`
- Worker binding surface: `apps/server/wrangler.jsonc`

What is missing today:

- No dedicated GitHub integration package
- No public GitHub API router
- No GitHub cache tables
- No KV binding for GitHub payload cache
- No webhook invalidation path
- No public profile/repo routes in `apps/web`
- No Octokit dependency in the workspace catalog or package dependencies
- No Worker binding/context path from `apps/server` into `packages/api` procedures

## Package Decision

Create a dedicated package: `packages/github`.

Why this is the right boundary:

- GitHub integration is side-effectful infrastructure: network I/O, cache persistence, webhook invalidation, and secret-backed credential resolution. That does not belong in `packages/core`, which the repo explicitly reserves for pure shared contracts.
- `apps/web` should stay on the repo's standard path: slice-local query wrappers calling typed oRPC routes, not raw GitHub logic.
- `packages/api` should expose transport-safe procedures, not embed GitHub caching internals.
- `portfolio-v2` is expected to grow beyond GitHub. A dedicated `@tsu-stack/github` package keeps the GitHub subsystem isolated so future features can sit beside it instead of being mixed into generic app packages.

Use `packages/core` only for pure shared GitHub enums/schemas if a contract becomes shared across API and UI. Do not start by forcing the whole integration into `core`.

## Cache Parity Target

Match DiffKit's core cache behavior, adapted to `portfolio-v2`'s architecture:

1. Browser cache: React Query in `apps/web`
2. Durable control plane: Postgres tables in `packages/db`
3. Hot payload cache: Cloudflare KV bound to `apps/server`
4. Server-side namespace invalidation: webhook and mutation writes bump durable versions
5. Public reads: local-first cache helper that prefers durable payloads and only hits GitHub when required
6. Graceful quota handling: stale-if-rate-limited behavior

Do **not** start by copying DiffKit's auth-specific or installation-token-specific complexity. The initial public portfolio version uses one configured username and one configured token from `app_settings`.

## File Structure

### Create

- `packages/github/package.json`
- `packages/github/tsconfig.json`
- `packages/github/src/index.ts`
- `packages/github/src/config/public-github-source.ts`
- `packages/github/src/octokit/client.ts`
- `packages/github/src/runtime/bindings.ts`
- `packages/github/src/cache/github-cache-policy.ts`
- `packages/github/src/cache/github-revalidation.ts`
- `packages/github/src/cache/github-cache.ts`
- `packages/github/src/cache/get-github-resource-local-first.ts`
- `packages/github/src/profile/get-user-profile.ts`
- `packages/github/src/profile/get-user-contributions.ts`
- `packages/github/src/profile/get-user-pinned-repos.ts`
- `packages/github/src/profile/get-profile-repos.ts`
- `packages/github/src/profile/get-user-activity.ts`
- `packages/github/src/repo/get-repo-overview.ts`
- `packages/github/src/repo/get-repo-tree.ts`
- `packages/github/src/repo/get-repo-file-content.ts`
- `packages/github/src/webhooks/handle-github-webhook.ts`
- `packages/db/src/schema/github-cache.schema.ts`
- `packages/db/src/repositories/github-cache.repository.ts`
- `packages/api/src/routers/public/index.ts`
- `packages/api/src/routers/public/github/index.ts`
- `apps/web/src/pages/github-profile/api/get-github-profile.query.ts`
- `apps/web/src/pages/github-profile/api/get-github-contributions.query.ts`
- `apps/web/src/pages/github-profile/api/get-github-pinned-repos.query.ts`
- `apps/web/src/pages/github-profile/api/get-github-profile-repos.query.ts`
- `apps/web/src/pages/github-profile/api/get-github-activity.query.ts`
- `apps/web/src/pages/github-profile/ui/github-profile-page.tsx`
- `apps/web/src/pages/github-profile/index.ts`
- `apps/web/src/pages/github-repo/api/get-github-repo-overview.query.ts`
- `apps/web/src/pages/github-repo/api/get-github-repo-tree.query.ts`
- `apps/web/src/pages/github-repo/api/get-github-repo-file-content.query.ts`
- `apps/web/src/pages/github-repo/ui/github-repo-page.tsx`
- `apps/web/src/pages/github-repo/index.ts`
- `apps/web/src/routes/{-$locale}/(root-layout)/$owner/index.tsx`
- `apps/web/src/routes/{-$locale}/(root-layout)/$owner/$repo/index.tsx`

### Modify

- `packages/env/src/server/env.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/schema/relations.ts`
- `packages/db/src/repositories/index.ts`
- `packages/api/package.json`
- `packages/api/src/lib/context/types.ts`
- `packages/api/src/lib/context/hono/create-context.ts`
- `packages/api/src/routers/index.ts`
- `apps/server/package.json`
- `apps/server/wrangler.jsonc`
- `apps/server/src/app.ts`
- `apps/web/src/routes/{-$locale}/(root-layout)/index.tsx`
- `apps/web/src/pages/home/ui/home-page.tsx`
- `apps/web/src/features/navbar/config/nav-links.config.ts` only if labels/order need adjustment
- `apps/web/src/features/navbar/ui/navbar.tsx` only if the new profile root needs navbar layout tweaks
- `pnpm-workspace.yaml`
- `.agents/environment-variables.md`
- `.agents/end-to-end-features.md` if the new package changes the standard feature sequence
- `.github/README.md` if the repo contains deployment/env docs there

### Required Live Update Phase

Because you want to mirror DiffKit's WebSocket behavior immediately, include this phase in the initial implementation:

- `apps/server/src/github-signal-relay.ts`
- `apps/server/src/worker.ts`
- `apps/server/wrangler.jsonc` for Durable Object binding + migration
- `apps/web/src/features/github-live/api/use-github-signal-stream.ts`

---

### Task 1: Establish The Public Owner And Package Boundary

**Files:**

- Create: `packages/github/package.json`
- Create: `packages/github/tsconfig.json`
- Create: `packages/github/src/index.ts`
- Create: `packages/github/src/config/public-github-source.ts`
- Create: `packages/github/src/runtime/bindings.ts`
- Modify: `pnpm-workspace.yaml`
- Modify: `packages/api/package.json`
- Modify: `apps/server/package.json`

- [ ] Add a new workspace package named `@tsu-stack/github` under `packages/github` with the same import/export pattern used by the other packages.
- [ ] Add the GitHub API client dependencies explicitly. `portfolio-v2` does not currently have Octokit; add `octokit` to the workspace catalog or directly to `packages/github/package.json`, and add Worker type support where the server package needs generated Cloudflare bindings.
- [ ] In `packages/github/src/config/public-github-source.ts`, implement a single server-only resolver that reads the configured public GitHub username/token from the existing `app_settings` source.
- [ ] Make that resolver fail closed when `githubUsername` or `githubToken` is missing and return a transport-safe "not configured" result instead of throwing.
- [ ] Keep the source as the existing `app_settings` row for now, because the app is already intentionally single-owner and the dashboard already manages those fields.
- [ ] Do **not** bind public GitHub reads to the current request session. Public reads must resolve the configured owner independently of the visitor.
- [ ] Add `@tsu-stack/github` as a dependency of `packages/api` once the package exists.
- [ ] Add `@tsu-stack/github` as a dependency of `apps/server` only if Worker-level websocket/webhook glue imports package helpers directly.
- [ ] In `packages/github/src/runtime/bindings.ts`, define a small runtime input type for `kv`, `executionContext`, and any Durable Object namespace handles that services need. Keep this type narrow so the package does not depend on global Worker state.

### Task 2: Add Durable GitHub Cache Tables In Postgres

**Files:**

- Create: `packages/db/src/schema/github-cache.schema.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/schema/relations.ts`
- Create: `packages/db/src/repositories/github-cache.repository.ts`
- Modify: `packages/db/src/repositories/index.ts`

- [ ] Add Postgres equivalents for DiffKit's control-plane tables:
  - `github_response_cache`
  - `github_revalidation_signal`
  - `github_cache_namespace`
  - `github_webhook_event`
- [ ] Use Postgres-native column types instead of copying D1 shapes mechanically. Prefer `text`, `jsonb`, `integer`, and `timestamp`/epoch fields consistently with the existing DB style.
- [ ] Keep `github_response_cache` as the durable fallback payload store, even if KV will be the hot path.
- [ ] Expose small repository functions for:
  - reading/writing response cache entries
  - reading/bumping namespace versions
  - recording/marking webhook deliveries
  - clearing GitHub cache when owner config changes
- [ ] Run `vp run db:generate` after the schema work.
- [ ] Check `DATABASE_URL` before running `vp run db:migrate`.
- [ ] Apply the migration with `vp run db:migrate`.

### Task 3: Wire Server Env And Worker Bindings

**Files:**

- Modify: `packages/env/src/server/env.ts`
- Modify: `packages/api/src/lib/context/types.ts`
- Modify: `packages/api/src/lib/context/hono/create-context.ts`
- Modify: `apps/server/wrangler.jsonc`
- Modify: `.agents/environment-variables.md`
- Modify: `.github/README.md`

- [ ] Add server env validation for webhook/cache settings that are genuinely env-owned.
- [ ] Keep the public GitHub token itself in the dashboard-managed `app_settings` flow, not in `ENV_SERVER`, because the repo already chose app-owned settings for that credential.
- [ ] Add at least these server env/binding surfaces:
  - `GITHUB_WEBHOOK_SECRET` in `ENV_SERVER`
  - KV binding `GITHUB_CACHE_KV` in `apps/server/wrangler.jsonc`
  - Durable Object binding `GITHUB_SIGNAL_RELAY` in `apps/server/wrangler.jsonc` for required live updates
- [ ] Extend `OrpcContext` so public oRPC handlers can receive Worker runtime bindings from Hono context. The GitHub package should receive bindings through function arguments/context, not by importing implicit Worker globals.
- [ ] Add both `durable_objects.bindings` and `migrations` entries in `apps/server/wrangler.jsonc` for `GITHUB_SIGNAL_RELAY`; the binding alone is not enough for Cloudflare to deploy the class.
- [ ] Run `vp run --filter @tsu-stack/server cf-typegen` after adding Worker bindings so generated Cloudflare types include KV and Durable Object bindings.
- [ ] Document all new envs and bindings in the repo docs listed in `.agents/environment-variables.md`.
- [ ] Ensure the plan updates every required env surface instead of only the Zod schema.

### Task 4: Port DiffKit's Cache Core Into `packages/github`

**Files:**

- Create: `packages/github/src/cache/github-cache-policy.ts`
- Create: `packages/github/src/cache/github-revalidation.ts`
- Create: `packages/github/src/cache/github-cache.ts`
- Create: `packages/github/src/cache/get-github-resource-local-first.ts`
- Create: `packages/github/src/octokit/client.ts`

- [ ] Copy the architectural ideas from DiffKit's `apps/dashboard/src/lib/github-cache.ts`, `github-cache-policy.ts`, and `github-revalidation.ts`, but adapt them to Postgres repositories and the server Worker KV binding.
- [ ] Pass KV and background execution handles into cache helpers explicitly through a runtime context object. Do not hide binding reads deep inside generic package code; this keeps package-local validation and future non-Worker execution understandable.
- [ ] Keep the same layered model:
  - stable request normalization
  - namespace-versioned keys
  - KV hot payload reads
  - Postgres durable fallback reads
  - conditional GitHub requests with `etag`/`last-modified`
  - mirrored writes to KV + Postgres
  - stale-if-rate-limited behavior
- [ ] Keep the namespace invalidation model exactly. That is the most important part of the system.
- [ ] Do **not** port per-user cache keys. Re-key the cache for the public owner model, for example by configured username/resource/params instead of `userId`.
- [ ] Port the GitHub request policy from DiffKit's `github.server.ts` only as far as it applies to a single configured token: retry/throttle safe reads, avoid replaying writes.
- [ ] Keep token-bearing Octokit creation server-only inside `packages/github`.

### Task 5: Implement Public GitHub Read Services In `packages/github`

**Files:**

- Create: `packages/github/src/profile/get-user-profile.ts`
- Create: `packages/github/src/profile/get-user-contributions.ts`
- Create: `packages/github/src/profile/get-user-pinned-repos.ts`
- Create: `packages/github/src/profile/get-profile-repos.ts`
- Create: `packages/github/src/profile/get-user-activity.ts`
- Create: `packages/github/src/repo/get-repo-overview.ts`
- Create: `packages/github/src/repo/get-repo-tree.ts`
- Create: `packages/github/src/repo/get-repo-file-content.ts`
- Modify: `packages/github/src/index.ts`

- [ ] Start with the public read surface only.
- [ ] Port the real DiffKit mapping logic from `/Users/salah/Developer/diffkit/apps/dashboard/src/lib/github.functions.ts` for these reads:
  - user profile
  - contributions
  - pinned repos
  - profile repos
  - user activity
  - repo overview
  - repo tree
  - repo file content
- [ ] Remove auth-only branches such as `viewer`, installation-token fallbacks, private-repo filtering for arbitrary signed-in viewers, and mutation logic.
- [ ] Keep the repository overview query bundled the same way DiffKit does, because that is one of the major performance wins.
- [ ] Keep the data mappers transport-safe so API routes can return them directly.
- [ ] When the configured GitHub source is missing, return `null` or empty collections instead of throwing. Public pages should degrade to a setup state.

### Task 6: Expose Public GitHub Reads Through oRPC

**Files:**

- Create: `packages/api/src/routers/public/index.ts`
- Create: `packages/api/src/routers/public/github/index.ts`
- Modify: `packages/api/src/routers/index.ts`

- [ ] Add a new `public` router group to `packages/api`.
- [ ] Make every public GitHub procedure call `@tsu-stack/github` with the configured source plus Worker runtime context from `OrpcContext`.
- [ ] Define public procedures for the new GitHub reads using `publicProcedure`.
- [ ] Keep every procedure explicit with `.route({ description, method })`, `.input(...)`, and `.output(...)` schemas.
- [ ] Source shared transport schemas from `packages/core` only if they become cross-package contracts worth centralizing. Otherwise keep router-local output schemas close to the router initially.
- [ ] Avoid leaking any credential/config details in API responses. The public API should only expose data and setup-state signals.
- [ ] Return a setup-state result when GitHub credentials are absent so the web app can render an intentional empty/setup UI.

### Task 7: Mount Webhook Invalidation In The Server Worker

**Files:**

- Create: `packages/github/src/webhooks/handle-github-webhook.ts`
- Modify: `apps/server/src/app.ts`

- [ ] Add a dedicated Hono route under the server Worker for GitHub webhooks, for example `/github/webhooks` or `/webhooks/github` under the existing `/server` base path.
- [ ] Verify the signature with `GITHUB_WEBHOOK_SECRET` before processing.
- [ ] Resolve the affected namespace/signal keys using a dedicated helper in `packages/github`.
- [ ] Persist webhook delivery audit rows in Postgres using the new cache repository.
- [ ] Mark revalidation signals and bump namespace versions durably.
- [ ] Do not mix this path into `packages/api` oRPC routers; keep it as a normal Hono route in `apps/server/src/app.ts`.
- [ ] Keep initial invalidation scoped to the public pages you are actually shipping. Add more signal keys only when more GitHub features land.
- [ ] Define the supported webhook event set before coding the handler. For the first release, cover at least `push`, `repository`, `public`, `issues`, `pull_request`, `discussion`, `star`, `fork`, and `watch` only where those events map to visible public profile/repo data.
- [ ] Document the GitHub-side setup required to send those webhooks. A personal access token alone does not create webhooks; the configured account or repositories must be configured to call the server webhook URL.

### Task 8: Build Feature-Owned Web Query Modules

**Files:**

- Create: `apps/web/src/pages/github-profile/api/get-github-profile.query.ts`
- Create: `apps/web/src/pages/github-profile/api/get-github-contributions.query.ts`
- Create: `apps/web/src/pages/github-profile/api/get-github-pinned-repos.query.ts`
- Create: `apps/web/src/pages/github-profile/api/get-github-profile-repos.query.ts`
- Create: `apps/web/src/pages/github-profile/api/get-github-activity.query.ts`
- Create: `apps/web/src/pages/github-profile/index.ts`
- Create: `apps/web/src/pages/github-repo/api/get-github-repo-overview.query.ts`
- Create: `apps/web/src/pages/github-repo/api/get-github-repo-tree.query.ts`
- Create: `apps/web/src/pages/github-repo/api/get-github-repo-file-content.query.ts`
- Create: `apps/web/src/pages/github-repo/index.ts`

- [ ] Follow `.agents/api-fetching-patterns.md` exactly.
- [ ] Do not create one monolithic `github.query.ts` in `apps/web`.
- [ ] Keep one query file per operation inside the owning page slice.
- [ ] Use `orpc.public.github.*.queryOptions()` wrappers in those files, not raw inline `useQuery(orpc...)` in page components.
- [ ] Export query key helpers and query option factories from those feature-owned modules.
- [ ] Keep route files thin and preload via those query option factories.

### Task 9: Build Public Profile And Repo Pages

**Files:**

- Create: `apps/web/src/pages/github-profile/ui/github-profile-page.tsx`
- Create: `apps/web/src/pages/github-repo/ui/github-repo-page.tsx`
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/$owner/index.tsx`
- Create: `apps/web/src/routes/{-$locale}/(root-layout)/$owner/$repo/index.tsx`
- Modify: `apps/web/src/routes/{-$locale}/(root-layout)/index.tsx`
- Modify: `apps/web/src/pages/home/ui/home-page.tsx`

- [ ] Extract the profile page from `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/index.tsx` and its `components/profile` dependencies, then remove the auth/viewer-dependent branches.
- [ ] Extract the repo overview page from `/Users/salah/Developer/diffkit/apps/dashboard/src/routes/_protected/$owner/$repo/index.tsx`, `/Users/salah/Developer/diffkit/apps/dashboard/src/components/repo/repo-overview-page.tsx`, and related `components/repo` dependencies, then adapt it to the repo's current slice/query conventions.
- [ ] Keep public GitHub pages mounted under the root layout, not the auth layout.
- [ ] Replace the current marketing home content in `apps/web/src/pages/home/ui/home-page.tsx` with the configured-owner GitHub profile page instead of trying to keep both experiences on `/`.
- [ ] Treat `/` as canonical for the configured owner's profile. If `/$owner` is implemented, make it an alias for the configured owner only: redirect mismatched owners to `/` or return not found, rather than silently supporting arbitrary public users.
- [ ] Keep the existing navbar controls for `Playground`, `Dashboard`, `API Docs`, localisation, theme mode, and the user button; only adjust navbar files if the new root page needs layout or ordering tweaks.
- [ ] Use route preloading with `ensureQueryData(...)` in the new route files.
- [ ] Preserve graceful setup behavior on the public home and public GitHub routes when no GitHub credentials are configured.
- [ ] Treat the root route profile experience as the primary public home, not as a secondary page behind the current landing sections.

### Task 10: Add Exact-Parity Live Refresh In The First Implementation Pass

**Files:**

- Create: `apps/server/src/github-signal-relay.ts`
- Modify: `apps/server/src/worker.ts`
- Modify: `apps/server/wrangler.jsonc`
- Create: `apps/web/src/features/github-live/api/use-github-signal-stream.ts`
- Modify: `packages/github/src/webhooks/handle-github-webhook.ts`

- [ ] Add a Worker-level signal relay after the durable cache and webhook invalidation are working.
- [ ] Export the Durable Object class from `apps/server/src/worker.ts`; Wrangler module workers discover the class from the Worker entry module, not from an arbitrary imported file by path alone.
- [ ] Keep the Durable Object class name and Wrangler `class_name` identical, for example `GitHubSignalRelay`, and bind it as `GITHUB_SIGNAL_RELAY`.
- [ ] Intercept `GET /server/api/ws/github-signals` or an equivalent websocket path in `apps/server/src/worker.ts` before falling through to `app.fetch(...)`, authenticate only if you intentionally want private subscriptions, and forward accepted websocket upgrades to the Durable Object. Public profile/repo pages should not require a logged-in user for subscriptions.
- [ ] Add an internal Durable Object broadcast path and call it from the webhook handler after `markGitHubRevalidationSignals()` and namespace bumps complete.
- [ ] Use a Durable Object only for live fan-out, not for authoritative invalidation state.
- [ ] Keep authoritative signal timestamps and namespace versions in Postgres, matching DiffKit's control-plane idea.
- [ ] Have the web app subscribe only to pages that benefit from immediate refresh: the root profile page, profile repos tab/activity feed, repo overview, repo tree, and markdown file content.
- [ ] Treat this task as required for the first release so public GitHub pages receive the same live cross-tab and webhook-driven refresh behavior as DiffKit.

### Task 11: Harden Credential Handling Before Expanding The GitHub Surface

**Files:**

- Modify: `packages/db/src/repositories/app-settings.repository.ts`
- Modify: `packages/api/src/routers/app-settings/index.ts`
- Modify: `packages/env/src/server/env.ts`
- Optional create: `packages/github/src/config/token-crypto.ts`

- [ ] Decide before implementation whether to keep the GitHub token stored as plaintext in `app_settings` or add encryption-at-rest.
- [ ] Because this token becomes the credential for the entire public GitHub surface, prefer adding server-side encryption in the same first pass unless you explicitly choose a temporary plaintext milestone.
- [ ] If using encryption, add a server-only env such as `APP_SETTINGS_ENCRYPTION_KEY`, document it, and rotate/update saved token handling without ever returning the raw token to the browser.
- [ ] If you keep plaintext for the first pass, document that choice explicitly in the plan and dashboard copy so it is not mistaken for a finished security posture.
- [ ] Do not change the browser contract: the token remains write-only from the UI regardless of storage internals.

### Task 12: Validation And Rollout Order

**Files:**

- Verify touched packages only after each stage

- [ ] After `packages/db` changes, run `vp run db:generate` and `vp run db:migrate`.
- [ ] After `packages/github` creation, install/update dependencies and run package-local typecheck/validation for that package.
- [ ] After `packages/api` changes, run package-local validation there.
- [ ] After `apps/server` binding and route changes, run `vp run --filter @tsu-stack/server cf-typegen`, then package-local validation there.
- [ ] After `apps/web` routes/pages land, run package-local validation there.
- [ ] Only after multi-package work is stable, run `vp run -w fix`.
- [ ] Do not call the feature complete until webhook invalidation, websocket broadcast, public reads, configured-owner `/` rendering, and graceful no-config behavior have all been verified.

## Recommended Implementation Order

1. Create `packages/github`
2. Add Postgres cache tables and repositories
3. Add env + server KV binding
4. Port cache core
5. Port public profile/repo read services
6. Expose them through `packages/api` public routes
7. Build `apps/web` query wrappers
8. Mount public profile/repo routes
9. Add webhook invalidation
10. Add live WebSocket parity as part of the first release

## Non-Goals For The First Pass

- Porting DiffKit's private dashboard, review tools, comment composer, uploads, or GitHub mutations
- Porting GitHub App installation-token complexity
- Porting per-user OAuth scopes for arbitrary visitors
- Supporting arbitrary public GitHub usernames from `/$owner`; initial public profile data belongs to the configured owner only
- Mixing raw GitHub calls into `apps/web` or `packages/api`
- Forcing all GitHub domain types into `packages/core` before a real second consumer exists

## Final Recommendation

Yes: create a separate monorepo package for GitHub.

Use `packages/github` for:

- Octokit creation
- public owner credential resolution
- durable cache helpers
- webhook invalidation
- profile/repo read services

Keep these boundaries:

- `packages/db`: schema + repositories only
- `packages/core`: pure shared contracts only when needed
- `packages/api`: public/protected transport procedures only
- `apps/server`: Worker bindings and non-oRPC webhook endpoints
- `apps/web`: feature-owned query wrappers, routes, and UI only

That structure will scale much better once `portfolio-v2` grows beyond GitHub.
