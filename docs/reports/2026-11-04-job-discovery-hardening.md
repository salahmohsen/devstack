# Job discovery reliability hardening — 2026-11-04

## Contract

A user starts a search from New jobs, the hub tool, or MCP and receives an account-scoped run ID. Repeated requests reuse the active run; manual requests expedite a delayed daily run. Progress comes from persisted worker state. A failed source fetch or screening attempt must not be described as an empty successful search. Empty results are valid completed searches. Existing saved preferences and production application data must be preserved.

Shared state: `job_discovery_run`, `user_job`, application rows, Redis queues, and the detached web job store. Scheduled discovery and backfill use the same run protocol. The existing hub client enqueue helper uses the same web orchestration; the MCP registry now exposes `jobDiscovery.status` as a read.

## Source contract checked first

Primary sources checked live:

- https://freehire.me/openapi.yaml
- https://freehire.me/docs/api
- https://freehire.me/llms.txt
- Context7 `/strelov1/freehire`; the live OpenAPI takes precedence over archived examples.
- Context7 `/nodejs/undici` for custom `Agent.connect.lookup` and dispatcher behavior.

Freehire still serves `/api/v1/agent/jobs/search` without authentication. Current additions include separate remote/physical geography parameters, `experience_include_unspecified`, an open ISO currency string and explicit salary periods. The integration requests HTML descriptions explicitly, identifies itself with a User-Agent, and fails visibly when upstream reports ignored filters/values. Unsupported saved closed-vocabulary filters also produce an actionable failure instead of silently broadening the search.

Salary is intentionally checked locally: the product preference is a monthly floor and keeps unknown pay and different currencies eligible. An upstream raw `salary_min` + `salary_currency` filter would change that behavior and compare incompatible periods. Source monthly/yearly periods are preserved, same-currency comparisons normalize to monthly, unsupported periods remain unknown, and displayed ranges no longer falsely prefix every currency with `$`.

## Production cause proven

Read-only commands were executed through Dokploy's authenticated container terminal, using the existing local API credential without displaying it.

- System DNS returned `188.114.96.6` / `188.114.97.6`. Native Node fetch failed with `UND_ERR_CONNECT_TIMEOUT` after 10 seconds.
- A resolver using `1.1.1.1` returned the same unreachable route.
- `8.8.8.8` returned `104.21.41.207` / `172.67.193.149`.
- HTTPS requests from the same container using those answers, retaining `freehire.me` for hostname and certificate verification, returned HTTP 200 in approximately 275–310 ms. The original route timed out in the same probe.

The implementation uses fresh DNS lookup, never those pinned IPs. Its alternate resolver is limited to the public `freehire.me` hostname; custom provider URLs retain their configured network path. Connections have bounded timeouts, requests retain their abort signal, and a successful alternate route is briefly preferred. HTTP errors and caller cancellation do not trigger alternate-route requests. TLS verification remains enabled.

The currently deployed image does not contain standalone Undici, so the exact new module could not be loaded into that image without changing it. The route mechanism was proven in-container; the new transport was exercised locally and returns HTTP 200. Undici 8 proved incompatible with the Node native fetch dispatcher; the direct dependency is pinned to compatible Undici 7.

## Implementation

- Additive generated migration: one run table plus structured regions, countries, cities and salary period on staging rows. Applied successfully to local PostgreSQL only.
- Active-run unique index and per-account transaction lock coalesce concurrent requests. Candidate reservations/results are idempotent. Abandoned runs expire after their due time and an inactivity window.
- Fetch exceptions reach the worker. Transient errors retry with bounded backoff; permanent API/contract errors stop immediately. Retry-After is respected within a five-minute bound. Safe network error codes are attached to existing outcome logs.
- Backfill reuses the successful run snapshot and excludes already attempted candidates. Failed enqueue releases the reservation for retry. Screening errors are persisted as failures rather than hidden skips; configured-AI heuristic fallback is explicitly shown as degraded scoring. Late candidate outcomes remain countable after terminal failure.
- Persisted candidate outcomes drive progress and additions. Source metadata totals are not presented as the number of fetched/checked rows. Run-specific snapshot hashes prevent a valid empty fresh search from landing an old unseen cached row; this boundary is included in the real worker harness.
- Preserve structured place data through both landing and screening. A source category can qualify a category-only search without requiring its taxonomy slug verbatim in the title.
- Web dashboard and hub tracking stop on actual terminal state; detached tracking also catches status-read failures. Dismiss stops client tracking while server work continues. New jobs shows current state, retry time, last success, next scheduled run when known, and salary handling.
- Settings copy now states the role/category requirement, the meaning of experience bounds, and the local monthly salary rule.
- Add explicit web `@noble/ciphers` dependency: the production SSR build otherwise resolved an incompatible version from the home directory. Lockfile changes retain unrelated dependency resolutions.

## Fresh verification

- Original regression: two fetch/storage failure cases failed with `promise resolved "{ ok: false }" instead of rejecting`; after the fix both pass.
- API discovery suite: 9 files, 69 tests passed, including DNS-route fallback and cancellation/custom-host boundaries.
- Core discovery + salary suite: 16 files, 133 tests passed.
- Rendered status component + hub enqueue helper: 2 files, 5 tests passed. Covers retry/failure/empty/success/unavailable states, persisted counts, salary notice and polite live announcements.
- `apps/server/node_modules/.bin/tsx --env-file=packages/env/.env packages/api/scripts/harness-job-discovery.ts`: real local PostgreSQL, Redis, actual producers and both workers. Proves transient 503 retry, atomic coalescing, foreign-tenant isolation, structured geography, category-only title acceptance, monthly EGP exclusion, one actual inbox insert, permanent error without retry, distinct empty completion, failed screening state, stale-run recovery, and manual acceleration of a scheduled run. Fixture users and application data are deleted on exit. It refuses non-local database hosts.
- Package-local checks passed for API, core, database, server, MCP, and web (pre-existing warnings remain). Web standalone TypeScript check passed.
- Server production build passed. Web production build passed with local environment values and the repository-local Vite+ binary.
- React Doctor changed-source scan: 95/100, no reported issues.
- Root `vp run -w fix` was attempted: its lint traversal included nested `.claude/worktrees` and failed on existing errors there. Scoped package checks were used to assess the changed packages. The globally installed Vite+ CLI also drifted to 1.4 while this repo uses 0.2.9; final builds used the repository-local binary.

## Hardening limits

Component rendering and the shared worker loop are the explicit UI-test substitute for this run. No interactive browser verification was performed; responsive appearance, focus behavior, navigation during a search, and the live hub tool card remain browser checks for rollout. No Mastra agent implementation, auth, or memory configuration changed. No real paid/provider model call was made; the worker loop uses a disposable account without AI credentials. The user's real scoring provider must be verified in the post-deploy account search.

No production migration, environment change or deployment was performed. Production is still running the old behavior until rollout.

## Rollout sequence

1. Review this change and take the normal database backup.
2. Deploy the server first; its startup migration adds the table and columns. Verify migration completion and worker startup, then check the new protected status route. Old web callers ignore the added optional run ID.
3. Deploy web. Confirm its artifact matches the intended source and includes the new status UI.
4. Run a search on the affected account. Verify source fetch succeeds through the scoped resolver, real provider screening reaches a terminal state, persisted additions equal actual inserted jobs, and the UI reports the same outcome.
5. Browser-check New jobs, hub initiation, dismissal/navigation, empty/error states, narrow viewport, and both appearances. Check the scheduled run and last-success display.
6. If rollback is needed, roll back application artifacts. The migration is additive; retain the run records and columns rather than deleting them during an incident.

## PR 60 review follow-up

Accepted review findings now have code fixes. Discovery status keys include the account ID. An auth-cache account change cancels the detached poll, clears its shared state, and removes the old discovery status cache. Polling checks cancellation after each awaited invalidation. Transient status reads get three bounded retries; exhausted tracking reports unavailable status while preserving the server search outcome. Idle visible dashboards refresh every 30 seconds.

Queued-run recovery reuses the claimed run ID and recreates a missing Redis job. The enqueue result carries that ID back to the caller instead of looking up a potentially different active run afterward. A legitimate scoring run is coalesced. Remote geography uses the existing Locations fallback and lineage matcher. Screening retains precise physical locations when broad source regions are present.

Runs blocked by missing role/category or a full inbox persist a failed outcome with a readable Search paused label. They do not advance lastSuccessfulAt. All terminal transitions clear retryAt, and the status card shows a next attempt only while retrying. Heuristic disclosures are persisted only after an actual insert. No-key searches use neutral wording; configured AI failures retain the unavailable warning.

The local worker harness now rejects remote DATABASE_URL and REDIS_URL before creating resources. Additional proof covers a crash after the database claim, a missing delayed Redis job, blocked preferences preserving last success, precise hybrid locations surviving both screening stages, obsolete retry cleanup, no-key disclosure after insertion, and empty runs without false addition notices. Controlled frontend tests cover transient polling recovery, bounded failure, invalid sessions, dismissal during both invalidation awaits, and account changes. The alternate DNS transport also rejects a real self-signed TLS certificate in a local HTTPS fixture.

Skipped review suggestions remain the one-off Set allocation and speculative hydration state. No SSR prefetch path was found for this status query. Neither change fixes a demonstrated failure.

## Required deployment sequence

Do not overlap old and new inbox workers. Old code does not finish the new candidate reservations. Dokploy reports one replica and no explicit updateConfigSwarm, which does not prove the running service update order.

Before rollout, verify the actual Docker service update order is stop-first, or pause discovery producers and drain/stop every old land and inbox worker before starting the new version. Apply the additive migration before starting the new application. Confirm the old container/process is gone and the new worker artifact is running before resuming producers. If zero-downtime overlapping worker versions are required, introduce a versioned queue or reservation reconciliation before deployment.

After rollout, trigger one search for the affected account and confirm a real terminal run, zero pending candidates, no stale retry time, actual inbox additions or an honest empty result, and the dashboard's last-success timestamp. Recheck source connectivity inside the deployed container. Migration, deployment order, interactive browser behavior, and paid AI execution are not verified by the local suite.

### Follow-up validation results

- API discovery tests passed, 71 tests across 9 files, including the actual TLS rejection.
- Core discovery and salary tests passed, 139 tests across 16 files.
- Web tracker, status rendering, and hub enqueue tests passed, 13 tests across 3 files.
- Real local PostgreSQL/Redis harness passed with restricted remote metadata retained and the hybrid location regression included. A separate remote-Redis probe stopped at the guard before starting workers.
- Server and web production builds passed. Web TypeScript passed. API and DB package checks passed with existing warnings. The final changed-web check passed with no warnings or errors.
- The full workspace fix command found four errors in new test imports plus existing warnings. Those imports were corrected and the affected check rerun successfully. The full workspace command was not repeated.
- React Doctor 0.9.22 reported 92/100 and one locale-formatting warning on the already-reviewed status date rendering. This warning remains deferred because no SSR-prefetch path was found. The score is not directly comparable with the earlier scanner version.

The full worker loop and asynchronous tests are substitutes for the current behavior checks. They do not establish interactive browser or deployed production verification.

## Second PR review follow-up

All six new findings are addressed. Status responses carry the authenticated userId, and the browser rejects a response for a different account before caching it. Each detached status request has a 15-second deadline, including a race guard for an unresponsive transport. The 20-minute tracking limit retains its still-running message instead of becoming a read-error message. Invalid JSON source responses are retryable; valid JSON with an incompatible schema remains permanent. A failed scoring-warning write is nonfatal after insertion, so the candidate keeps its inserted outcome rather than retrying into skipped.

Backfill uses a persisted land_revision and a distinct queue ID for each requested pass. An old pass cannot write landFinished for a newer revision. Superseded queued passes skip work, and the latest pass reuses the saved snapshot. This adds migration 20261104121202_minor_wendell_rand with one non-null integer column defaulting to zero. Apply it before the new server starts and retain the stop-first worker requirement above.

The real worker harness forces two backfills after the original pass writes landFinished. It confirms that a later available candidate is inserted, the run completes rather than remaining in scoring, and only one provider fetch occurs. Focused tests also cover mismatched response ownership, a request that never settles, the overall tracking limit, warning-storage failure, and malformed JSON versus schema mismatch. Interactive browser and deployed production verification remain outstanding.

### Second follow-up validation

- API discovery suite passed with 73 tests, core discovery and salary with 139, and web tracker/status/account-cache/hub helpers with 17. Total: 229 focused tests.
- The real local worker harness passed the forced backfill completion race and a warning-write failure after insertion. The inserted candidate remains counted; superseded backfill revisions converge without another provider fetch.
- Server and web production builds passed. Web TypeScript passed. API, database, server and changed-web checks passed. The full workspace fix found one new test-style error and existing warnings; the test-style error was corrected and the affected check passed. The full workspace command was not repeated.
- React Doctor remained 92/100 with the same locale-formatting warning. No new diagnosis was added.
- Migration 20261104121202_minor_wendell_rand was generated, inspected and applied against guarded local PostgreSQL. Production is unchanged.
