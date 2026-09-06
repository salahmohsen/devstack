# Freehire-only job discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five-board adapter system and shared job catalog (`job_posting`, `job_company`) with a single freehire source fetched per user into a new `user_job` table; kill the ingest + liveness queues, title packs, and `jobsPerRun`; rewrite job settings to ~18 curated freehire facets; migrate existing application links.

**Architecture:** Freehire search (`GET /agent/jobs/search`) is fetched per user by three coalescing triggers (staggered per-user daily cron, settings save, manual find-now). Results upsert into `user_job` (`userId + freehireSlug` unique). The existing land pipeline (`land.ts` → `inbox-ai.ts` → applications) is re-pointed from `job_posting` to `user_job`; the New Jobs page keeps reading applications. The liveness tick survives gutted (inbox TTL + silence nudges only — no HTTP probes).

**Tech Stack:** Drizzle + Postgres (packages/db), BullMQ (apps/server), oRPC (packages/api), TanStack Start + tanstack form (apps/web), vitest via `vp test`.

**Spec (grill lock):** [docs/superpowers/specs/2026-09-05-freehire-only-job-discovery-design.md](../specs/2026-09-05-freehire-only-job-discovery-design.md) — frozen decisions #1–#20. Do not reopen them.

**Working agreements (from repo docs):**

- Workflow/validation: `.agents/workflow.md` — `vp check` package-local; `vp run -w fix` after substantial multi-package work; `vp run db:generate` / `vp run db:migrate` for schema; **verify `packages/env/.env` DATABASE_URL points at local Docker before migrating, never production**.
- Testing: `.agents/testing.md` — tests only where a plan task explicitly calls for them (this plan does, per spec §10). Unit tests at `src/**/__tests__/*.test.ts`, run `vp test run` package-local, monorepo via `vp run test:unit:run`.
- Commits: conventional commits (enforced); staging hooks auto-run `vp check --fix`.
- Repo skeleton knowledge lives in the recon at the bottom of this plan (§ Appendix A).

**Plan-level deviations from spec wording (confirmed safe, do not reopen):**

- Mail harvest already writes applications directly (no `job_posting` writes) — verified. **No harvest change needed.**
- The "AI matchScore on `user_job`" column from spec §5.1 is dropped — AI scores live on applications (existing behavior); `user_job` is a staging row.
- The liveness tick survives as an inbox-tick (TTL dismissal + silence nudges + `user_job` purge) because it currently drives product behavior (silence nudges, inbox expiry) that the spec does not delete.
- `hydrate.ts` is deleted: `/agent/jobs/search` returns full descriptions + enrichment, removing the listing-page backfill hop.

---

## File Structure (target state)

```
packages/db/src/schema/
  user-job.schema.ts                 NEW   user_job table
  job-preference.schema.ts           MODIFY facet columns, drop old
  application.schema.ts              MODIFY +jobId (FK user_job), -postingId
  job-posting.schema.ts              DELETE (final migration)
  job-company.schema.ts              DELETE (final migration)
packages/db/src/repositories/
  user-job.repository.ts             NEW   upsertMany/listUnlanded/purge/count
  job-posting.repository.ts          DELETE
  job-company.repository.ts          DELETE
packages/db/scripts/
  migrate-postings-to-user-jobs.ts   NEW   one-off data migration
packages/core/src/job-discovery/
  facets.ts                          NEW   freehire facet enums + preference→query types
  query-hash.ts                      NEW   stable queryHash of facet filter set
  constants.ts                       MODIFY -title packs, -adapter ids, -ATS allowlist, -jobsPerRun; +pool/TTL consts
  title-packs.ts                     DELETE
  cheap-score.ts / two-axis.ts / land-budget.ts / shelf.ts   MODIFY new pref shape
packages/api/src/lib/job-discovery/
  freehire/client.ts                 NEW   HTTP client (envelope, ratelimit+ignored_params logs)
  freehire/query-builder.ts          NEW   preference → validated search params
  freehire/map.ts                    NEW   job → user_job upsert input (+HTML sanitize)
  fetch.ts                           NEW   per-user fetch → user_job upsert
  enrollment.ts                      NEW   active-user predicate (7d session window)
  land.ts / inbox-ai.ts / enqueue.ts MODIFY  point at user_job
  ingest.ts / liveness.ts / hydrate.ts / content-hash.ts / raw.ts / leftover-extract.ts   DELETE (liveness logic moves to tick.ts)
  tick.ts                            NEW   inbox TTL dismissal + silence + user_job purge
  adapters/                          DELETE whole dir
packages/core/src/job-preference/types.ts   MODIFY facet-shaped schemas
apps/web/src/features/job-preference/
  lib/job-preference-form.ts         MODIFY facet form state + options
  ui/job-preference-fields.tsx       REWRITE grouped facet sections
apps/server/src/queues/
  job-discovery-fetch-queue.ts       NEW (replaces job-catalog-ingest-queue.ts)
  job-inbox-tick-queue.ts            NEW (replaces job-inbox-liveness-queue.ts)
apps/agent: find-jobs-now tool — no change (client-enqueue only).
```

---

## Task 0: Preflight

**Files:** none (branch + env safety)

- [ ] **Step 1: Create branch**

```bash
git checkout -b freehire-only-job-discovery
```

- [ ] **Step 2: Verify local DB target**

Check `packages/env/.env` `DATABASE_URL` points at local Docker (localhost). If it references a remote/production host — STOP and warn the user. All `db:migrate` steps in later tasks depend on this.

- [ ] **Step 3: Baseline green**

```bash
vp run test:unit:run
```

Expected: all suites pass. Record failures if any (pre-existing) so later tasks don't chase them.

---

## Task 1: DB — `user_job` table + `application.jobId`

**Files:**

- Create: `packages/db/src/schema/user-job.schema.ts`
- Modify: `packages/db/src/schema/index.ts` (export), `packages/db/src/schema/application.schema.ts:138,168`
- Create: `packages/db/src/repositories/user-job.repository.ts`
- Test: `packages/db/src/repositories/__tests__/user-job.repository.test.ts` (mocked-getDb style, mirror `stack-dependency.repository.test.ts`)

- [ ] **Step 1: Write the schema**

```ts
// packages/db/src/schema/user-job.schema.ts
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

export const userJob = pgTable(
  "user_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    freehireSlug: text("freehire_slug").notNull(),
    title: text("title").notNull(),
    companyName: text("company_name").notNull(),
    companySlug: text("company_slug"),
    companyLogoUrl: text("company_logo_url"),
    listingUrl: text("listing_url").notNull(),
    location: text("location"),
    workMode: text("work_mode"),
    employmentType: text("employment_type"),
    seniority: text("seniority"),
    experienceYearsMin: integer("experience_years_min"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    skills: jsonb("skills").$type<string[]>().default([]).notNull(),
    category: text("category"),
    domains: jsonb("domains").$type<string[]>().default([]).notNull(),
    summary: text("summary"),
    description: text("description"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    reality: text("reality"),
    source: text("source"),
    queryHash: text("query_hash").notNull(),
    queryFilters: jsonb("query_filters").$type<Record<string, unknown>>().notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("user_job_user_slug_uidx").on(table.userId, table.freehireSlug),
    index("user_job_user_seen_idx").on(table.userId, table.lastSeenAt),
    index("user_job_user_query_idx").on(table.userId, table.queryHash)
  ]
);
```

(Match the exact id/audit column idioms used by `job-posting.schema.ts` — if that file uses `createId()`/`$defaultFn`, copy it.)

- [ ] **Step 2: Add `application.jobId`** — in `application.schema.ts`, next to the old `postingId` (keep `postingId` for now; it is dropped in Task 9):

```ts
jobId: text("job_id").references(() => userJob.id, { onDelete: "set null" }),
```

and an index `application_job_id_idx`. Export `userJob` from `packages/db/src/schema/index.ts`.

- [ ] **Step 3: Generate + apply migration**

```bash
vp run db:generate   # inspect generated SQL in packages/db/migrations/ before applying
vp run db:migrate
```

- [ ] **Step 4: Write repository** — `user-job.repository.ts` with:

```ts
export const userJobRepository = {
  upsertMany(userId: string, rows: NewUserJob[]): Promise<number>, // keyed (userId, freehireSlug); on conflict update snapshot fields + lastSeenAt=now; keep firstSeenAt
  listUnlanded(input: { userId, excludeUrls: string[], excludeJobIds: string[], limit }): Promise<UserJobEntity[]>, // current queryHash only, lastSeenAt desc
  countUnlanded(input): Promise<number>,
  purgeStale(cutoff: Date): Promise<number>, // delete lastSeenAt < cutoff AND id not referenced by application.jobId
  countByUser(userId): Promise<number>
};
```

Follow the existing repository idioms (drizzle `insert ... onConflictDoUpdate`, `db.query` style) from `job-posting.repository.ts` before it is deleted — copy patterns, then Task 10 removes the old file.

- [ ] **Step 5: Repository unit test** — mirror the mocked-`getDb()` pattern in `packages/db/src/repositories/__tests__/stack-dependency.repository.test.ts`: assert `upsertMany` issues onConflictDoUpdate keyed on `(userId, freehireSlug)` and does NOT touch `firstSeenAt`; `purgeStale` filters referenced ids.

```bash
cd packages/db && vp test run
```

- [ ] **Step 6: Commit**

```bash
git add packages/db && git commit -m "feat(db): add user_job table and repository"
```

---

## Task 2: DB — `job_preference` facet columns (additive)

**Files:**

- Modify: `packages/db/src/schema/job-preference.schema.ts`

- [ ] **Step 1: Add facet columns** (additive only — old columns dropped in Task 9):

```ts
regions: jsonb("regions").$type<string[]>(),
countries: jsonb("countries").$type<string[]>(),
cities: jsonb("cities").$type<string[]>(),
categories: jsonb("categories").$type<string[]>(),
skills: jsonb("skills").$type<string[]>(),
seniority: jsonb("seniority").$type<string[]>(),
experienceYearsMin: integer("experience_years_min"),
experienceYearsMax: integer("experience_years_max"),
employmentTypes: jsonb("employment_types").$type<string[]>(),
companyTypes: jsonb("company_types").$type<string[]>(),
companySizes: jsonb("company_sizes").$type<string[]>(),
domains: jsonb("domains").$type<string[]>(),
collections: jsonb("collections").$type<string[]>(),
openWithinDays: integer("open_within_days"),
reality: jsonb("reality").$type<string[]>(),
visaSponsorship: boolean("visa_sponsorship"),
requiresClearance: boolean("requires_clearance")
```

All nullable (null = "not configured"; cron skips those users).

- [ ] **Step 2:** `vp run db:generate && vp run db:migrate` (inspect SQL first).

- [ ] **Step 3: Commit** — `feat(db): add freehire facet columns to job_preference`

---

## Task 3: Core — facet enums, preference types, query hash

**Files:**

- Create: `packages/core/src/job-discovery/facets.ts`, `packages/core/src/job-discovery/query-hash.ts`
- Modify: `packages/core/src/job-preference/types.ts` (schemas L98–L111), `packages/core/src/job-discovery/index.ts` (exports)
- Test: `packages/core/src/job-discovery/__tests__/facets.test.ts`, `__tests__/query-hash.test.ts`

- [ ] **Step 1: Failing tests for facet whitelists** — table-driven: every value in the freehire docs vocabulary parses, bogus values reject.

```ts
// facets.test.ts sketch
it.each([
  ["work_mode", ["remote", "hybrid", "onsite"]],
  ["seniority", ["intern", "junior", "middle", "senior", "lead", "staff", "principal", "c_level"]],
  ["employment_type", ["full_time", "part_time", "contract", "internship", "fellowship"]],
  [
    "company_type",
    ["product", "startup", "outsource", "outstaff", "agency", "inhouse", "government"]
  ],
  ["company_size", ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]],
  ["reality", ["fresh", "stale", "likely-evergreen"]],
  [
    "regions",
    ["global", "north_america", "latam", "eu", "uk", "mena", "africa", "apac", "cis", "none"]
  ]
])("%s whitelist", (facet, values) => {
  for (const v of values) expect(FACETS[facet].safeParse(v).success).toBe(true);
  expect(FACETS[facet].safeParse("bogus").success).toBe(false);
});
// categories: assert a stable sample from the docs list (backend, frontend, ml_ai, ...) and count >= 45
```

- [ ] **Step 2: Implement `facets.ts`** — one zod enum per facet (copy value lists verbatim from the spec §4 / freehire docs), plus:

```ts
export const FACET_KEYS = [
  "regions",
  "countries",
  "cities",
  "categories",
  "skills",
  "seniority",
  "employmentTypes",
  "companyTypes",
  "companySizes",
  "domains",
  "collections",
  "reality"
] as const;
export type FacetKey = (typeof FACET_KEYS)[number];
export const SALARY_CURRENCIES = ["USD", "EUR", "GBP", "RUB"] as const;
```

- [ ] **Step 3: Failing test for `queryHash`** — same filters (any key order) → same hash; any value change → different hash.

- [ ] **Step 4: Implement `query-hash.ts`** — canonical JSON (sorted keys, sorted array values, trimmed strings), SHA-256 hex, prefix 16 chars is enough.

- [ ] **Step 5: Rewrite `packages/core/src/job-preference/types.ts`** — facet-shaped schemas:

```ts
// JobPreferenceOutputSchema / UpsertJobPreferenceInputSchema gain the facet fields (all optional/nullable)
// REMOVED from both: titleId, customTitle, jobsPerRun, levelFloor, roleKeywords?, excludeKeywords, locations, remoteRegions, workModes?
// KEPT: searchBrief*, minMatchScore, dailyBoardScoreCap, importFromEmail, reviewApplyKit
// roleKeywords is KEPT as the `q` keywords facet (renamed conceptually, same column)
// workModes is KEPT (maps 1:1 to freehire work_mode)
```

Note: `roleKeywords` and `workModes` survive as the freehire `q` and `work_mode` facets — this preserves cheap continuity for the scorer; everything else is new.

- [ ] **Step 6:** `vp check` in packages/core + packages/api (api compiles against new types will break until Task 4/5 — that's expected mid-branch; keep going).

- [ ] **Step 7: Commit** — `feat(core): freehire facet whitelists and facet-shaped job preference`

---

## Task 4: Core — scorer/budget/title-gate rework

**Files:**

- Modify: `packages/core/src/job-discovery/cheap-score.ts` (L27 `scoreCatalogAgainstPreference`), `two-axis.ts` (`TwoAxisPrefs` mapping), `land-budget.ts` (L16 `computeLandBudget`), `shelf.ts`, `constants.ts`
- Delete (in code + exports + tests): `title-packs.ts`, `title-packs.test.ts`; constants: `JOB_TITLE_PACK_IDS`, `JobTitlePackId/JobTitleId`, `TITLE_PACKS`, `JOB_ADAPTER_IDS`, `JobAdapterId`, `JOB_ADAPTER_LABELS`, `FREEHIRE_ATS_SOURCES`, `FreehireAtsSource`, `refineJobsPerRun`, jobsPerRun bounds
- Add: `DISCOVERY_FETCH_POOL_SIZE = 100`, `USER_JOB_TTL_MS = 30d`, `DISCOVERY_ACTIVITY_WINDOW_MS = 7d`, `hasValidRoleQuery()` (replace `title-packs.ts` `hasValidDiscoveryTitle`)
- Modify: `packages/core/src/job-preference/search-brief.ts` (L3 imports `TITLE_PACKS` — replace pack-label line with roleKeywords/categories-derived label)
- Test: update `packages/core/src/job-discovery/__tests__/` (delete `title-packs.test.ts`; update `cheap-score`/`two-axis`/`land-budget`/`ttl` tests)

- [ ] **Step 1: Rewrite tests first** — cheap-score and two-axis tests against the facet-shaped preference: salary floor in facet currency, `experienceYearsMin` cap via existing `applyYearsCap`, work-mode from facet, region/keyword scoring unchanged in shape.

- [ ] **Step 2: Implement** — keep function signatures where possible:

```ts
scoreCatalogAgainstPreference(candidate: { title, companyName, location, workMode, skills, salaryMin, salaryCurrency }, prefs: JobPreferenceOutput) // same shape, new prefs
computeLandBudget(input: { poolSize, openInbox, inboxThisRun, remainingDailyAiAttempts, hasAiKey }) // jobsPerRun → poolSize (DISCOVERY_FETCH_POOL_SIZE)
hasValidRoleQuery({ roleKeywords, categories }): boolean // non-empty either
```

`decideTwoAxis` keeps its shape; callers map new facets → `TwoAxisPrefs` (workModes from `workModes`, regions from `regions`, locations from `cities`).

- [ ] **Step 3: Update `job-preference/search-brief.ts`** — brief label from roleKeywords/categories (no pack).

- [ ] **Step 4:** `cd packages/core && vp test run && vp check` — core must be fully green here.

- [ ] **Step 5: Commit** — `feat(core): facet-driven scoring, budget, role gate; remove title packs and adapter constants`

---

## Task 5: API — freehire client (query builder, map, HTTP)

**Files:**

- Create: `packages/api/src/lib/job-discovery/freehire/client.ts`, `freehire/query-builder.ts`, `freehire/map.ts`
- Create fixtures: `packages/api/src/lib/job-discovery/freehire/__fixtures__/agent-search.json` (trimmed live response, 3–4 jobs incl. one thin `enrichment_version: 0`)
- Test: `packages/api/src/lib/job-discovery/freehire/__tests__/{query-builder,map,client}.test.ts`
- Add dep: `sanitize-html` + `@types/sanitize-html` to `packages/api` (`pnpm --filter @tsu-stack/api add sanitize-html && pnpm --filter @tsu-stack/api add -D @types/sanitize-html`)

- [ ] **Step 1: Fixture** — capture a live sample (task writer may re-run):

```bash
curl -s "https://freehire.me/api/v1/agent/jobs/search?limit=4&seniority=senior&work_mode=remote&open_within_days=14" \
  > packages/api/src/lib/job-discovery/freehire/__fixtures__/agent-search.json
```

- [ ] **Step 2: Failing tests — query builder.** Table-driven: preference → query params; facet values not in whitelist are **dropped and reported**, not sent (spec §4.3: the API silently zero-results on bad values):

```ts
it("maps facets to params", () => {
  const { params, dropped } = buildFreehireQuery(
    preferenceWith({
      roleKeywords: ["go"],
      categories: ["backend"],
      seniority: ["senior"],
      regions: ["eu"],
      workModes: ["remote"],
      openWithinDays: 14,
      salaryMin: 100000,
      salaryCurrency: "USD",
      visaSponsorship: true,
      companyTypes: ["product"],
      collections: ["yc"]
    })
  );
  expect(params.get("q")).toBe("go");
  expect(params.get("category")).toBe("backend");
  expect(params.get("seniority")).toBe("senior");
  expect(params.get("regions")).toBe("eu");
  expect(params.get("work_mode")).toBe("remote");
  expect(params.get("open_within_days")).toBe("14");
  expect(params.get("salary_currency")).toBe("USD");
  expect(params.get("salary_min")).toBe("100000");
  expect(params.get("visa_sponsorship")).toBe("true");
  expect(params.get("company_type")).toBe("product");
  expect(params.get("collections")).toBe("yc");
  expect(params.get("limit")).toBe("100"); // DISCOVERY_FETCH_POOL_SIZE
  expect(params.get("sort")).toBe("created_at"); // freshest-first
  expect(params.get("order")).toBe("desc");
  expect(dropped).toEqual([]);
});
it("drops off-whitelist facet values", () => {
  /* seniority:["staff","bogus"] → param "staff", dropped:["seniority:bogus"] */
});
it("omits unset facets entirely", () => {
  /* empty preference → only limit/sort/order */
});
```

- [ ] **Step 3: Implement `query-builder.ts`** — `buildFreehireQuery(prefs): { params: URLSearchParams; filters: Record<string,unknown>; hash: string }`. Arrays join with `,` (OR semantics — correct default). Geography note: regions/countries/cities OR-widen on freehire; when only one geography facet is set, send only it (never merge all three).

- [ ] **Step 4: Failing tests — map.** Fixture-driven:

```ts
it("maps a rich job to a user_job row", () => {
  const row = toUserJobRow(sampleRichJob, { queryHash: "h", userId: "u1" });
  expect(row).toMatchObject({
    freehireSlug: sampleRichJob.public_slug,
    title: sampleRichJob.title,
    companyName: sampleRichJob.company,
    companySlug: sampleRichJob.company_slug,
    listingUrl: sampleRichJob.url,
    workMode: "remote",
    salaryMin: sampleRichJob.enrichment.salary_min,
    salaryCurrency: "USD",
    experienceYearsMin: sampleRichJob.enrichment.experience_years_min,
    seniority: "senior",
    category: sampleRichJob.enrichment.category
  });
  expect(row.description).not.toMatch(/<script|onerror/i); // sanitized
  expect(row.skills).toEqual(sampleRichJob.skills);
  expect(new Date(row.postedAt).toISOString()).toBe(sampleRichJob.posted_at);
});
it("survives a thin enrichment_version:0 stub", () => {
  /* salary/years/seniority null, title/company/url still set */
});
```

- [ ] **Step 5: Implement `map.ts`** — `toUserJobRow(job: FreehireAgentJob, meta): NewUserJob`. Sanitize `description` with `sanitize-html` (allow basic tags: p, br, ul/ol/li, strong, em, a[href http/https], strip scripts/styles/event handlers/iframe). `reality` from `job.reality.class`; `summary` from `enrichment.summary`; `source` from `job.source`.

- [ ] **Step 6: Failing tests + implementation — `client.ts`.**

```ts
export type FreehireSearchResult = { jobs: FreehireAgentJob[]; total: number };
export async function searchFreehireJobs(
  params: URLSearchParams,
  opts?: { signal?: AbortSignal }
): Promise<FreehireSearchResult>;
// - base URL from `resolveFreehireBaseUrl()` — const `https://freehire.me/api/v1`, overridable via server env `FREEHIRE_API_BASE_URL`
//   (register it in the server env surface per .agents/environment-variables.md; enables the Task 13 fail-soft drill)
// - GET {base}/agent/jobs/search?...
// - parse { data, meta } envelope; throw on non-2xx with {error} body text
// - log wide event: status, meta.total, x-ratelimit-remaining/limit, meta.ignored_params (warn when non-empty), durationMs
// - abort/timeout 15s; network/5xx throw → caller fails soft
```

Mock `fetch` in tests (vi.stubGlobal) — one test asserts ignored_params is logged.

- [ ] **Step 7:** `cd packages/api && vp test run && vp check` (job-discovery old files may still reference deleted core exports — if so, land Task 6 before green; prefer doing Tasks 5+6 in one session).

- [ ] **Step 8: Commit** — `feat(api): freehire search client with validated facet query builder`

---

## Task 6: API — fetch module + land/inbox-ai re-point

**Files:**

- Create: `packages/api/src/lib/job-discovery/fetch.ts`, `packages/api/src/lib/job-discovery/enrollment.ts`
- Modify: `land.ts` (L169 `runDiscoveryLand`), `inbox-ai.ts` (posting path L539 `runInboxAiForPosting`, insert L311 sets `jobId`), `enqueue.ts` (payload schemas + land trigger)
- Delete: `hydrate.ts` (remove `hydratePostingIfNeeded` from `land.ts:145` and `inbox-ai.ts:422,555`), `content-hash.ts`, `raw.ts`, `leftover-extract.ts` (verify zero remaining imports first — `rg "from \"#@/lib/job-discovery/(hydrate|content-hash|raw|leftover-extract)"`)
- Modify tests: `__tests__/land-select.test.ts`, `__tests__/find-now-shelf.test.ts`, `__tests__/inbox-ai-decision.test.ts`; new `__tests__/fetch.test.ts`, `__tests__/enrollment.test.ts`

- [ ] **Step 1: Failing test — fetch** (mock client + repository):

```ts
it("fetches with built query and upserts rows under one queryHash", async () => {
  await fetchUserJobs({ userId: "u1", preference: prefsWithFacets });
  expect(searchFreehireJobs).toHaveBeenCalledWith(
    expect.objectContaining({ get: expect.any(Function) })
  );
  expect(userJobRepository.upsertMany).toHaveBeenCalledWith(
    "u1",
    expect.arrayContaining([
      expect.objectContaining({ freehireSlug: expect.any(String), queryHash: expect.any(String) })
    ])
  );
});
it("returns failure info on client throw (fail soft)", async () => {
  /* { ok: false } — no upsert */
});
```

- [ ] **Step 2: Implement `fetch.ts`** — `fetchUserJobs({ userId, preference }): Promise<{ ok: boolean; total?: number }>`. Build query → `searchFreehireJobs` → map rows (stamp `queryHash` + `queryFilters`) → `userJobRepository.upsertMany`. Any throw → wide-event log + `{ ok: false }`.

- [ ] **Step 3: Failing test — enrollment.**

```ts
// listEnrolledUserIds(now): users where
//   (a) job_preference has roleKeywords OR categories non-null/non-empty, AND
//   (b) EXISTS session with updatedAt > now - 7d  (packages/db/src/schema/auth.schema.ts:29 — updatedAt auto-bumps on use)
it("excludes users without role facets");
it("excludes users inactive > 7 days");
it("includes active users with facets");
```

Implement in `enrollment.ts` with a drizzle query joining `jobPreference` + `session` (distinct userId). Keep the SQL in the api lib (it spans two tables); repository stays per-table.

- [ ] **Step 4: Rewrite `land.ts`.** Diff shape of `runDiscoveryLand`:

- Title gate: `hasValidDiscoveryTitle({...})` (L179) → `hasValidRoleQuery({ roleKeywords, categories })`; reason `"title_required"` kept (router + hub tool copy unchanged).
- Budget: `remainingLandBudget` L112 — drop `jobsPerRun`, pass `DISCOVERY_FETCH_POOL_SIZE`.
- Shelf: L206 `jobPostingRepository.listOpenForLand({excludeUrls, excludePostingIds})` → `userJobRepository.listUnlanded({ userId, excludeUrls, excludeJobIds: seen.jobIds, limit: DISCOVERY_FETCH_POOL_SIZE })`; `seen` from `applicationRepository.listUserUrlsAndPostingIds` (L675) — extend that repo fn to also return `jobIds` (it currently selects urls + postingIds; same query, new column).
- Cheap score: same call, `posting` fields from the user_job row.
- `enqueueEvaluateIfPassed` L138: **delete the hydrate hop** — user_job already carries description + workMode + location + hiringRegion (map `regions` at fetch time into the two-axis prefs, not per-row). Closed check (L147) → drop (no closed columns); thin-JD check stays.
- `requestJobInboxAi({ userId, runId, postingId })` → `{ userId, runId, jobId }` (payload schema in `packages/core/src/job-discovery/queue.ts` L69–95 updated).
- **Fetch-before-land:** the land run itself performs the fetch first: `const fetched = await fetchUserJobs({ userId, preference: prefs }); if (!fetched.ok) return { landed: 0, reason: "fetch_failed" };` — one function per user per trigger. Add `"fetch_failed"` to `DiscoveryLandResult.reason`.

- [ ] **Step 5: Re-point `inbox-ai.ts`.** `runInboxAiForPosting` (L539) reads `jobPostingRepository.findById` → `userJobRepository.findById(jobId)` (add to repo). `insertDiscoveryApplication` (L311): `postingId: input.posting.id` (L367) → `jobId: input.job.id`; denormalized fields (title/company/salary/logo/years) from the user_job snapshot (same columns exist). `FREEHIRE_SOURCE_LABELS` (L75) may stay for display.

- [ ] **Step 6:** Update the three touched test files; new `fetch.test.ts`. `cd packages/api && vp test run` — green.

- [ ] **Step 7: Commit** — `feat(api): per-user freehire fetch feeds land pipeline via user_job`

---

## Task 7: Queues — fetch tick + inbox tick

**Files:**

- Create: `apps/server/src/queues/job-discovery-fetch-queue.ts`, `apps/server/src/queues/job-inbox-tick-queue.ts`
- Create: `packages/api/src/lib/job-discovery/tick.ts`
- Delete: `apps/server/src/queues/job-catalog-ingest-queue.ts`, `apps/server/src/queues/job-inbox-liveness-queue.ts`
- Modify: `apps/server/src/index.ts:154-206` (registration), `packages/api/src/lib/job-discovery/enqueue.ts` (drop `registerJobCatalogIngestEnqueue`/`requestJobCatalogIngest`)

- [ ] **Step 1: `job-discovery-fetch-queue.ts`** — pattern-copy from `job-catalog-ingest-queue.ts` (queue + worker + repeat + stop):

```ts
// One 24h repeatable tick, jobId "job-discovery-fetch-tick", repeat.every 24h (reuse INGEST_TICK_INTERVAL_MS value)
// Worker: const userIds = await listEnrolledUserIds(new Date());
//   for each user: delay = hashToDelay(userId) // stable hash of userId mod 24h
//   enqueue land job: jobId land_${userId} (reuse core landJobId + the coalesce helper from job-discovery-land-queue.ts:100-112),
//     payload { userId, runId: `cron_<utcDay>` }, job.delay(delay)
// No freehire HTTP happens in the tick — only the staggered enqueue.
```

Deterministic delay: `hashToDelay(userId)` = FNV-1a or simple char-code fold of userId % 86_400_000 — unit-testable pure fn (export it).

- [ ] **Step 2: `tick.ts` + `job-inbox-tick-queue.ts`** — gut of `liveness.ts` runInboxLivenessTick (L28): keep **only**:

- `expired` inbox dismissal (L76–81, `isInboxExpired`, `dismissInbox` helper L158)
- `runSilenceTick(now)` (L84 — silence nudges are product behavior, preserved)
- NEW: `userJobRepository.purgeStale(new Date(now.getTime() - USER_JOB_TTL_MS))`

Delete: all probe code (L33–74, L89–156), `dismissClosedListingInbox` (postings are gone), `deleteClosedUnreferenced`. 12h repeat interval as today (`LIVENESS_TICK_INTERVAL_MS` value). New repeat jobId `job-inbox-tick`.

- [ ] **Step 3: Wire `apps/server/src/index.ts`** — replace catalog-ingest registration (L184–188) with `startJobDiscoveryFetchQueue` + its enqueue registration; replace liveness registration (L199) with `startJobInboxTickQueue`. Update `registerJobDiscoveryLandEnqueue`/`registerJobInboxAiEnqueue` signatures in `enqueue.ts` (they now accept `jobId` payload changes from Step 4/6 of Task 6).

- [ ] **Step 4: Commit** — `feat(server): staggered per-user fetch tick; gutted inbox tick (ttl+silence+purge)`

---

## Task 8: Router — findNow rewrite + settings-save hook

**Files:**

- Modify: `packages/api/src/routers/job-discovery.router.ts` (L46–144), `packages/api/src/routers/job-preference.router.ts` (L103–150)
- Modify tests: `packages/api/src/lib/job-discovery/__tests__/find-now-shelf.test.ts`

- [ ] **Step 1: Rewrite `findNow`.** Body keeps: title gate (now `hasValidRoleQuery`, reason `"title_required"`), `MAX_OPEN_INBOX` seats check, AI budget check, budget-exhausted reason `"ai_budget"`. Changes:

- `countTwoAxisUnseenShelf` (L30–43) reads `userJobRepository` (current queryHash, unlanded) instead of `listOpenForLand`.
- No ingest path: always `requestJobDiscoveryLand({ userId, runId: find_${userId}_${randomUUID()} })`, respond `{ reason: "ok" }`. Output schema `FindJobsNowOutputSchema` unchanged — **keep the `ingestTriggered` field, always `false`** (it is read by `find-jobs-now-job.tsx` step labels/polling, `find-jobs-now-store.ts`, and `find-jobs-now-tool-ui.tsx`; `false` routes them to the non-ingest variants, which is correct for freehire-only). Do not drop the field.

- [ ] **Step 2: Settings-save hook.** In `jobPreference` `upsert.handler`, after `jobPreferenceRepository.upsert` (L125) alongside `invalidateSearchBrief` (L146):

```ts
if (hasValidRoleQuery({ roleKeywords: merged.roleKeywords, categories: merged.categories })) {
  await requestJobDiscoveryLand({ userId, runId: `save_${new Date().toISOString().slice(0, 13)}` }); // hourly coalesce → triple-saves collapse
}
```

Guard with queue-availability check mirroring the existing `REDIS_URL` gating (the land enqueue registrar returns null when unset — same behavior as today's land requests).

- [ ] **Step 3:** `vp check` in packages/api + apps/server. Commit — `feat(api): findNow + settings-save trigger immediate per-user land`

---

## Task 9: Migration — repoint applications, reset preferences, drop shared tables

**Files:**

- Create: `packages/db/scripts/migrate-postings-to-user-jobs.ts`
- Modify: `packages/db/src/schema/job-preference.schema.ts` (drop old cols), `application.schema.ts` (drop `postingId` L138 + index L168), delete `job-posting.schema.ts`, `job-company.schema.ts`; `schema/index.ts` exports
- Delete: `packages/db/src/repositories/job-posting.repository.ts`, `job-company.repository.ts` + their `__tests__` if any

**Order matters: script BEFORE the dropping migration.**

- [ ] **Step 1: One-off script.** `packages/db/scripts/migrate-postings-to-user-jobs.ts` (dotenvx-load env like other db scripts; run with `pnpm --filter @tsu-stack/db exec tsx scripts/migrate-postings-to-user-jobs.ts` — check `packages/db/package.json` for the established script-runner pattern and mirror it):

```ts
// 1. SELECT a.*, jp.* FROM application a JOIN job_posting jp ON a.posting_id = jp.id WHERE a.posting_id IS NOT NULL
// 2. For each: slug = jp.adapter_id === "freehire" ? jp.external_id : `legacy-${jp.adapter_id}-${jp.external_id}`
//    INSERT INTO user_job (id, user_id, freehire_slug, title, company_name, ..., query_hash = "legacy", query_filters = {legacy:true}, first_seen_at = jp.first_seen_at, last_seen_at = jp.last_seen_at)
//    ON CONFLICT (user_id, freehire_slug) DO NOTHING
// 3. UPDATE application SET job_id = (SELECT id FROM user_job WHERE user_id = a.user_id AND freehire_slug = slug) WHERE a.posting_id = jp.id
// 4. Null only the NULLABLE old columns (rule #7 reset):
//    UPDATE job_preference SET title_id = NULL, custom_title = NULL, level_floor = NULL;
//    NOT NULL DEFAULT columns (locations, remote_regions, exclude_keywords, jobs_per_run, work_modes, role_keywords)
//    are NOT nulled here — that would violate their constraints; the Step 3 dropping migration removes them,
//    which completes the reset. (roleKeywords + workModes survive as freehire q / work_mode facets; salary stays)
// 5. Log counts: postings copied, applications repointed, prefs nulled. Idempotent (safe re-run).
```

- [ ] **Step 2: Run script against local dev DB; verify counts** (spot-check one known application row).

- [ ] **Step 3: Dropping migration** — edit schemas (drop `postingId` + index, drop old preference columns `titleId`, `customTitle`, `levelFloor`, `excludeKeywords`, `locations`, `remoteRegions`, `jobsPerRun`, `workModes`?? **NO — `workModes` survives**, drop `jobPosting`/`jobCompany` files + index exports), then:

```bash
vp run db:generate && vp run db:migrate
```

- [ ] **Step 4: Update code references** — `rg "jobPostingRepository|jobCompanyRepository|postingId" packages apps` → fix compile breaks (expected: `application.repository.ts` L249/L302/L598/L675-698/L738/L752 liveness+insert paths — liveness ones die with Task 7; insert path already uses `jobId`).

- [ ] **Step 5: Commit** — `feat(db): migrate postings to user_job, reset preferences, drop shared catalog`

---

## Task 10: Delete dead code (adapters, ingest, title packs, liveness probes)

**Files (delete):**

- `packages/api/src/lib/job-discovery/adapters/` (entire dir incl. `__tests__` + `__fixtures__`)
- `packages/api/src/lib/job-discovery/ingest.ts`, `liveness.ts` (logic already moved to `tick.ts` in Task 7)
- `packages/core/src/job-discovery/title-packs.ts` (+ test — already gone in Task 4)
- `packages/core/src/job-discovery/ttl.ts` — keep only the helpers `tick.ts` still uses (`isInboxExpired`); delete posting-TTL exports
- `packages/api/src/lib/job-discovery/fetch-json.ts`, `content-hash.ts`, `raw.ts`, `leftover-extract.ts` (if not already removed in Task 6)
- Core `index.ts` re-exports of deleted modules; `packages/core/src/job-discovery/constants.ts` leftovers (Task 4 removed most)

**Files (modify):**

- `apps/web/src/pages/community-landing/ui/faqs-section.tsx:82`, `integrations-section.tsx:97-99` — copy now names dead boards; rewrite copy to freehire-only
- `.agents/skills/ai-feature-harness/LESSONS.md` — **do not touch** (history)

- [ ] **Step 1:** `rg -l "jobSourceAdapters|planIngestQueries|NormalizedListing|TITLE_PACKS|FREEHIRE_ATS_SOURCES|refineJobsPerRun|applyTitlePack|ingestQueryKey|fetchNormalizedListings|listOpenForLand|markClosed" packages apps` — every hit must be deleted or updated.
- [ ] **Step 2:** Full build: `vp run build` then `vp run -w fix`.
- [ ] **Step 3:** `vp run test:unit:run` — all green.
- [ ] **Step 4:** Commit — `chore: delete adapter framework, shared catalog ingest, and title packs`

---

## Task 11: Web — settings UI rewrite (facet sections)

**Files:**

- Modify: `apps/web/src/features/job-preference/lib/job-preference-form.ts` (facet form state + option lists), `apps/web/src/features/job-preference/ui/job-preference-fields.tsx` (full rewrite, ~7 grouped sections), `apps/web/src/features/job-preference/index.ts`
- Reference skill before UI work: `.agents/ui.md`; chips pattern from `apps/web/src/widgets/items-page` (`FilterChip` family) and the existing multi-select pattern already used for `workModes` (L132) — follow the form's existing `withForm` idioms rather than introducing a new widget family.

- [ ] **Step 1: Form state** — `emptyJobPreferenceForm` gains facet fields; `JOB_PREFERENCE_LEVEL_FLOOR_OPTIONS`, `JOB_TITLE_PACK_OPTIONS` deleted; add option consts from core `facets.ts` (regions, work_mode, employment_type, seniority, company_type, company_size, domains, collections, reality); `salaryCurrencyOptions` restricted to USD/EUR/GBP/RUB.

- [ ] **Step 2: Fields rewrite** — sections in order (spec §6): **Where** (regions chips, countries autocomplete, cities autocomplete), **Role** (roleKeywords text, categories chips, skills chips), **Level** (seniority chips, experience min/max numbers), **Terms** (workModes chips, employmentTypes chips, salaryMin + currency, visaSponsorship + requiresClearance toggles), **Companies** (companyTypes, companySizes, domains, collections chips), **Freshness** (openWithinDays number, reality chips), **Scoring** (dailyBoardScoreCap slider + meter + "Clear today", minMatchScore slider — both kept verbatim), **Intake** (importFromEmail, reviewApplyKit — kept verbatim).

  - Multi-value chips: multi-select component already used by workModes field — reuse for every facet list. For countries/cities use the `/geo/cities` autocomplete: add a small oRPC procedure `jobDiscovery.searchCities({ q })` proxying `https://freehire.me/api/v1/geo/cities?q=` (server-side, cached 1h in-memory map) so the browser never hits freehire directly.
  - Geography help copy: "Jobs in **any** of these places" (freehire OR-widens).
  - Removed: title combobox + custom title, level floor, jobsPerRun slider, separate locations/remoteRegions lists, excludeKeywords.

- [ ] **Step 3: Mutations** — `upsert-job-preference.mutation.ts` unchanged wire-wise (new input schema from Task 3 flows through); verify the "Find jobs now" button + budget meter still work (`new-jobs-discovery-actions.tsx`, `find-jobs-now-job.tsx` — no changes expected).

- [ ] **Step 4:** `cd apps/web && vp check` + manual smoke: `pnpm run dev` → settings/jobs renders all sections; saving enqueues (server log shows land job); New Jobs page unaffected.

- [ ] **Step 5: Commit** — `feat(web): facet-grouped job settings`

---

## Task 12: Docs + glossary

**Files:**

- Modify: `CONTEXT.md` (add: `user_job`, freehire facets, per-user fetch; update job-discovery terms that referenced the shared catalog)
- Modify: `AGENTS.md` — add plan link next to the spec link (already linked spec)
- Modify: `docs/superpowers/specs/2026-09-05-freehire-only-job-discovery-design.md` — status → `Implemented (plan: …)`

- [ ] **Step 1:** CONTEXT.md glossary rows + fix any `job_posting` references in `.agents/` docs (`rg -l "job_posting|job posting" .agents CONTEXT.md`).
- [ ] **Step 2: Commit** — `docs: freehire-only discovery glossary and status`

---

## Task 13: End-to-end verification + hardening

- [ ] **Step 1: Fresh DB run** — `pnpm run dev` (applies migrations), sign in, set facets in settings → confirm immediate land job runs, freehire rows appear in `user_job` (drizzle studio), applications appear in New Jobs.
- [ ] **Step 2: Triggers** — change a facet → new land run within seconds; press Find jobs now → immediate; save repeatedly within an hour → single land job (check BullMQ/redis UI or logs).
- [ ] **Step 3: Fail-soft** — point the fetch client at a bogus base URL via env override → land returns `fetch_failed`, previous shelf intact, no crash.
- [ ] **Step 4: Full validation** — `vp run build && vp run -w fix && vp run test:unit:run`.
- [ ] **Step 5: Run [ai-feature-harness](/Users/salah/Developer/devstack/.agents/skills/ai-feature-harness/SKILL.md)** — required by spec (New jobs flow, settings-change flow, manual find, hub tool). Append fresh hardening report + lessons to that skill's `LESSONS.md`.
- [ ] **Step 6:** Do NOT push/merge; report status to the user for review.

---

## Appendix A — Recon (current code map, pre-change)

Key anchors used by this plan (line numbers valid at plan time):

- Shared catalog: `packages/db/src/schema/job-posting.schema.ts` (L9–45), `job-company.schema.ts` (L7–28); repos `packages/db/src/repositories/job-posting.repository.ts` (upsert L82, `listOpenForLand` L212, `markClosed` L290, `deleteClosedUnreferenced` L307).
- Land: `packages/api/src/lib/job-discovery/land.ts` — gate L179, budget L112–135, shelf L205–209, cheap score L212–228, hydrate+enqueue L138–167, extra pass L277–289.
- Inbox AI: `inbox-ai.ts` — insert L311 (`postingId` L367), posting eval L539, `FREEHIRE_SOURCE_LABELS` L75.
- Liveness: `liveness.ts` — probes L28–149 (delete), inbox TTL dismissal L76–81 (keep), silence L84 (keep), `dismissInbox` L158 (keep).
- Ingest: `ingest.ts` (delete; callers: catalog queue + findNow only).
- Queues: `apps/server/src/queues/job-catalog-ingest-queue.ts` (repeat L113–122, delete), `job-discovery-land-queue.ts` (coalesce helper L100–112, keep), `job-inbox-liveness-queue.ts` (12h repeat L70–79, replace), worker wiring `apps/server/src/index.ts:154-206`.
- Router: `job-discovery.router.ts` findNow L46–144 (`countTwoAxisUnseenShelf` L30–43); `job-preference.router.ts` upsert L103–150 (hook point L143–149).
- Core: `constants.ts` (title packs L3–111, adapter ids L113–141, jobsPerRun L143–160), `title-packs.ts`, `queue.ts` payload schemas L69–95 (`landJobId` L14), `shelf.ts` L28, `cheap-score.ts` L27, `land-budget.ts` L16, `search-brief.ts` L3.
- Web: `features/job-preference/ui/job-preference-fields.tsx` (fields L75–303), `lib/job-preference-form.ts` (options), settings route `routes/(root-layout)/__protected/dashboard/settings/jobs/index.tsx`; New Jobs page reads applications (`applications.listPage`), not postings.
- Auth session (activity signal): `packages/db/src/schema/auth.schema.ts:29-47` — `updatedAt` `$onUpdate` bumps on use.
- Mail harvest: `apps/server/src/queues/run-mail-job-harvest.ts` — writes applications directly (no posting refs) → **no change**.
- Tests: `vp test run` package-local; monorepo `vp run test:unit:run`; repo test style mocked-getDb (`packages/db/src/repositories/__tests__/stack-dependency.repository.test.ts`).
- DB commands: `vp run db:generate` / `vp run db:migrate` (`.agents/workflow.md:44-57`).
