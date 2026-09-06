# Freehire-only job discovery: per-user fetch, no shared catalog — design

**Date:** 2026-09-05
**Author:** Salah
**Status:** Implemented (plan: [2026-09-05-freehire-only-job-discovery](../plans/2026-09-05-freehire-only-job-discovery.md))
**Surfaces:** Job settings, New jobs page, Find jobs now (button + hub tool), server queues, packages/db, packages/api, packages/core
**Verification skill:** [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) (required after implement; living lessons in that skill's `LESSONS.md`)
**Glossary:** [CONTEXT.md](../../../CONTEXT.md)

**Related:**

- [Job discovery adapters](./2026-08-14-job-discovery-adapters-design.md) — **superseded**: adapter framework, shared catalog ingest, and cheap-rank catalog flow die
- [Jobs hardening from Freehire](./2026-08-20-devhub-jobs-hardening-from-freehire-design.md) — company snapshot concepts survive into `user_job`; shared-pool + company-table ADR **superseded**
- ADR [0026](../../adr/0026-job-posting-shared-pool-and-company-table.md) — **superseded** by this spec
- [Search brief + hub operator](./2026-08-16-search-brief-hub-operator-design.md) — AI scoring pipeline kept, fed by `user_job`
- [List search + filters](./2026-08-22-list-search-filters-design.md) — chips UI pattern reused for facet controls

**Does not reopen.** Grill lock from the product owner (2026-09-05). Frozen **#3** (active-user cron enrollment), **#7** (one-time preference reset, null + re-onboard), **#12** (delete the adapter framework entirely, no NormalizedListing), **#16** (drop `jobsPerRun`, fixed pool of 100). Implementation may refine file names and internal column names, not these decisions.

---

## 1. Goal

Replace the five-board adapter system and the shared job catalog (`job_posting`, `job_company`) with a **single source — freehire** (`https://freehire.me/api/v1`) — fetched **per user**, stored **per user**, so each user gets their jobs directly from their own settings with no cron crawls of a global catalog, no shared dedup pool, and no liveness probes.

The AI scoring pipeline (two-axis extraction, `minMatchScore`, daily AI budget) is unchanged in behavior; only its input changes from the shared pool to per-user freehire results.

---

## 2. Non-goals

- Using freehire's authenticated surface: tracking, apply, match-analysis, assistant, CV tailoring stay freehire-account-scoped and are **not** used.
- Keeping any second job source or the adapter abstraction "for later."
- Keeping `job_posting` / `job_company` in any read/write capacity after migration.
- Liveness probing, `closedAt`/`closedReason` tracking, HEAD/GET availability checks.
- Retrying failed freehire fetches (no backoff machinery).
- Freehire webhooks / saved-search subscriptions (would require per-user freehire accounts).
- Replacing our own AI scoring with freehire's match endpoints.

---

## 3. Frozen decisions (grill log)

| #   | Topic                  | Decision                                                                                                                                                                                                                                                                              |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Storage                | Per-user rows. New `user_job` table (unique `userId + freehireSlug`). CRM (`application.postingId` → repointed), scores, dismissals, apply kit keep working. Duplicates across users are acceptable.                                                                                  |
| 2   | Fetch triggers         | No global cron. Three triggers through one coalescing queue: per-user cron, settings save, manual "Find jobs now".                                                                                                                                                                    |
| 3   | Cron enrollment        | Active-user only: (a) preferences saved (facets non-null) AND (b) activity within 7 days. Others skipped; manual trigger re-enrolls.                                                                                                                                                  |
| 4   | Inactivity window      | **7 days.**                                                                                                                                                                                                                                                                           |
| 5   | Cadence                | One 24h repeatable tick; per-user delay `hash(userId) mod 24h` (deterministic → same delivery time daily). Smooths freehire load.                                                                                                                                                     |
| 6   | Facet surface          | **Curated ~18 facets**, grouped UI (Where / Role / Level / Terms / Companies / Freshness). Not literally all 25. Skip: `source`, `company_slug`, `posting_language`, `salary_period`, `english_level`, `education_level`, `role_type`, `ai_archetype`... — see §6 for the final list. |
| 7   | Preference migration   | **Reset everyone**: null all facet fields, keep rows, cron skips preference-less users, re-onboard on next settings visit. No old-field translation, no hard modal.                                                                                                                   |
| 8   | Shared-pool migration  | Copy every existing application's referenced posting into `user_job` (freehire slug where resolvable, else full denormalized snapshot), repoint `application.postingId`, then **drop `job_posting` + `job_company`**.                                                                 |
| 9   | AI scoring             | **Ours**: fetch = candidates; existing cheap-filter → AI score → `dailyBoardScoreCap` → `minMatchScore` pipeline unchanged. Freehire match endpoints not used.                                                                                                                        |
| 10  | Liveness               | **Queue deleted.** Freehire search returns only open jobs; `user_job` snapshots keep CRM cards rendering after a job closes. Old unlanded rows fade via existing TTL helpers. No `closedAt`/`closedReason` columns.                                                                   |
| 11  | Adapter framework      | **Deleted entirely**: 4 non-freehire adapters, registry, `JobSourceAdapter`, capabilities, `NormalizedListing`, ingest planner, shared `upsertListings`. One `freehire-client` module maps API → `user_job`.                                                                          |
| 12  | Mail harvest           | **Kept**, rewired to write `user_job` instead of `job_posting`.                                                                                                                                                                                                                       |
| 13  | Resilience             | **Fail soft**: failed fetch keeps yesterday's shelf, log wide event, cron user silently skipped (next day retries itself), manual trigger toasts. No retries/backoff.                                                                                                                 |
| 14  | `user_job` metadata    | Store `queryHash` + the filter set that produced each row (shelf invalidation on settings change). **No** freehire `raw` jsonb column.                                                                                                                                                |
| 15  | `jobsPerRun` slider    | **Deleted.** Fixed pool: `limit=100` per fetch. `dailyBoardScoreCap` + `minMatchScore` are the knobs.                                                                                                                                                                                 |
| 16  | Settings save          | Save → immediate refetch (coalesced). New `queryHash` ignores old shelf.                                                                                                                                                                                                              |
| 17  | Manual "Find jobs now" | Force refresh: immediate, no stagger, bypasses inactivity check (re-enrolls), full pipeline (fetch → score → land until cap). Budget-exhausted toast unchanged. Coalesces with in-flight runs.                                                                                        |
| 18  | Settings UI            | Single grouped page, chips for multi-value facets, `/geo/cities` autocomplete, currency limited to USD/EUR/GBP/RUB.                                                                                                                                                                   |
| 19  | Title packs            | **Killed** (`titleId`, `customTitle`, `title-packs.ts`). Role section = `q` keywords + category chips.                                                                                                                                                                                |
| 20  | ATS allowlist          | `FREEHIRE_ATS_SOURCES` deleted — result pool widens to all of freehire.                                                                                                                                                                                                               |

---

## 4. Freehire API contract (verified against the live API, 2026-09-05)

### 4.1 Endpoint

- Fetch: **`GET /agent/jobs/search`** — returns full descriptions + rich `enrichment` (salary, `experience_years_min`, summary, requirements). Regular `/jobs/search` intermittently returns `enrichment_version: 0` stubs without salary — not used.
- Autocomplete: `GET /geo/cities?q=<prefix>` for country/city pickers.
- Health: `GET /status` (public).
- Read endpoints need **no auth**. We use no API key.

### 4.2 Hard limits (verified)

| Behavior     | Observed                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Rate limit   | `x-ratelimit-limit: 300–600` per window per IP, headers on every response. All server-side fetches share one bucket. |
| Page size    | `limit` max 100; larger values **silently clamped**.                                                                 |
| Deep paging  | `offset + limit > 10,000` → 400 `pagination too deep`.                                                               |
| Catalog size | ~2.1M jobs unfiltered — pagination-only browsing is meaningless; `open_within_days` + facets narrow.                 |
| Errors       | 400/401/403/404/503 with `{ "error": ... }`. `GET /status` for health.                                               |

### 4.3 Silent-failure traps (client must defend)

1. **Invalid enum value → 200, `total: 0`** (verified: `work_mode=bogus`). Looks like "no jobs match". **Mandatory**: client-side whitelist validation of every facet value + `sort` before sending.
2. Invalid `sort` silently ignored, no `did_you_mean`.
3. `meta.ignored_params` reports unknown params only — check it and log when non-empty.
4. Salary currencies limited to **USD, EUR, GBP, RUB**.
5. Descriptions are raw HTML — sanitize before storage/render.

### 4.4 Response shape (fields we consume)

`public_slug` (stable ID), `source`, `external_id`, `url`, `title`, `company`, `company_slug`, `location`, `description` (HTML), `countries[]`, `regions[]`, `cities[]`, `skills[]`, `collections[]`, `posted_at`, `created_at`, `last_seen_at`, `closed_at`, `enrichment` (summary, employment_type, relocation, salary_min/max/currency/period, seniority, experience_years_min, category, domains, requirements), `enrichment_version`, `reality` (class, age_days, repost_count, mass_posting_count, fake_freshness). Envelope `{ data, meta: { total, limit, offset, ignored_params? } }`.

---

## 5. Architecture

### 5.1 `user_job` table (new, `packages/db`)

- Unique: `(userId, freehireSlug)`.
- Snapshot columns: `title`, `companyName`, `companySlug`, `companyLogoUrl`, `listingUrl`, `location`, `workMode`, `employmentType`, `seniority`, `experienceYearsMin`, `salaryMin`/`Max`/`Currency`, `skills` (jsonb), `category`, `domains` (jsonb), `summary`, `description` (sanitized), `postedAt`, `reality` (class), `source` (freehire value, display only).
- Meta: `firstSeenAt`, `lastSeenAt` (fetch-time upsert), `queryHash` + `queryFilters` (jsonb — the facet set that produced the row), AI `matchScore`.
- **No** `raw` jsonb, no `closedAt`/`closedReason`, no `adapterId`/`contentHash` shared-pool machinery.
- Indexes: `(userId, lastSeenAt)` for shelf reads; `(userId, queryHash)` for invalidation sweeps; `application.jobId` FK `onDelete set null` (replaces `postingId`).

### 5.2 Fetch pipeline (one module, `packages/api/src/lib/job-discovery/`)

1. Build freehire query from `job_preference` facets (client-side enum whitelist validation; drop-and-log invalid values rather than sending them — an invalid value silently zeroes the result set server-side).
2. `GET /agent/jobs/search?...&limit=100` (+ `sort`, `order`).
3. Sanitize descriptions; map → `user_job` upsert rows (dedup key `freehireSlug`; refresh `lastSeenAt` on re-encounter).
4. Cheap filter → existing AI scoring (two-axis, search brief) → land until `dailyBoardScoreCap` / `user_job_ai_budget`.
5. Fail soft at any fetch step: keep previous shelf, wide-event log (`@ts-stack/logger`), no retry. Log rate-limit headers; treat 429/503 as the fail-soft path.

### 5.3 Triggers (one coalescing queue)

- **Per-user cron**: keep one 24h repeatable BullMQ tick. Tick queries enrolled users (facets non-null AND last activity ≤ 7 days), enqueues each with deterministic delay `hash(userId) mod 24h`, job id `land_${userId}` (coalescing).
- **Settings save**: job-preference mutation enqueues immediately (same job id → saves collapse).
- **Manual**: `jobDiscovery.findNow` / hub `find-jobs-now` tool enqueue immediately, bypass the 7-day check, budget toast unchanged.
- **Deleted queues**: `job-catalog-ingest-queue` (shared ingest), `job-inbox-liveness-queue`.

### 5.4 Read path

New Jobs page / hub read `user_job` where `queryHash = current` (stale-hash rows are ignored, not shown, not deleted until TTL sweep). No fetch on page load — freshness comes from the cron/manual triggers.

---

## 6. Settings surface (job settings page)

Single grouped page; chips for multi-value facets (Cubby chips pattern), `/geo/cities` prefix autocomplete for countries/cities.

| Group         | Controls (freehire params)                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Where**     | `regions` (chips), `countries` (autocomplete), `cities` (autocomplete). Geography is one OR group on freehire — UI copy must say "any of these places".        |
| **Role**      | `q` keywords (replaces title packs + roleKeywords), `category` (chips), `skills` (chips)                                                                       |
| **Level**     | `seniority` (chips), `experience_years_min` / `experience_years_max` (numbers)                                                                                 |
| **Terms**     | `work_mode` (chips), `employment_type` (chips), `salary_min` + `salary_currency` (USD/EUR/GBP/RUB), `visa_sponsorship` (toggle), `requires_clearance` (toggle) |
| **Companies** | `company_type` (chips), `company_size` (chips), `domains` (chips), `collections` (chips)                                                                       |
| **Freshness** | `open_within_days` (number), `reality` (chips: fresh/stale/likely-evergreen)                                                                                   |
| **Scoring**   | `dailyBoardScoreCap` (existing slider + usage meter + "Clear today"), `minMatchScore` (existing)                                                               |

Not exposed: `source`, `company_slug`, `posting_language`, `salary_period`, `english_level`, `education_level`, `role_type`, `ai_archetype`, `posted_within_days`.

Deleted controls: title combobox / title packs, level floor, `jobsPerRun` slider, separate locations/remoteRegions/workModes lists (replaced by facet chips), role/exclude keyword lists (`q` positives; excludes as negative `q` terms are **not** re-introduced — the reset starts everyone clean).

Excluded-facet `_exclude` variants (e.g. `company_type_exclude`) stay available to the hub/AI layer but are not settings UI.

---

## 7. Deleted

| Item                                                                                                                     | Where                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Adapters: himalayas, arbeitnow, remotive, remoteok, freehire-as-adapter                                                  | `packages/api/src/lib/job-discovery/adapters/`                              |
| `JobSourceAdapter` contract, `AdapterCapability`, `NormalizedListing`, registry, fetch-json UA helper as shared plumbing | `packages/core/src/job-discovery/types.ts`, adapters dir                    |
| Shared ingest: `planIngestQueries`, shared `upsertListings`, `job-catalog-ingest-queue`                                  | `packages/api/src/lib/job-discovery/ingest.ts`, `apps/server/src/queues/`   |
| Liveness: probes, `markClosed`, `job-inbox-liveness-queue`, closed-TTL for postings (user_job TTL helpers kept)          | `packages/api/src/lib/job-discovery/liveness.ts`, `apps/server/src/queues/` |
| `job_posting` + `job_company` tables and repositories                                                                    | `packages/db`                                                               |
| `FREEHIRE_ATS_SOURCES`, `FreehireAtsSource`                                                                              | `packages/core/src/job-discovery/constants.ts`                              |
| Title packs (`titleId`, `customTitle`, packs + tests)                                                                    | `packages/core/src/job-discovery/title-packs.ts`, settings UI               |
| `jobsPerRun`, `levelFloor`, `roleKeywords`, `excludeKeywords`, `locations`, `remoteRegions`, `workModes` columns         | `job_preference` schema + form fields                                       |
| Freehire company-profile hydration into `job_company`                                                                    | `ingest.ts` hydrate path                                                    |

**Kept unchanged:** AI budget tables + scoring pipeline, search brief (hub operator), apply kit, mail harvest (target rewired), `dismissed-application-purge-queue`, freehire logo proxy (`logo.freehire.me`), community-landing copy (update if it names dead boards).

---

## 8. Migrations (ordered)

1. Create `user_job`; add `application.jobId` (FK, `set null`).
2. Copy referenced postings: for each `application.postingId`, insert a `user_job` row for the application owner (freehire slug if the posting's `listingUrl`/company slug resolves, else a synthetic snapshot keyed by the old external id), set `application.jobId`.
3. Null all `job_preference` facet columns (rule #7). Keep budget/brief/`importFromEmail`/`reviewApplyKit`/`dailyBoardScoreCap`/`minMatchScore`.
4. Drop old columns from `job_preference` (`jobsPerRun`, `levelFloor`, title fields, keyword/location arrays), drop `application.postingId`, drop `job_posting` + `job_company`, drop dead queues/worker wiring in `apps/server/src/index.ts`.

---

## 9. Risks (accepted)

- **Dependency risk**: freehire has no SLA; it's a community project. Mitigation: per-user snapshots survive outages; fail-soft fetch; a second source can be added later without re-creating the old adapter framework (a per-user fetch module is all it takes).
- **Shared rate-limit bucket** (~300–600/window/IP, undocumented): staggered cron fits comfortably; 429/503 → fail soft. Recommend contacting freehire to declare intent and ask about quota.
- **Salary currencies** USD/EUR/GBP/RUB only.
- **Silent zero-results** on bad facet values: defended by client-side whitelist validation + `ignored_params` logging.
- Thin enrichment exists (`enrichment_version: 0`): jobs without salary/experience simply score on available fields (existing cheap-filter behavior already tolerates missing years).

---

## 10. Verification

- Unit: freehire-client mapping (enrichment → snapshot columns, HTML sanitization, query builder + whitelist validation, `queryHash` stability), `user_job` upsert dedup.
- Integration: settings-save → immediate refetch; cron enrollment predicate (7-day window); manual re-enroll; budget cap unchanged; fail-soft on 503.
- After implement: run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) (New jobs flow, settings change flow, manual find, hub tool) and append lessons.
