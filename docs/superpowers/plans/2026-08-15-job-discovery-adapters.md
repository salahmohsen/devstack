# Job Discovery Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill New jobs from free public job APIs through one adapter contract, a shared `job_posting` catalog, cheap preference ranking, then per-user BYO AI — with mail harvest opt-in (default off).

**Architecture:** Shared ingest writes `job_posting` (HTTP + ATS fields only, no communal LLM). Per-user land writes `application` inbox rows (`sourceTags` include `discovery`), hydrates the catalog JD once, then enqueues personal score/take on the user row. BullMQ workers own ingest, land, inbox AI, and liveness/TTL. Settings persist title pack + N + mail toggle on existing `job_preference`.

**Tech Stack:** `@tsu-stack/core` contracts, Drizzle/`packages/db`, oRPC/`packages/api`, BullMQ/`apps/server`, TanStack Query + existing form fields/`apps/web`. Reuse `scoreApplicationMatch` + `generateAgentTake` (no new Mastra agents).

**Spec:** `docs/superpowers/specs/2026-08-14-job-discovery-adapters-design.md`

**Skills after implementation:** [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) (Task 17) — required before claiming done.

**Workspace:** Start a feature branch / worktree. Do **not** mix this epic with the unrelated dirty web/UI/PDF/hub tree on `main`.

## Global Constraints

- Sources are **free official JSON only**: freehire search (ATS-gated) + Himalayas + Arbeitnow + Remotive + RemoteOK. No LinkedIn/Indeed HTML, no Workday, no JobSpy, no paid Apify/JobsPipe, no company watchlist, no first-party Greenhouse/Ashby/Lever adapters in v1.
- **No communal LLM.** Shared work is HTTP fetch + fields the source already sent. Personal score / take / field-fix use that user's BYO key on **their** `application` row only. Never write AI guesses onto `job_posting`.
- Never call freehire LLM, credits, or `/jobs/{slug}/match-analysis`. Use `GET https://freehire.me/api/v1/jobs/search` only.
- Cheap score **ranks** only (title + structured catalog fields). `minMatchScore` is the **AI** bar. Exclude keyword is a hard kill. Title-pack / custom keywords must hit the **title**.
- **N** = inbox rows **this run** that stay `inbox` after AI (cheap-passed if no key). Slider **15–40**, step **5**, default **25**. It is not “how many stubs we created.”
- Open inbox cap **50** (`trackingStatus=inbox`, including pending-AI stubs). Extra cheap hits stay on the shelf.
- Hidden daily AI cap = **2 × N attempts** per user per **UTC** day (default 50). Shared by cron, Find jobs now, backfill, and opt-in mail harvest. Increment on every model call (pass or fail). No key → do not decrement.
- No BYO key: **still land** (cheap score, no take). Find jobs now does **not** throw `AI_NOT_CONFIGURED`.
- TTL: 7 days from inbox `createdAt` for **new** `discovery` / post-ship mail-harvest rows. Existing inbox rows are **grandfathered** (`inboxExpiresAt` null). HTTP liveness at **~3.5 days**. Tracked never auto-dismissed (badge only).
- Mail harvest toggle `importFromEmail` default **off** for everyone. Classify + Scan must **not** enqueue harvest when off. Status/recruiter CRM tracking unchanged.
- Header default = **Find jobs now**. **Scan job alerts** only when the mail toggle is on.
- Dedup: `canonicalizeJobUrl` first. User unique `(userId, url)`. Catalog unique `(adapterId, externalId)`. Skip land if the user already has that URL in **any** `trackingStatus`.
- Ingest is **shared** (distinct active queries + feeds). Land is **per-user**. Remotive ~4 requests/day is **global** for our server.
- Attribution: show source name + original listing URL. Do not republish listings.
- Adapters live in `packages/api` (HTTP). Types, packs, cheap score, land-budget math live in `packages/core` (no network).
- Hydrate catalog `description` **before** enqueueing personal AI.
- After implementation, run app-ai-feature-hardening (fresh loop, report, append `LESSONS.md`). Do not claim done on unit tests alone.
- Commits: conventional commits. Subject ≤72 chars. Do not commit unrelated dirty files.
- Tests: colocate `src/**/__tests__/*.test.ts`. Run with `vp test run <file>` from the package. Prefer fixtures over live HTTP.

---

## File map

| Path                                                            | Responsibility                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/core/src/job-discovery/constants.ts`                  | Adapter ids, ATS allowlist, N/cap/TTL numbers, pack table, queue names                             |
| `packages/core/src/job-discovery/types.ts`                      | Zod: `NormalizedListing`, adapter fetch input, land/findNow payloads                               |
| `packages/core/src/job-discovery/title-packs.ts`                | Pack lookup, `applyTitlePack`, `effectiveRoleKeywords`, `hasValidDiscoveryTitle`, `ingestQueryKey` |
| `packages/core/src/job-discovery/cheap-score.ts`                | Structured cheap score (no JD HTML, no `minMatchScore` hard-skip)                                  |
| `packages/core/src/job-discovery/land-budget.ts`                | `computeLandBudget`                                                                                |
| `packages/core/src/job-discovery/index.ts`                      | Barrel                                                                                             |
| `packages/core/src/job-preference/types.ts`                     | `titleId`, `customTitle`, `jobsPerRun`, `importFromEmail`                                          |
| `packages/core/src/job-preference/utils.ts`                     | defaults + merge for new fields                                                                    |
| `packages/core/src/application/types.ts`                        | `discovery` source tag; `listingClosed`; findNow schemas                                           |
| `packages/core/src/application/utils.ts`                        | `buildApplicationSourceTags` channel + labels                                                      |
| `packages/db/src/schema/job-posting.schema.ts`                  | Shared catalog table                                                                               |
| `packages/db/src/schema/user-job-ai-budget.schema.ts`           | Daily attempt counter                                                                              |
| `packages/db/src/schema/job-preference.schema.ts`               | New preference columns                                                                             |
| `packages/db/src/schema/application.schema.ts`                  | `postingId`, `inboxExpiresAt`, `discoveryRunId`                                                    |
| `packages/db/src/repositories/job-posting.repository.ts`        | Upsert by `(adapterId, externalId)`, hydrate, close                                                |
| `packages/db/src/repositories/user-job-ai-budget.repository.ts` | Atomic increment under cap                                                                         |
| `packages/api/src/lib/job-discovery/adapters/*.ts`              | HTTP adapters + registry                                                                           |
| `packages/api/src/lib/job-discovery/ingest.ts`                  | Distinct-query ingest + feeds                                                                      |
| `packages/api/src/lib/job-discovery/hydrate.ts`                 | Shared HTTP JD extract → catalog                                                                   |
| `packages/api/src/lib/job-discovery/land.ts`                    | Per-user land loop                                                                                 |
| `packages/api/src/lib/job-discovery/inbox-ai.ts`                | Score + take; dismiss + retrigger                                                                  |
| `packages/api/src/lib/job-discovery/liveness.ts`                | HTTP close + 7-day dismiss                                                                         |
| `packages/api/src/routers/job-discovery.router.ts`              | `findNow`                                                                                          |
| `packages/api/src/lib/mail/harvest-enqueue-hook.ts` + classify  | Gate harvest on `importFromEmail`                                                                  |
| `apps/server/src/queues/job-*-queue.ts`                         | Ingest / land / inbox-ai / liveness workers                                                        |
| `apps/web` settings + new-jobs + tracked panel                  | Title combobox, N, toggle, Find jobs now, Scan gate, listing-closed                                |

---

### Task 1: Title packs + preference contracts

**Files:**

- Create: `packages/core/src/job-discovery/constants.ts`
- Create: `packages/core/src/job-discovery/title-packs.ts`
- Create: `packages/core/src/job-discovery/index.ts`
- Create: `packages/core/src/job-discovery/__tests__/title-packs.test.ts`
- Modify: `packages/core/src/job-preference/types.ts`
- Modify: `packages/core/src/job-preference/utils.ts`
- Modify: `packages/core/src/job-preference/constants.ts`
- Modify: `packages/core/src/job-preference/__tests__/utils.test.ts`
- Modify: `packages/core/src/index.ts` — add `export * from "#@/job-discovery/index";`

**Interfaces:**

- Consumes: existing `JobPreference` / `mergeJobPreference` / `defaultJobPreference`
- Produces:

```ts
export const JOB_TITLE_PACK_IDS = [
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "data_ml",
  "devops",
  "product",
  "design",
  "qa",
  "security",
  "eng_manager",
  "devrel",
  "data_analyst",
  "solutions"
] as const;
export type JobTitlePackId = (typeof JOB_TITLE_PACK_IDS)[number];
export type JobTitleId = JobTitlePackId | "custom";

export const DEFAULT_JOBS_PER_RUN = 25;
export const MIN_JOBS_PER_RUN = 15;
export const MAX_JOBS_PER_RUN = 40;
export const JOBS_PER_RUN_STEP = 5;
export const MAX_OPEN_INBOX = 50;
export const INBOX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LIVENESS_AFTER_MS = Math.floor(INBOX_TTL_MS / 2); // ~3.5d
export function dailyAiAttemptCap(jobsPerRun: number): number; // 2 * N

export function applyTitlePack(input: {
  nextTitleId: JobTitleId;
  previousTitleId: JobTitleId | null;
  currentKeywords: readonly string[];
}): string[];
export function effectiveRoleKeywords(input: {
  titleId: JobTitleId | null;
  roleKeywords: readonly string[];
}): string[];
export function hasValidDiscoveryTitle(input: {
  titleId: JobTitleId | null;
  customTitle: string | null;
  roleKeywords: readonly string[];
}): boolean;
export function ingestQueryKey(input: {
  titleId: JobTitleId | null;
  customTitle: string | null;
  roleKeywords: readonly string[];
}): string | null; // null if invalid
```

`JobPreference` / `JobPreferenceFieldsSchema` / `JobPreferenceSchema` / `JobPreferenceOutputSchema` / `UpsertJobPreferenceInputSchema` gain:

- `titleId: JobTitleIdSchema.nullable()` — default `null` (invalid until user picks)
- `customTitle: z.string().trim().max(120).nullable()` — default `null`
- `jobsPerRun: z.number().int().min(15).max(40)` — default `25`
- `importFromEmail: z.boolean()` — default `false`

Add `refineJobsPerRun(n)` that snaps to 15/20/25/30/35/40 (nearest step, clamp). Call it from merge and from the Zod transform on `jobsPerRun`.

`mergeJobPreference` copies the four new fields with the same “omit keeps current” rule as `minMatchScore`.

Seed keywords — copy **verbatim** from the spec title-packs table (`frontend` … `solutions`).

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/job-discovery/__tests__/title-packs.test.ts
import { describe, expect, it } from "vitest";
import {
  applyTitlePack,
  effectiveRoleKeywords,
  hasValidDiscoveryTitle,
  ingestQueryKey
} from "#@/job-discovery/title-packs";

describe("applyTitlePack", () => {
  it("replaces previous pack seeds and keeps extras", () => {
    const current = ["frontend", "react", "graphql"];
    expect(
      applyTitlePack({
        nextTitleId: "backend",
        previousTitleId: "frontend",
        currentKeywords: current
      })
    ).toEqual(expect.arrayContaining(["backend", "graphql"]));
    expect(
      applyTitlePack({
        nextTitleId: "backend",
        previousTitleId: "frontend",
        currentKeywords: current
      })
    ).not.toEqual(expect.arrayContaining(["frontend"]));
  });
});

describe("hasValidDiscoveryTitle", () => {
  it("accepts a pack even if extras are empty", () => {
    expect(
      hasValidDiscoveryTitle({ titleId: "frontend", customTitle: null, roleKeywords: [] })
    ).toBe(true);
  });
  it("rejects custom with fewer than 2 keywords", () => {
    expect(
      hasValidDiscoveryTitle({
        titleId: "custom",
        customTitle: "Frontend",
        roleKeywords: ["react"]
      })
    ).toBe(false);
  });
  it("accepts custom with title + ≥2 keywords", () => {
    expect(
      hasValidDiscoveryTitle({
        titleId: "custom",
        customTitle: "Platform",
        roleKeywords: ["sre", "kubernetes"]
      })
    ).toBe(true);
  });
  it("rejects unset title", () => {
    expect(
      hasValidDiscoveryTitle({ titleId: null, customTitle: null, roleKeywords: ["react"] })
    ).toBe(false);
  });
});

describe("ingestQueryKey", () => {
  it("is stable for the same pack", () => {
    expect(
      ingestQueryKey({ titleId: "frontend", customTitle: null, roleKeywords: ["graphql"] })
    ).toBe("pack:frontend");
  });
  it("sorts custom keywords case-insensitively", () => {
    expect(
      ingestQueryKey({
        titleId: "custom",
        customTitle: "X",
        roleKeywords: ["Kubernetes", "sre"]
      })
    ).toBe("custom:kubernetes|sre");
  });
  it("returns null when invalid", () => {
    expect(ingestQueryKey({ titleId: null, customTitle: null, roleKeywords: [] })).toBeNull();
  });
});
```

Add to `packages/core/src/job-preference/__tests__/utils.test.ts`:

```ts
it("defaults new discovery fields", () => {
  const d = defaultJobPreference();
  expect(d.titleId).toBeNull();
  expect(d.customTitle).toBeNull();
  expect(d.jobsPerRun).toBe(25);
  expect(d.importFromEmail).toBe(false);
});

it("merges jobsPerRun and importFromEmail when provided", () => {
  const merged = mergeJobPreference(defaultJobPreference(), {
    jobsPerRun: 17,
    importFromEmail: true
  });
  expect(merged.jobsPerRun).toBe(15); // snapped
  expect(merged.importFromEmail).toBe(true);
});
```

- [ ] **Step 2: Run tests — expect FAIL** (modules / fields missing)

```bash
cd packages/core && vp test run src/job-discovery/__tests__/title-packs.test.ts src/job-preference/__tests__/utils.test.ts
```

- [ ] **Step 3: Implement packs + schema fields + merge/defaults**

Pack table in `constants.ts` as `TITLE_PACKS: Record<JobTitlePackId, { id, label, keywords: string[] }>`.

`applyTitlePack`: extras = current keywords whose lowercased form is **not** in the previous pack’s seed set (if previous was a pack). Next keywords = unique(next seeds + extras). Switching to `custom` keeps current keywords (no seed inject).

`effectiveRoleKeywords`: if pack, `unique(seeds ∪ roleKeywords)`; if custom, `roleKeywords` only.

`hasValidDiscoveryTitle`: pack id → true; `custom` requires `customTitle.trim().length > 0` and `roleKeywords.length >= 2`; else false.

`ingestQueryKey`: invalid → null; pack → `pack:${titleId}`; custom → `custom:${sortedLowerKeywords.join("|")}`.

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/job-discovery packages/core/src/job-preference packages/core/src/index.ts
git commit -m "feat(core): title packs and discovery preference fields"
```

---

### Task 2: Adapter types + cheap score + land budget

**Files:**

- Create: `packages/core/src/job-discovery/types.ts`
- Create: `packages/core/src/job-discovery/cheap-score.ts`
- Create: `packages/core/src/job-discovery/land-budget.ts`
- Create: `packages/core/src/job-discovery/__tests__/cheap-score.test.ts`
- Create: `packages/core/src/job-discovery/__tests__/land-budget.test.ts`
- Modify: `packages/core/src/job-discovery/index.ts`
- Modify: `packages/core/src/job-discovery/constants.ts` — adapter ids + ATS allowlist

**Interfaces:**

```ts
export const JOB_ADAPTER_IDS = [
  "freehire",
  "himalayas",
  "arbeitnow",
  "remotive",
  "remoteok"
] as const;
export type JobAdapterId = (typeof JOB_ADAPTER_IDS)[number];
export const FREEHIRE_ATS_SOURCES = [
  "greenhouse",
  "ashby",
  "lever",
  "workable",
  "smartrecruiters"
] as const;

export const AdapterCapabilitySchema = z.enum(["search", "feed"]);
export const NormalizedListingSchema = z.object({
  adapterId: z.enum(JOB_ADAPTER_IDS),
  externalId: z.string().min(1),
  listingUrl: z.string().url(),
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().nullable(),
  workMode: WorkModeSchema.nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  salaryCurrency: z.string().nullable(),
  skills: z.array(z.string()),
  description: z.string().nullable(),
  postedAt: z.coerce.date().nullable(),
  sourcePlatform: z.string().nullable()
});
export type NormalizedListing = z.infer<typeof NormalizedListingSchema>;

export type AdapterFetchInput = {
  q?: string;
  workMode?: WorkMode | null;
  page?: number;
  limit?: number;
};

export type JobSourceAdapter = {
  id: JobAdapterId;
  capabilities: readonly ("search" | "feed")[];
  fetch(input: AdapterFetchInput): Promise<NormalizedListing[]>;
};

export type CheapScoreResult = {
  score: number; // 0–100
  passed: boolean; // false only for exclude / no title hit / garbage
  reasons: string[];
};

export function scoreCatalogAgainstPreference(
  listing: Pick<
    NormalizedListing,
    "title" | "companyName" | "location" | "workMode" | "skills" | "salaryMin" | "salaryCurrency"
  >,
  prefs: JobPreference
): CheapScoreResult;

export function computeLandBudget(input: {
  jobsPerRun: number;
  openInbox: number;
  inboxThisRun: number; // pending + AI-passed still inbox for this runId
  remainingDailyAiAttempts: number;
  hasAiKey: boolean;
}): number;
```

Cheap-score rules (do **not** read `description`):

1. Garbage title/company → `{ score: 0, passed: false }` (reuse `isGarbageJobTitle` / `isGarbageCompany` from `packages/core/src/mail/job-harvest.ts` — import them; do not copy).
2. Exclude keyword in `title + companyName + location + skills.join(" ")` → fail 0.
3. `effectiveRoleKeywords` must hit **title** (case-insensitive substring). 0 hits → `{ score: 15, passed: false, reasons: ["no role keyword in title"] }`.
4. Title hits: `score = 40 + min(40, 15 + hits * 10)`.
5. Structured skill hit (listing.skills vs role keywords / locations) → `+5` (cap one bonus).
6. Work mode: if prefs.workModes non-empty and listing.workMode set: match `+15`, mismatch `-15`. Empty prefs.workModes = no penalty. All three selected = no mode penalty (treat as empty).
7. Location: if prefs.locations non-empty — location string hit **or** (`workMode === "remote"` and prefs.workModes includes `"remote"`) → `+10`; known location that misses → `-10`. Do **not** scan a JD blob.
8. Clamp 0–100. **Do not** compare to `minMatchScore`. `passed` is “eligible to land/rank”, not “AI bar”.

`computeLandBudget`:

```
seats = max(0, 50 - openInbox)
remainingN = max(0, jobsPerRun - inboxThisRun)
aiSeats = hasAiKey ? max(0, remainingDailyAiAttempts) : remainingN
return min(remainingN, seats, aiSeats)
```

- [ ] **Step 1: Write failing tests**

```ts
// cheap-score.test.ts
const listing = {
  title: "Senior Frontend Engineer",
  companyName: "Acme",
  location: "Remote — EU",
  workMode: "remote" as const,
  skills: ["react", "typescript"],
  salaryMin: null,
  salaryCurrency: null
};
const prefs = {
  ...defaultJobPreference(),
  titleId: "frontend" as const,
  roleKeywords: [],
  excludeKeywords: ["php"],
  workModes: ["remote"] as const,
  locations: ["EU"],
  minMatchScore: 90
};

it("ranks a title hit and ignores minMatchScore (AI bar only)", () => {
  const r = scoreCatalogAgainstPreference(listing, { ...prefs, minMatchScore: 100 });
  expect(r.passed).toBe(true);
  expect(r.score).toBeGreaterThan(0);
  // passed is "eligible to land", not "score >= minMatchScore"
});

it("kills exclude in title", () => {
  const r = scoreCatalogAgainstPreference({ ...listing, title: "PHP Frontend" }, prefs);
  expect(r.passed).toBe(false);
  expect(r.score).toBe(0);
});

it("fails without a title keyword hit", () => {
  const r = scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, prefs);
  expect(r.passed).toBe(false);
  expect(r.reasons.join(" ")).toMatch(/title/i);
});

it("does not use description text for excludes or title hits", () => {
  const r = scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, prefs);
  expect(r.passed).toBe(false);
});
```

```ts
// land-budget.test.ts
it("stops at 50 open including pending", () => {
  expect(
    computeLandBudget({
      jobsPerRun: 25,
      openInbox: 50,
      inboxThisRun: 0,
      remainingDailyAiAttempts: 50,
      hasAiKey: true
    })
  ).toBe(0);
});

it("ignores AI budget when there is no key", () => {
  expect(
    computeLandBudget({
      jobsPerRun: 25,
      openInbox: 10,
      inboxThisRun: 0,
      remainingDailyAiAttempts: 0,
      hasAiKey: false
    })
  ).toBe(25);
});

it("does not over-land pending stubs past N", () => {
  expect(
    computeLandBudget({
      jobsPerRun: 25,
      openInbox: 10,
      inboxThisRun: 20,
      remainingDailyAiAttempts: 50,
      hasAiKey: true
    })
  ).toBe(5);
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd packages/core && vp test run src/job-discovery/__tests__/cheap-score.test.ts src/job-discovery/__tests__/land-budget.test.ts
```

- [ ] **Step 3: Implement `cheap-score.ts` + `land-budget.ts` + types**

- [ ] **Step 4: Re-run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/job-discovery
git commit -m "feat(core): cheap catalog score and land budget"
```

---

### Task 3: `discovery` source tag + listing-closed output field

**Files:**

- Modify: `packages/core/src/application/types.ts`
- Modify: `packages/core/src/application/utils.ts`
- Create: `packages/core/src/application/__tests__/source-tags.test.ts` (or extend an existing application test if one exists)

**Interfaces:**

- `ApplicationSourceTagSchema` adds `"discovery"` (channel: `mail | hub | manual | discovery`).
- `buildApplicationSourceTags` channel union adds `"discovery"`.
- `APPLICATION_SOURCE_TAG_LABELS.discovery = "Discovery"`.
- `ApplicationOutputSchema` adds `listingClosed: z.boolean().default(false)`.
- Find-now transport (used in Task 12):

```ts
export const FindJobsNowInputSchema = z.object({}).optional();
export const FindJobsNowOutputSchema = z.object({
  enqueued: z.boolean(),
  ingestTriggered: z.boolean(),
  seats: z.number().int().nonnegative(),
  reason: z.enum(["ok", "title_required", "inbox_full", "queue_unavailable"])
});
```

- [ ] **Step 1: Failing test**

```ts
import { buildApplicationSourceTags, APPLICATION_SOURCE_TAG_LABELS } from "#@/application/utils";

it("tags discovery + inferred platform", () => {
  expect(buildApplicationSourceTags({ channel: "discovery", platform: "company_website" })).toEqual(
    ["discovery", "company_website"]
  );
});
it("labels discovery", () => {
  expect(APPLICATION_SOURCE_TAG_LABELS.discovery).toBe("Discovery");
});
```

- [ ] **Step 2: Run — expect FAIL** (channel type rejects `"discovery"`)

- [ ] **Step 3: Add enum member, label, `listingClosed`, findNow schemas. Update `formatApplicationActivitySummary` discovered branch: `via === "discovery"` → `"Discovered from job search"`.**

`listingClosed` is **computed** (join), not a DB column. Do **not** add `postingId` / `inboxExpiresAt` / `discoveryRunId` to `ApplicationOutputSchema`.

`ApplicationOutputSchema` currently `satisfies z.ZodType<Omit<ApplicationSchemaSelect, "userId">>`. After Task 4 adds DB columns, that `satisfies` **breaks** unless you change it to:

```ts
}) satisfies z.ZodType<
  Omit<ApplicationSchemaSelect, "userId" | "postingId" | "inboxExpiresAt" | "discoveryRunId"> & {
    listingClosed: boolean;
  }
>;
```

Do this in Task 3 (add `listingClosed`) and tighten the `Omit` in Task 4 when the columns land.

- [ ] **Step 4: Run — expect PASS.** Typecheck will fail later consumers until Tasks 7/12 update `toApplicationOutput` — that is expected; do not change web yet.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/application
git commit -m "feat(core): discovery source tag and findNow schema"
```

---

### Task 4: Database schema + migration

**Files:**

- Create: `packages/db/src/schema/job-posting.schema.ts`
- Create: `packages/db/src/schema/user-job-ai-budget.schema.ts`
- Create: `packages/db/src/types/job-posting.schema.ts`
- Create: `packages/db/src/types/user-job-ai-budget.schema.ts`
- Modify: `packages/db/src/schema/job-preference.schema.ts`
- Modify: `packages/db/src/schema/application.schema.ts`
- Modify: `packages/db/src/schema/relations.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `packages/db/src/types/index.ts`
- Generated: `packages/db/src/migrations/<timestamp>_*.sql` via `vp run db:generate`

**Interfaces:**

`job_posting` (no `userId`):

| Column                           | Type                                |
| -------------------------------- | ----------------------------------- |
| `id`                             | text PK                             |
| `adapterId`                      | text not null                       |
| `externalId`                     | text not null                       |
| `listingUrl`                     | text not null                       |
| `title`, `companyName`           | text not null                       |
| `location`                       | text                                |
| `workMode`                       | text                                |
| `salaryMin`, `salaryMax`         | integer                             |
| `salaryCurrency`                 | text                                |
| `skills`                         | jsonb `string[]` default `[]`       |
| `description`                    | text                                |
| `sourcePlatform`                 | text                                |
| `contentHash`                    | text not null                       |
| `postedAt`                       | timestamptz                         |
| `firstSeenAt`, `lastSeenAt`      | timestamptz not null default now    |
| `closedAt`                       | timestamptz                         |
| `raw`                            | jsonb                               |
| UNIQUE `(adapterId, externalId)` | `job_posting_adapter_external_uidx` |
| INDEX `listingUrl`               | `job_posting_listing_url_idx`       |
| INDEX `closedAt`                 | `job_posting_closed_at_idx`         |

`job_preference` add (all with defaults so existing rows stay valid):

- `titleId` text
- `customTitle` text
- `jobsPerRun` integer not null default 25
- `importFromEmail` boolean not null default false

`application` add:

- `postingId` text references `job_posting.id` on delete set null
- `inboxExpiresAt` timestamptz (null = grandfathered)
- `discoveryRunId` text
- INDEX `(userId, discoveryRunId)`
- INDEX `postingId`

`user_job_ai_budget`:

- `id` text PK
- `userId` text not null references `user.id` on delete cascade
- `dayUtc` text not null (`YYYY-MM-DD`)
- `attempts` integer not null default 0
- UNIQUE `(userId, dayUtc)`

Relations: `application.posting` many-to-one `jobPosting`; `jobPosting.applications` one-to-many.

- [ ] **Step 1: Write schema files + type re-exports** (no test file; verify by generate)

Mirror `packages/db/src/types/job-preference.schema.ts` for the two new tables.

- [ ] **Step 2: Generate migration**

```bash
# Confirm DATABASE_URL is the Neon *dev* database, not production. Stop if it is prod.
cd packages/db && vp run db:generate
```

Inspect the generated SQL: new tables, three application columns, four preference columns, indexes. Do not hand-edit unless generate missed a unique index.

- [ ] **Step 3: Apply locally**

```bash
cd packages/db && vp run db:migrate
```

- [ ] **Step 4: Commit schema + generated migration + types**

```bash
git add packages/db
git commit -m "feat(db): job_posting catalog and discovery preference columns"
```

---

### Task 5: Repositories

**Files:**

- Create: `packages/db/src/repositories/job-posting.repository.ts`
- Create: `packages/db/src/repositories/user-job-ai-budget.repository.ts`
- Modify: `packages/db/src/repositories/job-preference.repository.ts`
- Modify: `packages/db/src/repositories/application.repository.ts`
- Modify: `packages/db/src/repositories/index.ts`

**Interfaces:**

```ts
export type UpsertJobPostingInput = {
  adapterId: string;
  externalId: string;
  listingUrl: string;
  title: string;
  companyName: string;
  location: string | null;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[];
  description: string | null;
  sourcePlatform: string | null;
  contentHash: string;
  postedAt: Date | null;
  raw?: unknown;
};

jobPostingRepository.upsert(input): Promise<{ row; changed: boolean }>
// conflict on (adapterId, externalId):
//   if contentHash unchanged → lastSeenAt = now only, changed=false
//   else → update fields + lastSeenAt, do not clear description if incoming description is null, changed=true
jobPostingRepository.findById(id)
jobPostingRepository.findByAdapterExternal(adapterId, externalId)
jobPostingRepository.findOpenByIds(ids)
jobPostingRepository.listOpenForLand(input: { excludeUrls: string[]; excludePostingIds: string[]; limit: number })
jobPostingRepository.setDescription(id, description)
jobPostingRepository.markClosed(id, closedAt: Date)

userJobAiBudgetRepository.remainingAttempts(userId, dayUtc, cap): Promise<number>
userJobAiBudgetRepository.tryIncrement(userId, dayUtc, cap): Promise<boolean>
// INSERT attempts=1 ON CONFLICT (userId, dayUtc) DO UPDATE SET attempts = attempts+1
// WHERE user_job_ai_budget.attempts < cap  RETURNING
// if no row returned → false (cap hit)

jobPreferenceRepository.upsert — persist the four new columns
jobPreferenceRepository.listUsersWithValidTitle(): Promise<JobPreferenceEntity[]>
// all rows; validity is decided in core by hasValidDiscoveryTitle after map

applicationRepository.createIfAbsentByUrl — include postingId, inboxExpiresAt, discoveryRunId
applicationRepository.countInboxThisRun(userId, discoveryRunId): number
applicationRepository.listUserUrlsAndPostingIds(userId): { urls: string[]; postingIds: string[] }
applicationRepository.listInboxDueLiveness(now, limit)
applicationRepository.listInboxExpired(now, limit)
// due liveness: trackingStatus=inbox, inboxExpiresAt not null,
//   createdAt <= now - 3.5d, and (no last-liveness yet — use createdAt + LIVENESS_AFTER as cutoff)
```

- [ ] **Step 1: No isolated DB unit tests** (repos talk to Postgres). Implement against the signatures above. Call sites in later tasks are the verification.

- [ ] **Step 2: Implement.** For `createIfAbsentByUrl`, add the three new columns to **both** the insert values and leave them unset on conflict (existing row wins).

- [ ] **Step 3: `cd packages/db && vp check`**

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/repositories
git commit -m "feat(db): job posting and AI budget repositories"
```

---

### Task 6: Preference API + loadJobPreference + application output join

**Files:**

- Modify: `packages/api/src/routers/job-preference.router.ts`
- Modify: `packages/api/src/lib/application/load-job-preference.ts`
- Modify: `packages/api/src/routers/applications.router.ts` (`toApplicationOutput`)
- Modify: `apps/agent/src/mastra/tools/get-job-preferences.tool.ts` if it maps fields explicitly

**Interfaces:**

`loadJobPreference` must return the four new fields (defaults via `defaultJobPreference()` when the row is missing; when the row exists, `titleId ?? null`, `jobsPerRun ?? 25`, `importFromEmail ?? false`).

`toApplicationOutput` adds `listingClosed: false` for now (real join in Task 14). This unblocks the new `ApplicationOutputSchema` field.

Router `toOutput` / `rowToPreference` / `upsert` persist the new columns. Snap `jobsPerRun` with `refineJobsPerRun`.

- [ ] **Step 1: Typecheck will fail until mappings exist** — implement mappings.

- [ ] **Step 2: `cd packages/api && vp check`**

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/job-preference.router.ts packages/api/src/lib/application/load-job-preference.ts packages/api/src/routers/applications.router.ts
git commit -m "feat(api): persist discovery fields on job preferences"
```

---

### Task 7: HTTP adapters + registry

**Files:**

- Create: `packages/api/src/lib/job-discovery/content-hash.ts`
- Create: `packages/api/src/lib/job-discovery/fetch-json.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/freehire.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/himalayas.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/arbeitnow.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/remotive.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/remoteok.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/registry.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/__tests__/normalize.test.ts`
- Create: `packages/api/src/lib/job-discovery/adapters/__fixtures__/*.json` (one small page per source)

**Interfaces:**

```ts
export function listingContentHash(listing: NormalizedListing): string;
// sha256 of adapterId|externalId|listingUrl|title|companyName|location|workMode|skills|description

export function fetchJson(url: string, init?: RequestInit): Promise<unknown>;
// User-Agent: personal-hub-job-discovery/1.0; timeout 15s; throw on !ok

export const jobSourceAdapters: Record<JobAdapterId, JobSourceAdapter>;
export function getJobSourceAdapter(id: JobAdapterId): JobSourceAdapter;
```

Adapter fetch contracts:

| Adapter            | URL                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `freehire` search  | `https://freehire.me/api/v1/jobs/search`      | `q` = pack label keywords joined with space (or custom keywords joined). `sort=posted_at`, `order=desc`, `limit` (≤50), `offset`, `source=greenhouse,ashby,lever,workable,smartrecruiters`. `work_mode` = comma-joined prefs when 1–2 modes selected; omit when 0 or all 3. Drop rows whose `source` is not in `FREEHIRE_ATS_SOURCES`. Never call `/agent/jobs/search` or match-analysis. |
| `himalayas` search | `https://himalayas.app/jobs/api/search`       | `q`, `sort=recent`, `page`. Stringify `timezoneRestrictions` (API may send ints). `externalId = guid` or slug.                                                                                                                                                                                                                                                                            |
| `arbeitnow` feed   | `https://www.arbeitnow.com/api/job-board-api` | `page`. Ignore `q` (feed).                                                                                                                                                                                                                                                                                                                                                                |
| `remotive` search  | `https://remotive.com/api/remote-jobs`        | `search=q`, `category=software-dev`. Return all hits (title filter is cheap-score).                                                                                                                                                                                                                                                                                                       |
| `remoteok` feed    | `https://remoteok.com/api`                    | Dump. Skip the legal first object (`!id` / `!position`). Ignore `q`.                                                                                                                                                                                                                                                                                                                      |

Field maps (copy only if the source sent the field; otherwise null / `[]`):

| Adapter   | `externalId`     | `listingUrl`               | `title` / `companyName`  | `location`                                          | `workMode`                                  | `skills` | `salary*`                                                                       | `description`            | `postedAt`                 | `sourcePlatform` |
| --------- | ---------------- | -------------------------- | ------------------------ | --------------------------------------------------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------------- | ------------------------ | -------------------------- | ---------------- |
| freehire  | `public_slug`    | `url`                      | `title` / `company`      | `location`                                          | `work_mode` if `remote\|hybrid\|onsite`     | `skills` | `enrichment.salary_min/max/currency`                                            | list preview if present  | `posted_at`                | `source`         |
| himalayas | `guid` ?? `slug` | `applicationLink` ?? `url` | `title` / `companyName`  | join `locationRestrictions` (stringify every entry) | null unless API has an explicit remote flag | `[]`     | min/max/currency if numeric                                                     | `description` if present | `createdAt`                | `"himalayas"`    |
| arbeitnow | `slug`           | `url`                      | `title` / `company_name` | `location`                                          | `remote === true` → `"remote"` else null    | `tags`   | null                                                                            | `description` if present | `created_at` (unix or iso) | `"arbeitnow"`    |
| remotive  | `String(id)`     | `url`                      | `title` / `company_name` | `candidate_required_location`                       | `"remote"` (board is remote)                | `tags`   | parse only if a structured salary object exists; do not regex the salary string | `description` if present | `publication_date`         | `"remotive"`     |
| remoteok  | `String(id)`     | `url`                      | `position` / `company`   | `location`                                          | `"remote"`                                  | `tags`   | `salary_min` / `salary_max` if numeric                                          | `description` if present | `date`                     | `"remoteok"`     |

Normalize: do **not** infer work mode or salary from JD text. Only copy structured fields. `canonicalizeJobUrl` on `listingUrl`. Skip rows missing title, company, or http(s) URL. Stringify Himalayas `timezoneRestrictions` if touched (ints have broken naive joins).

Each adapter `fetch` catches network/parse errors and returns `[]` (ingest continues). Log one outcome event per adapter call from the ingest worker (Task 11), not from the adapter module.

- [ ] **Step 1: Write failing normalize tests** (pure functions exported from each adapter: `normalizeFreehireJob(raw)`, etc.)

```ts
import { normalizeFreehireJob } from "../freehire";
import fixture from "../__fixtures__/freehire-search.json";

it("keeps greenhouse and drops himalayas copies", () => {
  const rows = fixture.data.map(normalizeFreehireJob).filter(Boolean);
  expect(
    rows.every(
      (r) =>
        r &&
        ["greenhouse", "ashby", "lever", "workable", "smartrecruiters"].includes(
          r.sourcePlatform ?? ""
        )
    )
  ).toBe(true);
  expect(rows.find((r) => r?.sourcePlatform === "himalayas")).toBeUndefined();
});

it("uses public_slug as externalId", () => {
  const row = normalizeFreehireJob(fixture.data[0]);
  expect(row?.externalId).toBe(fixture.data[0].public_slug);
});
```

Fixture (trim to 2 objects): one `source: "greenhouse"`, one `source: "himalayas"`.

Himalayas fixture: include `timezoneRestrictions: [1, 2]` and assert normalize does not throw.

RemoteOK fixture: `[{ legal: "..." }, { id: "1", position: "Engineer", company: "Acme", url: "https://remoteok.com/l/1" }]` — first dropped, second kept.

- [ ] **Step 2: Run — expect FAIL**

```bash
cd packages/api && vp test run src/lib/job-discovery/adapters/__tests__/normalize.test.ts
```

- [ ] **Step 3: Implement adapters + registry.** Do **not** hit the live network in tests.

- [ ] **Step 4: Re-run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/job-discovery
git commit -m "feat(api): free job-source adapters and registry"
```

---

### Task 8: Catalog ingest + HTTP hydrate

**Files:**

- Create: `packages/api/src/lib/job-discovery/ingest.ts`
- Create: `packages/api/src/lib/job-discovery/hydrate.ts`
- Create: `packages/api/src/lib/job-discovery/__tests__/ingest-plan.test.ts`

**Interfaces:**

```ts
export function planIngestQueries(
  prefs: Array<{ titleId: JobTitleId | null; customTitle: string | null; roleKeywords: string[] }>
): string[]; // unique ingestQueryKey values, skip nulls

export async function ingestQuery(input: {
  queryKey: string; // pack:frontend | custom:a|b
  workMode?: WorkMode | null;
  remotiveCallsLeft: number;
}): Promise<{ upserted: number; remotiveUsed: number }>;

export async function ingestFeeds(): Promise<{ upserted: number }>;

export async function ingestForUserQuery(prefs: JobPreference): Promise<{ upserted: number }>;
// used by Find jobs now when the shelf is thin

export type HydratePostingResult = {
  description: string | null;
  listingClosed: boolean;
  location: string | null;
  salaryRange: string | null;
};

export async function hydratePostingIfNeeded(postingId: string): Promise<HydratePostingResult>;
// if description already set, return current catalog fields + listingClosed: Boolean(closedAt)
// else fetchPublicHtml(listingUrl) + extractJobListingFromHtml
// write **description** to catalog only (and markClosed if extract.listingClosed)
// return extract location/salary for the lander to copy onto the application
// never persist AI/extract guesses for workMode/salary onto job_posting structured columns
// (those stay adapter-stated). Description is the one shared HTTP field.
```

Paging caps (v1): search adapters 3 pages × 50 (or until a page returns 0). Feeds 3 pages. Stop a search adapter early once that query has upserted ≥ 80 rows (≈ 3× default N).

Remotive: shared **global** 4/day budget for cron **and** Find jobs now (`ingestForUserQuery`). Use Redis `INCR remotive:${utcDate}` with 48h TTL when `REDIS_URL` is set; if Redis is down, skip Remotive rather than unbounded fan-out. If `remotiveCallsLeft <= 0`, skip Remotive for that query.

`queryKey` → search `q`:

- `pack:frontend` → `TITLE_PACKS.frontend.keywords.join(" ")` (or the pack’s first 4 keywords if the query string is huge).
- `custom:k8s|sre` → keywords joined with space (`k8s sre`).

`listOpenForLand` / land scoring: load a **large** unseen open set (v1: up to 400 rows, not `limit: toLand`). Score all of them, sort, then slice `toLand`. A `limit: toLand` SQL fetch before scoring would return arbitrary recency, not the best cheap matches.

`planIngestQueries` is pure — test it. `hydrate` / HTTP ingest are exercised by workers; unit-test only the planner + “skip remotive when budget 0” branch with a injected adapter map if easy. Otherwise keep ingest orchestration thin and test planner only.

- [ ] **Step 1: Failing planner test**

```ts
it("dedupes two users on the same pack", () => {
  expect(
    planIngestQueries([
      { titleId: "frontend", customTitle: null, roleKeywords: [] },
      { titleId: "frontend", customTitle: null, roleKeywords: ["graphql"] }
    ])
  ).toEqual(["pack:frontend"]);
});
it("keeps custom distinct from packs", () => {
  expect(
    planIngestQueries([{ titleId: "custom", customTitle: "SRE", roleKeywords: ["sre", "k8s"] }])
  ).toEqual(["custom:k8s|sre"]);
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement planner + ingest + hydrate.** Upsert via `jobPostingRepository.upsert` with `listingContentHash`. One failed adapter must not abort the rest.

- [ ] **Step 4: Re-run planner test — PASS. `cd packages/api && vp check`**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/job-discovery
git commit -m "feat(api): shared catalog ingest and JD hydrate"
```

---

### Task 9: Per-user land + inbox AI

**Files:**

- Create: `packages/api/src/lib/job-discovery/land.ts`
- Create: `packages/api/src/lib/job-discovery/inbox-ai.ts`
- Create: `packages/core/src/job-discovery/queue.ts` — payload Zod + queue names
- Create: `packages/api/src/lib/job-discovery/enqueue.ts` — Redis producer like `harvest-enqueue-hook.ts`
- Create: `packages/api/src/lib/job-discovery/__tests__/land-select.test.ts`

**Interfaces:**

```ts
// packages/core/src/job-discovery/queue.ts
export const JOB_CATALOG_INGEST_QUEUE_NAME = "job-catalog-ingest";
export const JOB_DISCOVERY_LAND_QUEUE_NAME = "job-discovery-land";
export const JOB_INBOX_AI_QUEUE_NAME = "job-inbox-ai";
export const JOB_INBOX_LIVENESS_QUEUE_NAME = "job-inbox-liveness";

export const JobDiscoveryLandPayloadSchema = z.object({
  userId: z.string().min(1),
  runId: z.string().min(1),
  trigger: z.enum(["cron", "find_now", "backfill"]),
  enqueuedAt: z.string().datetime().optional()
});
export const JobInboxAiPayloadSchema = z.object({
  userId: z.string().min(1),
  applicationId: z.string().min(1),
  runId: z.string().min(1)
});
export const JobCatalogIngestPayloadSchema = z.object({
  mode: z.enum(["daily", "user_query"]),
  userId: z.string().optional(),
  runId: z.string().optional()
});
```

```ts
export async function runDiscoveryLand(input: {
  userId: string;
  runId: string;
}): Promise<{ landed: number; reason: "ok" | "title_required" | "inbox_full" | "empty_shelf" }>;

export async function runInboxAi(input: {
  userId: string;
  applicationId: string;
  runId: string;
}): Promise<{ outcome: "passed" | "dismissed" | "heuristic" | "skipped" }>;
```

**Land algorithm** (must match spec loop):

1. Load prefs + `resolveRuntimeAiCredentials(userId, "scorer")`.
2. If `!hasValidDiscoveryTitle(prefs)` → `{ landed: 0, reason: "title_required" }`.
3. `openInbox = count(trackingStatus=inbox)`. `inboxThisRun = countInboxThisRun(userId, runId)`. `remaining = remainingAttempts(userId, utcDay, dailyAiAttemptCap(prefs.jobsPerRun))`.
4. `toLand = computeLandBudget({ jobsPerRun, openInbox, inboxThisRun, remainingDailyAiAttempts: remaining, hasAiKey: Boolean(apiKey) })`. If 0 → `inbox_full` if seats 0 else `ok`.
5. Load user urls + postingIds. Score **open** catalog rows (`closedAt` is null) not in those sets with `scoreCatalogAgainstPreference` using `effectiveRoleKeywords`. Sort `passed` desc by score, then `postedAt` desc.
6. Take `toLand` listings. For each:
   - `hydratePostingIfNeeded(posting.id)` **before** insert/AI. Re-load the posting. If `closedAt` is set, **skip insert and skip AI** (spec: do not land closed listings). Continue to the next cheap hit so `toLand` is still filled.
   - `canonicalizeJobUrl` → `createIfAbsentByUrl` with `trackingStatus: "inbox"`, `sourceTags: buildApplicationSourceTags({ channel: "discovery", platform })`, `sourceLabel` from adapter display name when platform is `other` or `company_website` (`Himalayas`, `Arbeitnow`, `Remotive`, `RemoteOK`, `freehire`, or `sourcePlatform` like `Greenhouse`), `matchScore: cheap.score`, `postingId`, `discoveryRunId: runId`, `inboxExpiresAt: now + 7d`.
   - **Fill/fix the application copy only** (not `job_posting`): set `location` from catalog if the application would otherwise be empty; set `salaryRange` from catalog `salaryMin/Max/Currency` (plain string like `$120k–$150k USD` if both present); do not invent work mode on the catalog. If hydrate extract returned location / salary / workMode, copy those onto the **application** row. Never write guessed fields back to `job_posting`.
   - Activity `kind: "discovered"`, metadata `{ via: "discovery", runId, cheapScore, cheapReasons, adapterId }`.
   - If `hasAiKey`, enqueue inbox-ai. Else treat as cheap-passed (counts toward N via inboxThisRun).
7. Return `{ landed, reason: landed === 0 ? "empty_shelf" : "ok" }`.

**Inbox AI:**

1. Load application (must be inbox, owned).
2. `tryIncrement` daily budget. If false → skip (leave stub; next run sees seats/budget).
3. `scoreApplicationMatch` with the **application** fields (description already hydrated).
4. Fail (`!passed`): set `dismissed`, activity `kind: "dismissed"` metadata `{ via: "low_match", runId, score, reasons }`. Enqueue land `{ trigger: "backfill", runId }` for this user.
5. Pass: update `matchScore`, do **not** write score onto `job_posting`. `generateAgentTake` soft-fail (leave take null). Do not retrigger.
6. Never throw `AI_NOT_CONFIGURED`.

Extract a pure `selectListingsToLand(scored, toLand)` for the test (already-sorted slice).

Adapter display names constant in core: `JOB_ADAPTER_LABELS`.

- [ ] **Step 1: Failing test for selection + budget interaction** (pure helper)

```ts
it("takes the highest cheap scores up to toLand", () => {
  const picked = selectListingsToLand(
    [
      { id: "a", score: 40 },
      { id: "b", score: 80 },
      { id: "c", score: 70 }
    ],
    2
  );
  expect(picked.map((p) => p.id)).toEqual(["b", "c"]);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement land + inbox-ai + enqueue hook** (`requestJobDiscoveryLand`, `requestJobInboxAi`, `requestJobCatalogIngest`) mirroring `packages/api/src/lib/mail/harvest-enqueue-hook.ts` (direct Redis producer first).

- [ ] **Step 4: Tests PASS. `cd packages/api && vp check`**

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/job-discovery/queue.ts packages/api/src/lib/job-discovery
git commit -m "feat(api): discovery land loop and per-user inbox AI"
```

---

### Task 10: BullMQ workers + daily cron

**Files:**

- Create: `apps/server/src/queues/job-catalog-ingest-queue.ts`
- Create: `apps/server/src/queues/job-discovery-land-queue.ts`
- Create: `apps/server/src/queues/job-inbox-ai-queue.ts`
- Create: `apps/server/src/queues/job-inbox-liveness-queue.ts` (worker stub that no-ops until Task 16)
- Modify: `apps/server/src/index.ts` — start queues when `REDIS_URL` is set (same try/catch pattern as harvest)

**Interfaces:**

Copy the harvest queue store pattern (`STORE_KEY` on `globalThis`, `bullConnection`). **Do not** copy harvest’s `removeOnComplete: 1000` onto the land queue — see jobId rule below. Ingest/liveness ticks may use `removeOnComplete: 50`.

- Ingest worker:
  - `daily`: `list` all job preferences → `planIngestQueries` → ingest each key + `ingestFeeds` → for each user with `hasValidDiscoveryTitle`, `enqueue land` with `runId = cron_${YYYY-MM-DD}` and `trigger: "cron"`.
  - `user_query`: `ingestForUserQuery` then enqueue land for that `userId` / provided `runId`.
- Land worker: `runDiscoveryLand`.
- Inbox-ai worker: `runInboxAi`.
- Repeat ingest: `every: 24 * 60 * 60 * 1000`, `jobId: "job-catalog-ingest-daily"`.

Land jobId: `land_${userId}_${runId}` **only while the job is waiting/active** so concurrent cron/findNow/backfill coalesce. After complete/fail, **remove the job** (`removeOnComplete: true` for land, or `removeOnComplete: { count: 0 }` + explicit `queue.remove(jobId)`). AI-fail backfill **must** be able to enqueue the same `runId` again — harvest-style `removeOnComplete: 1000` leaves the id in Redis and turns backfill into a silent “already exists” no-op.

Inbox-ai jobId: `inboxai_${applicationId}` (one AI pass per application; do not reuse after complete if you need a retry — generate a new id or remove on complete).

Register enqueue hooks from `apps/server/src/index.ts` the same way as harvest (optional; API producer is primary).

One wide log per job outcome (`job_catalog_ingest_ok`, `job_discovery_land_ok`, `job_inbox_ai_ok`) with counts. No per-listing logs.

- [ ] **Step 1: Implement workers + boot registration**

- [ ] **Step 2: `cd apps/server && vp check`**

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/queues apps/server/src/index.ts
git commit -m "feat(server): discovery ingest, land, and inbox-ai queues"
```

---

### Task 11: Settings → Jobs UI

**Files:**

- Modify: `apps/web/src/features/job-preference/lib/job-preference-form.ts`
- Modify: `apps/web/src/features/job-preference/ui/job-preference-fields.tsx`
- Modify: `apps/web/src/pages/dashboard/settings/ui/job-settings.tsx`
- Create: `packages/core/src/job-preference/__tests__/jobs-per-run.test.ts` only if snap helper is not already covered

**Interfaces:**

`JobPreferenceFormState` adds `titleId: JobTitleId | ""`, `customTitle: string`, `jobsPerRun: number`, `importFromEmail: boolean`.

Form schema: `JobPreferenceFieldsSchema` pick + the four fields. Superrefine: if `titleId === "custom"` then `customTitle.trim().length > 0` and `roleKeywords.length >= 2`.

`jobPreferenceFormFromQuery` / `jobPreferenceInputFromForm` map the new fields. Empty `titleId` submits as `null`.

UI (existing `ComboboxField`, `SliderField`, `SwitchField`, `TagsField`, `InputField`):

1. **Job title** combobox — items = `titlePackOptions()` (`{ value: pack.id, label: pack.label }` + `{ value: "custom", label: "Custom title" }`).
2. When `titleId === "custom"`, show `customTitle` input.
3. On title change: `roleKeywords = applyTitlePack({ next, previous, current })`.
4. Role keywords description: “Pack seeds stay; add extras. Custom needs at least two keywords.”
5. **Jobs per search** slider 15–40 step 5, format `N jobs`.
6. **Minimum match score** description becomes: “AI match bar (0–100). Cheap ranking does not use this.”
7. **Also import from email** switch, default off. Description: “Turn on to harvest job-alert digests into New jobs. Off by default — discovery APIs still run.”
8. Frame + empty-hint copy: **not** “email alerts only.” Use: “Used to find and rank jobs from public boards. Email import is optional.”

- [ ] **Step 1: Extend form mapping tests if the feature already has them; otherwise implement and rely on schema refine + `vp check`.** Add a small unit test in `job-preference-form` only if you extract `jobPreferenceInputFromForm` cases next to core tests. Prefer testing `applyTitlePack` (already done) and the Zod refine via `JobPreferenceFormSchema.safeParse`.

```ts
it("rejects custom title without two keywords", () => {
  const parsed = JobPreferenceFormSchema.safeParse({
    ...emptyJobPreferenceForm,
    titleId: "custom",
    customTitle: "SRE",
    roleKeywords: ["k8s"]
  });
  expect(parsed.success).toBe(false);
});
```

Put that test in `apps/web` only if the web package already runs unit tests on feature lib files; otherwise keep the refine on the **core** upsert schema (`UpsertJobPreferenceInputSchema.superRefine`) so `packages/core` tests cover it.

Add the refine on **core** `UpsertJobPreferenceInputSchema` when `titleId === "custom"`.

- [ ] **Step 2: Implement UI + copy**

- [ ] **Step 3: `cd apps/web && vp check`**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/job-preference apps/web/src/pages/dashboard/settings/ui/job-settings.tsx packages/core/src/job-preference
git commit -m "feat(web): job title pack, N slider, and email import toggle"
```

---

### Task 12: `findNow` API + Find jobs now UI

**Files:**

- Create: `packages/api/src/routers/job-discovery.router.ts`
- Modify: `packages/api/src/routers/index.ts` — `jobDiscovery: jobDiscoveryRouter`
- Create: `apps/web/src/features/job-discovery/api/find-jobs-now.mutation.ts`
- Create: `apps/web/src/features/job-discovery/api/find-jobs-now-job.tsx` (clone scan-job-alerts-job toast pattern)
- Create: `apps/web/src/features/job-discovery/lib/find-jobs-now-store.ts`
- Create: `apps/web/src/features/job-discovery/ui/find-jobs-now-button.tsx`
- Create: `apps/web/src/features/job-discovery/index.ts`
- Modify: `apps/web/src/pages/dashboard/new-jobs/new-jobs-page.tsx`
- Modify: `apps/web/src/features/applications/ui/scan-job-alerts-button.tsx` usage (header)

**Interfaces:**

```ts
export const jobDiscoveryRouter = {
  findNow: protectedProcedure
    .route({ description: "Ingest this user's query if the shelf is thin, then land", method: "POST" })
    .input(FindJobsNowInputSchema)
    .output(FindJobsNowOutputSchema)
    .handler(...)
};
```

Handler (do **not** await the model):

1. Load prefs. If `!hasValidDiscoveryTitle` → `{ enqueued: false, ingestTriggered: false, seats: 0, reason: "title_required" }`.
2. `seats = max(0, 50 - inboxCount)`. If 0 → `reason: "inbox_full"`.
3. Count cheap-passed **unseen** open catalog rows (same cheap function). If count < `computeLandBudget(...)` → `requestJobCatalogIngest({ mode: "user_query", userId, runId })` then land is chained by the ingest worker. Else `requestJobDiscoveryLand` only.
4. `runId = find_${userId}_${randomUUID()}`.
5. If enqueue fails → `queue_unavailable`.
6. Never `AI_NOT_CONFIGURED`. If no API key, still enqueue; client may toast “Landed without AI scoring. Add a key in Settings → AI.”

Typed errors: none required if `reason` covers UX. Optional `.errors({ TITLE_REQUIRED, INBOX_FULL })` only if you want client branches — prefer the `reason` field so the toast can stay simple.

Web: `FindJobsNowButton` uses `AiFlowTrigger` (`idleLabel="Find jobs now"`). Sticky toast like Scan. Poll inbox list + count. Map `title_required` → toast + link to Settings → Jobs. `inbox_full` → “Inbox is full (50). Dismiss or track some jobs first.”

New jobs header **actions**: `FindJobsNowButton` always. `ScanJobAlertsButton` only if `useGetJobPreferenceQuery().data?.importFromEmail`. Empty state: adapter-first copy — “Public job boards that match your title and keywords show up here. Find jobs now, or set a title under Settings.” Empty-state primary = Find jobs now. Scan only if toggle on.

Page description: drop “from job alerts” as the only source.

- [ ] **Step 1: Implement router + register**

- [ ] **Step 2: Implement web mutation/job/button + wire header/empty**

- [ ] **Step 3: `vp check` on `packages/api` and `apps/web`**

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers apps/web/src/features/job-discovery apps/web/src/pages/dashboard/new-jobs
git commit -m "feat: Find jobs now from shared catalog land"
```

---

### Task 13: Mail harvest toggle (default off)

**Files:**

- Modify: `apps/server/src/queues/run-mail-classify.ts` — wrap harvest enqueue
- Modify: `packages/api/src/routers/applications.router.ts` `scanJobAlerts`
- Modify: `apps/server/src/queues/run-mail-job-harvest.ts` — 50-cap + daily AI + `inboxExpiresAt`
- Modify: `packages/core/src/mail/constants.ts` — `job_notifier` help text no longer says it is the default New jobs source
- Modify: `apps/agent/src/mastra/workflows/mail-process-workflow/index.ts` only if it enqueues harvest itself (today the server classify runner does). Do **not** change CRM branch.

**Interfaces:**

Classify (`run-mail-classify.ts`):

```ts
if (hasJobNotifier) {
  const prefs = await loadJobPreference(row.userId);
  if (prefs.importFromEmail) {
    const harvest = await enqueueMailJobHarvest({ messageId: row.id, userId: row.userId });
    harvestEnqueued = harvest.enqueued;
  } else {
    harvestEnqueued = false;
    // include importFromEmail: false on the existing classify outcome log
  }
}
```

`scanJobAlerts`: if `!prefs.importFromEmail` return `{ digestsFound: 0, enqueued: 0, queueUnavailable: false }` without enqueueing (UI should already hide the button). Do not throw.

Mail harvest create path:

- Before create, if `count(inbox) >= 50`, skip (count as skipped, not failed).
- Check/increment the daily AI cap **once before** `callMailJobHarvestAgent`. Harvest already runs extract/score/take **before** the create loop — incrementing per listing after the model has run does not cap cost. If `tryIncrement` fails, skip the agent call (treat as no-key: do not create from this digest, or create cheap-only if extract already returned scored jobs without a new model call). Prefer: no increment remaining → do not call the agent; log `daily_ai_cap`.
- Set `inboxExpiresAt = now + 7d` on **new** mail-harvest creates (post-ship). Do **not** set `discoveryRunId`. Do **not** increment adapter N.
- Keep score-then-create-if-passed (no catalog backfill for mail).

- [ ] **Step 1: Implement gates + harvest caps**

- [ ] **Step 2: `vp check` on `apps/server` and `packages/api`**

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/queues/run-mail-classify.ts apps/server/src/queues/run-mail-job-harvest.ts packages/api/src/routers/applications.router.ts packages/core/src/mail/constants.ts
git commit -m "feat(mail): opt-in job-alert harvest with inbox caps"
```

---

### Task 14: Listing-closed badge on Tracked jobs

**Files:**

- Modify: `packages/api/src/routers/applications.router.ts` — `toApplicationOutput` + list/get loaders
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/application-info-panel.tsx` list row if there is a compact header (also new-jobs row if useful)

**Interfaces:**

When loading an application that has `postingId`, left-join `job_posting.closedAt`. `listingClosed = posting.closedAt != null`.

UI: if `listingClosed`, show a muted Badge “Listing closed” next to the title / source. **Do not** set `outcome`. Copy: “This posting is no longer on the board.”

- [ ] **Step 1: Join + map `listingClosed`**

Add `applicationRepository.findByIdForUserWithPosting` or batch-load posting ids after list. Avoid N+1: `jobPostingRepository.findOpenByIds` already exists — add `findByIds` that includes closed rows.

- [ ] **Step 2: Badge in tracked info panel (and new-jobs panel if it renders the same component)**

- [ ] **Step 3: `vp check` api + web**

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/applications.router.ts packages/db/src/repositories/job-posting.repository.ts apps/web/src/pages/dashboard/tracked-jobs
git commit -m "feat(web): show listing-closed badge from catalog"
```

---

### Task 15: TTL + HTTP liveness

**Files:**

- Create: `packages/api/src/lib/job-discovery/liveness.ts`
- Create: `packages/core/src/job-discovery/__tests__/ttl.test.ts` — pure cutoff helpers
- Modify: `apps/server/src/queues/job-inbox-liveness-queue.ts` — real tick (12h repeat)
- Modify: `packages/core/src/job-discovery/constants.ts` if liveness tick interval is not already there

**Interfaces:**

```ts
export function inboxLivenessDueAt(createdAt: Date): Date; // createdAt + LIVENESS_AFTER_MS
export function isInboxExpired(row: { inboxExpiresAt: Date | null; now: Date }): boolean;
// null inboxExpiresAt → false (grandfather)

export async function runInboxLivenessTick(now?: Date): Promise<{
  checked: number;
  closed: number;
  dismissedExpired: number;
}>;
```

Tick:

1. **Liveness:** rows with `inboxExpiresAt != null` (discovery + post-ship mail harvest), `createdAt <= now - LIVENESS_AFTER_MS`, posting not already closed, `trackingStatus` in `inbox | tracked`. Cap 100/tick. Users often **track before day 3.5** — if you only select inbox, `job_posting.closedAt` never gets set and the Tracked badge never appears.
   - HEAD/GET `listingUrl` (follow redirects). 404/410 → `markClosed`.
   - freehire-sourced: if URL gone, treat closed (optional GET `https://freehire.me/api/v1/jobs/{public_slug}` if `adapterId === "freehire"` — 404 ⇒ closed).
   - Shared result updates `job_posting.closedAt`.
   - If closed and application is **inbox** → dismiss, activity `{ via: "listing_closed" }`.
   - If closed and **tracked** → do **not** set CRM `outcome`; badge comes from join.
2. **TTL:** inbox where `inboxExpiresAt != null && inboxExpiresAt <= now`. Dismiss, activity `{ via: "ttl" }`. Batch 100.

Do not dismiss `inboxExpiresAt is null`.

- [ ] **Step 1: Failing cutoff tests**

```ts
it("grandfathers null inboxExpiresAt", () => {
  expect(isInboxExpired({ inboxExpiresAt: null, now: new Date() })).toBe(false);
});
it("expires when now >= inboxExpiresAt", () => {
  expect(
    isInboxExpired({ inboxExpiresAt: new Date("2026-01-01"), now: new Date("2026-01-08") })
  ).toBe(true);
});
```

- [ ] **Step 2: FAIL then implement helpers + tick**

- [ ] **Step 3: Wire 12h repeat on the liveness queue (`jobId: "job-inbox-liveness-tick"`).**

- [ ] **Step 4: PASS + `vp check` api/server**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/lib/job-discovery/liveness.ts packages/core/src/job-discovery apps/server/src/queues/job-inbox-liveness-queue.ts
git commit -m "feat(server): inbox liveness check and 7-day TTL"
```

---

### Task 16: Docs index + copy leftovers

**Files:**

- Modify: `Agents.md` — add the spec under Active program specs (one line + link)
- Modify: `packages/core/src/mail/constants.ts` if Task 13 missed any “harvest source for New jobs” copy
- Grep `apps/web` for “email alerts” / “job alert digests” on New jobs / Jobs settings and update stragglers

- [ ] **Step 1: Grep and fix user-visible copy only** (do not rewrite Career Mail specs)

```bash
rg -n "email alerts|job alert digest|Used to filter jobs from email" apps/web packages/core/src/mail/constants.ts Agents.md
```

- [ ] **Step 2: Add spec link to `Agents.md` Active program specs**

- [ ] **Step 3: Commit**

```bash
git add Agents.md apps/web packages/core/src/mail/constants.ts
git commit -m "docs: link job-discovery spec and fix mail-first copy"
```

---

### Task 17: App + AI feature hardening

**Files:** none new. Follow `.agents/skills/app-ai-feature-hardening/SKILL.md` end to end.

**Contract to write in the hardening reply:**

| Item                 | Content                                                                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User-visible success | Settings save a pack + N; Find jobs now lands ≤ N inbox rows; AI pass stays, AI fail appears under Dismissed and backfills; no key still lands; Scan hidden when mail off; inbox never exceeds 50; listing-closed badge on tracked; 7-day / liveness dismiss only new rows |
| Entry paths          | Settings → Jobs; New jobs → Find jobs now; New jobs → Scan (toggle on); daily ingest tick; classify `job_notifier` with toggle off/on; Tracked jobs panel; Dismissed tab                                                                                                   |
| Shared state         | `job_posting`, `application` inbox, `user_job_ai_budget`, job preference row, BullMQ jobs                                                                                                                                                                                  |
| Non-goals            | Company watchlist, LinkedIn scrape, communal embeddings, live Remotive quota against production                                                                                                                                                                            |

**Loops (required):**

1. Unit: cheap-score, land-budget, title-packs, planner (already in tree).
2. Authenticated `findNow` against running server (no key + with key).
3. Browser: Settings save; New jobs Find jobs now; empty/title-missing; inbox-full; Scan absent when toggle off; Scan present when on; Tracked listing-closed if a closed posting exists (can mark one row in dev).
4. Confirm classify does not enqueue harvest when toggle off (server log `importFromEmail: false` or harvest not called).

Then: fix root causes, re-run the failing loop, append `LESSONS.md`, write the hardening report. **No “done” without that report.**

- [ ] **Step 1: Load LESSONS.md + this spec/plan**

- [ ] **Step 2: Run the matrix; fix; re-verify**

- [ ] **Step 3: Append lessons + paste hardening report in the PR/commit message body or a short `docs/superpowers/plans/` note only if the skill requires a file — otherwise the session report + LESSONS.md is enough**

- [ ] **Step 4: Commit hardening fixes + LESSONS.md only**

```bash
git add .agents/skills/app-ai-feature-hardening/LESSONS.md
git commit -m "test: harden job discovery adapters"
```

---

## Spec coverage (self-review)

| Spec item                                                              | Task                        |
| ---------------------------------------------------------------------- | --------------------------- |
| Shared `job_posting`, no userId                                        | 4, 5, 8                     |
| No shared LLM / BYO only                                               | 9, 12, Global               |
| Hybrid cheap → land → AI                                               | 2, 9                        |
| Title combobox + custom ≥2                                             | 1, 11                       |
| Wider pack list                                                        | 1                           |
| Cheap = title + structured; exclude kill; no JD; no minMatchScore skip | 2                           |
| AI minMatchScore; fail → dismiss `via: low_match` + backfill           | 9                           |
| N 15–40 default 25; 50 open; 2N attempts                               | 1, 2, 9                     |
| AI enqueue immediately; land does not await model                      | 9, 10, 12                   |
| 7-day TTL + ~3.5d HTTP liveness; grandfather; tracked badge            | 4, 14, 15                   |
| Mail toggle default off; classify/Scan gated                           | 11, 12, 13                  |
| v1 sources + ATS gate + no watchlist                                   | 7                           |
| Daily cron + Find jobs now                                             | 10, 12                      |
| Dedup canonicalize + (userId,url) + (adapter,externalId)               | 7, 9                        |
| Ingest shared distinct q; Find jobs now ingest if thin                 | 8, 12                       |
| No key still lands                                                     | 9, 12                       |
| `discovery` source tag + labels                                        | 3                           |
| Hydrate catalog before personal AI                                     | 8, 9                        |
| Fill/fix location/salary on the **application** only                   | 8, 9                        |
| Do not land `closedAt`                                                 | 9                           |
| Remotive global 4/day (cron + Find jobs now)                           | 8, 12                       |
| Liveness checks inbox **and** tracked                                  | 15                          |
| Attribution source + URL                                               | 9, UI existing listing link |
| Out of v1 (watchlist, Workday, communal LLM, …)                        | not scheduled               |
| Hardening skill                                                        | 17                          |

## Out of this plan

- First-party ATS watchlist adapters
- Workday / JobSpy / LinkedIn HTML
- Meilisearch / embeddings / communal enrich
- Multi title-pack select
- User-visible daily AI cap slider
- Rewriting mail harvest onto the catalog backfill loop
