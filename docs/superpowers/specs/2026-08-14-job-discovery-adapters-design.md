# Job discovery adapters + shared catalog — Design

**Date:** 2026-08-14  
**Status:** Accepted (grilled lock; ready for implementation plan)  
**Goal:** Fill **New jobs** from **free, high-quality public job APIs** via one adapter contract, a **shared posting catalog**, cheap preference ranking, then **per-user BYO AI** (score, agent take, fill/fix). Mail harvest becomes **opt-in**.

**Hardening:** After implementation, run [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md) before claiming done. Fresh report + lessons in that skill’s `LESSONS.md`.

**Related**

- [New jobs + Tracked jobs](./2026-08-11-new-jobs-tracked-jobs-design.md)
- [Job source label + New jobs actions](./2026-08-12-job-source-label-and-new-jobs-actions-design.md)
- [Career Mail Assistant P0](./2026-07-31-career-mail-assistant-design.md)
- [Career mail AI-first pipeline](./2026-08-04-career-mail-ai-first-pipeline-design.md)
- [Seeker Applications CRM](./2026-07-28-seeker-applications-crm-design.md)
- ADR-0024 stages + outcomes

**Supersedes (discovery only):** Mail `job_notifier` → harvest as the **default** New jobs source. Tracking via `application_status` / recruiter mail is unchanged.

---

## Problem

1. New jobs only fills from **mail harvest**. Adapter-quality boards (Greenhouse, Himalayas, …) are unused.
2. The same Stripe role harvested for two tenants is stored and AI-scored **twice**. There is no shared posting.
3. LinkedIn/Indeed HTML scrapers are popular and **ToS-hostile**. We need official JSON only.
4. BYO AI: we must not bill user A’s key to enrich a job user B reuses.
5. Cheap `minMatchScore` on **title-only** currently **hard-skips** before AI sees the JD — accuracy tax.

---

## Product intention

```text
Shared shelf (job_posting)     Per-user plate (application inbox)
  adapters fetch once     →      cheap rank → land ≤ N
  HTTP / ATS JSON         →      BYO AI score + take + fill/fix
  7-day / liveness        →      New jobs ≤ 50 open
```

Discovery is **search + inbox**, not a public job board product. Tracked jobs CRM stays as designed.

---

## Frozen decisions (grill log)

| #   | Topic                    | Decision                                                                                                                                                          |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Catalog                  | Shared `job_posting`. One listing, many users.                                                                                                                    |
| 2   | Shared AI                | **None.** Shared = HTTP fetch + fields the source already sent. Personal score / take / field-fix = that user’s BYO key on **their** row.                         |
| 3   | Delivery                 | Hybrid: cheap retrieve → land → AI.                                                                                                                               |
| 4   | Title                    | One combobox pack **or** custom title with **≥2** role keywords.                                                                                                  |
| 5   | Title list               | Wider tech (see packs below).                                                                                                                                     |
| 6   | Cheap score              | Tag hits on **title + structured catalog fields** (work mode, location, ATS skills/salary). Not full HTML JD. Exclude = kill.                                     |
| 7   | `minMatchScore`          | Applies to the **AI** score. Cheap score **ranks** only.                                                                                                          |
| 8   | AI fail                  | Auto-dismiss. **Backfill** next cheap candidates until **N pass** or pile empty.                                                                                  |
| 9   | N                        | **Jobs per search run**, slider **15–40**, default **25**.                                                                                                        |
| 10  | Open inbox cap           | Max **50** `trackingStatus=inbox` rows. Extra cheap hits stay on the shelf.                                                                                       |
| 11  | AI when                  | **Immediately** on land (all landed jobs).                                                                                                                        |
| 12  | Daily AI cap             | Hidden **2 × N** successful AI jobs / UTC day (default 50).                                                                                                       |
| 13  | TTL                      | Unread inbox auto-dismiss after **7 days**. HTTP liveness at **~day 3.5**. Tracked never auto-dismissed (may mark listing closed).                                |
| 14  | Liveness                 | **HTTP / board JSON**, not AI.                                                                                                                                    |
| 15  | Mail harvest             | Optional Jobs toggle, **default off** for everyone. Status/recruiter mail still **tracks**.                                                                       |
| 16  | v1 sources               | **freehire search (ATS-only)** + Himalayas, Arbeitnow, Remotive, RemoteOK. **No company watchlist.** No Workday/JobSpy/LinkedIn scrape.                           |
| 17  | First-party ATS adapters | Greenhouse / Ashby / Lever / Workable / SmartRecruiters **not built in v1** (freehire already read those boards). Later epic = watchlist slugs.                   |
| 18  | Cadence                  | Daily cron + **Find jobs now**. Each run still ≤ N and ≤ remaining daily AI budget.                                                                               |
| 19  | Dedup                    | User: existing `(userId, url)` unique. Catalog: `(adapter, externalId)`. Prefer first-party URL if we later have both; v1 skip land if user already has that URL. |
| 20  | Live probe (2026-08-14)  | Frontend prefs: ~**21 cheap matches/day** (freehire ~12 + Himalayas ~7). N=25 ≈ one average day.                                                                  |

---

## Information architecture

| Surface                   | Change                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| Settings → Jobs           | Title combobox, N slider, mail-harvest toggle, existing prefs. Description no longer mail-only. |
| `/dashboard/new-jobs`     | Same inbox; new channel tag `discovery`. **Find jobs now** in header.                           |
| `/dashboard/tracked-jobs` | Unchanged CRM.                                                                                  |
| Career Inbox              | Harvest **off** by default. Classify + CRM match remain.                                        |

---

## Adapter contract

One **normalized output**, **capability-split** fetch. Not one `scrape(query)` that pretends every site is Indeed.

### Output (`NormalizedListing`)

Maps onto existing `HarvestedJob` plus catalog keys:

| Field                    | Required | Notes                                                                  |
| ------------------------ | -------- | ---------------------------------------------------------------------- |
| `adapterId`              | yes      | `freehire` \| `himalayas` \| `arbeitnow` \| `remotive` \| `remoteok`   |
| `externalId`             | yes      | Native id (freehire `public_slug`, Remotive numeric id, …)             |
| `listingUrl`             | yes      | Canonical apply/listing URL                                            |
| `title`, `companyName`   | yes      |                                                                        |
| `location`, `workMode`   | no       | Structured only if the API **stated** it                               |
| `salaryMin/Max/Currency` | no       | Structured only                                                        |
| `skills` / `tags`        | no       | Structured only                                                        |
| `description`            | no       | If the list payload already includes it (Himalayas, Greenhouse via FH) |
| `postedAt`               | no       | For recency / daily stats                                              |
| `sourcePlatform`         | no       | e.g. freehire row `source=greenhouse`                                  |

Do **not** infer work mode or salary from the JD in the adapter. Pipeline dictionaries / user AI do that later.

### Interface (TypeScript, `packages/core`)

```ts
type AdapterCapability = "search" | "feed";

type JobSourceAdapter = {
  id: string;
  capabilities: readonly AdapterCapability[];
  fetch(input: AdapterFetchInput): Promise<NormalizedListing[]>;
};
```

| Adapter     | Capability | Fetch input (v1)                                                                                                                       |
| ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `freehire`  | `search`   | `q` from title pack + extra keywords; `work_mode` if prefs not “all”; `source=` ATS allowlist; `limit`/`offset`; sort `posted_at` desc |
| `himalayas` | `search`   | `/jobs/api/search?q=&sort=recent&page=`                                                                                                |
| `arbeitnow` | `feed`     | `/api/job-board-api?page=` then cheap-filter locally                                                                                   |
| `remotive`  | `search`   | `/api/remote-jobs?search=&category=software-dev` — **land only if title hits**                                                         |
| `remoteok`  | `feed`     | `/api` dump — **land only if title hits** (dump is mixed roles)                                                                        |

Registry: `id → adapter`. Adding a source = one module + one registry line (freehire `sources.All` pattern).

**freehire quality gate:** keep rows whose `source` is in  
`greenhouse | ashby | lever | workable | smartrecruiters`.  
Drop aggregator copies (himalayas/adzuna/…) — we fetch those ourselves.  
Never call freehire LLM / credits / `/jobs/{slug}/match-analysis`.

**Attribution:** Himalayas, Remotive, RemoteOK require link-back / name-the-source in UI (`sourceLabel` + listing URL). Honor their rate notes (Remotive ~4/day, Himalayas 20/page, no browser CORS).

**Out of v1:** Workday, JobSpy, LinkedIn/Indeed HTML, paid Apify/JobsPipe, company watchlist, ever-jobs as a runtime.

---

## Shared catalog

New table `job_posting` (**no `userId`**):

| Column                                | Role                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `id`                                  | PK                                                               |
| `adapterId`, `externalId`             | `UNIQUE` — idempotent upsert                                     |
| `listingUrl`                          | Indexed; used for user-row dedup                                 |
| `title`, `companyName`, `location`, … | Structured payload                                               |
| `description`                         | Nullable; filled when the adapter (or later HTTP hydrate) has it |
| `sourcePlatform`                      | e.g. `greenhouse` when adapter is freehire                       |
| `contentHash`                         | Skip reindex/re-land when unchanged                              |
| `firstSeenAt`, `lastSeenAt`           | Liveness                                                         |
| `closedAt`                            | Soft-close when board/HTTP says gone                             |
| `raw` (jsonb, optional)               | Debug / re-normalize; do not send to the client                  |

Workers **upsert** here. Unchanged hash → bump `lastSeenAt` only.

**HTTP hydrate (shared, $0 tokens):** if `description` is empty and `listingUrl` is a public page, one fetch + existing `extractJobListingFromHtml` (JSON-LD first). Result writes to **catalog**, not a user row. Dedup so 50 users do not scrape Stripe 50 times.

---

## Per-user land (New jobs)

Landing writes an **`application`** row (`trackingStatus=inbox`) as today, plus `postingId` FK (nullable for manual/hub/mail).

**Land algorithm (one run, one user):**

1. Require a valid title pack **or** custom title + ≥2 role keywords. Else no-op + settings hint.
2. `openInbox = count(inbox)`. Seats = `max(0, 50 - openInbox)`. Stop if 0.
3. `budget = min(N, seats, remainingDailyAiBudget)`.
4. Cheap-score **open, unseen** catalog rows (not already this user’s url/postingId; not dismissed/tracked).
5. Sort cheap desc, walk the pile:
   - Exclude-keyword or no title-tag hit → skip (never land).
   - Land a **stub** inbox row (heuristic score stored as `cheapScore` or until AI overwrites `matchScore`).
   - Enqueue **personal AI** (user key). On AI `score < minMatchScore` → dismiss + do not count as a filled seat; continue.
   - On AI success → count +1 toward budget.
6. Stop at budget or pile empty.

**Daily AI cap:** count successful AI jobs (score+take attempt that ran the model) per user per UTC day. Hidden. Cron + button share the cap.

**Find jobs now:** same algorithm; disabled when budget=0 or no title.

---

## Cheap score (no LLM)

Reuse the spirit of `scoreJobAgainstPreference`, **inputs = title + structured catalog fields only**:

- Exclude keyword in title/structured → 0, fail.
- ≥1 title-pack or extra role keyword in **title** → required (else fail, score 15).
- More title hits raise score (existing 15+10×hits, cap +40).
- Structured skill/location/workMode hits are a **small bonus**, not a substitute for a title hit.
- Work mode / location: existing OR rules. “All three work modes” = no mode penalty. Remote + “EU remote” in prefs: treat `workMode=remote` as location-ok (current helper).
- **Do not** use full HTML JD here.
- **Do not** hard-skip on `minMatchScore` at this layer.

Store cheap reasons for debug; UI may show a muted “estimated” until AI returns.

---

## Personal AI (BYO)

On land, same agents as harvest:

1. Fill/fix **only the user’s application copy** (missing location, work mode, salary parse). **Never write AI guesses onto `job_posting`.**
2. `job-preference-match-scorer` → `matchScore`, `matchPassed`, reasons.
3. Agent take → `agentTake` (soft-fail).

No key → land with cheap score only; `matchScore` stays heuristic; take null. User can still track. Do not burn retries.

Missing key + Find jobs now: toast to Settings → AI (existing BYO pattern).

---

## Settings → Jobs

| Field                        | v1                                                                |
| ---------------------------- | ----------------------------------------------------------------- |
| **Job title**                | Combobox: packs below **or** custom. Custom requires ≥2 keywords. |
| Role keywords                | Existing tags; pack seeds then user extends.                      |
| Exclude keywords             | Existing.                                                         |
| Work modes / locations / pay | Existing.                                                         |
| Minimum match score          | Existing slider; **AI bar** (default 60; user’s row may be 70).   |
| **Jobs per search (N)**      | 15–40, step 5, default **25**.                                    |
| **Also import from email**   | Switch, default **off**.                                          |

Constants (not sliders): open inbox max **50**, TTL **7d**, liveness at **half TTL**, AI cap **2N**/day.

Copy: settings description is no longer “email alerts only.”

---

## Title packs (closed list)

| Id             | Label               | Seed keywords (union, case-insensitive)                                       |
| -------------- | ------------------- | ----------------------------------------------------------------------------- |
| `frontend`     | Frontend Engineer   | frontend, front-end, react, typescript, next.js, nextjs, ui engineer          |
| `backend`      | Backend Engineer    | backend, back-end, api, node, java, golang, python, postgres                  |
| `fullstack`    | Full-stack Engineer | fullstack, full-stack, frontend, backend, react, node, typescript             |
| `mobile`       | Mobile Engineer     | mobile, ios, android, react native, flutter, swift, kotlin                    |
| `data_ml`      | Data / ML           | data scientist, machine learning, ml engineer, data engineer, python, pytorch |
| `devops`       | DevOps / Platform   | devops, platform, sre, kubernetes, infra, terraform, aws                      |
| `product`      | Product Manager     | product manager, pm, product owner                                            |
| `design`       | Product Designer    | product designer, ux, ui designer, figma                                      |
| `qa`           | QA / SET            | qa, quality, sdet, test engineer, automation                                  |
| `security`     | Security Engineer   | security, appsec, pentester, infosec                                          |
| `eng_manager`  | EM / Manager        | engineering manager, em, head of engineering                                  |
| `devrel`       | DevRel              | developer advocate, devrel, dx engineer                                       |
| `data_analyst` | Data Analyst        | data analyst, analytics, bi, sql                                              |
| `solutions`    | Solutions Engineer  | solutions engineer, sales engineer, se                                        |

Picking a pack **replaces** the seed set then **keeps** user-added extras that are not in the seed. Switching packs resets seeds, not extras (implementation: store `titleId` + `roleKeywords`; extras = keywords not in the pack’s seed).

Custom: `titleId = custom`, `customTitle` required, `roleKeywords.length >= 2`.

---

## Mail

| Path                             | v1                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `application_status` / recruiter | Unchanged: match existing **tracked** (or create tracked per existing CRM rules). Not New jobs.                                                   |
| `job_notifier`                   | If toggle **off**: classify only. No harvest.                                                                                                     |
| `job_notifier`                   | If toggle **on**: existing harvest workflow, same cheap+AI+TTL. Does **not** consume adapter N. Still counts toward daily AI cap and 50-open cap. |

Default toggle **off** for all users (including those with prior mail-harvested inbox rows). Those rows stay.

---

## Source tags

Extend `ApplicationSourceTag`:

- Channel: add **`discovery`** (`mail` \| `hub` \| `manual` \| `discovery`).
- Platform: keep closed enum; adapter land uses `inferApplicationSource(listingUrl)` then `sourceLabel` (Himalayas, Arbeitnow, freehire, …) when platform is `other` / company site.

Discovery land: `sourceTags = ["discovery", platform?]`.

---

## Lifecycle

| Event                    | Action                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| Daily cron               | Fetch adapters → upsert catalog → run land for users with a valid title |
| Find jobs now            | Same land for session user                                              |
| ~3.5 days after land     | HTTP/board check listing. Closed → dismiss inbox (or flag tracked).     |
| 7 days inbox, still open | Auto-dismiss.                                                           |
| User dismiss / track     | Frees an open seat (next run can fill).                                 |
| Catalog `closedAt`       | Do not land; mid-life check uses this if already known.                 |

Liveness: HEAD/GET listing URL or, for freehire-sourced rows, search/detail if URL is gone. Shared result updates `job_posting.closedAt`.

---

## Data / API sketch (for the plan, not extra product)

**DB:** `job_posting` as above; `application.postingId` nullable FK; `job_preference.titleId`, `customTitle`, `jobsPerRun`, `importFromEmail`; optional `user_job_ai_budget` (or a small daily counter table).

**Workers:** existing server queues — `job-catalog-ingest`, `job-discovery-land`, `job-inbox-ai`, `job-inbox-liveness`. Run-once / cron, not a new daemon if current queue style fits.

**oRPC:** `jobDiscovery.findNow`, settings fields on existing job-preference upsert, list New jobs unchanged plus cheap/AI score state.

Place shared types and packs in `packages/core` (`job-preference` + new `job-discovery/`).

---

## Live probe (planning input, not a product promise)

2026-08-14 against this tenant’s prefs (Frontend keywords, exclude php / RN, min 70, all work modes, EG/SA/EU remote). Cheap title filter:

- Combined **~21 cheap matches/day** (7-day window): freehire ATS ~12, Himalayas ~7, Arbeitnow ~1.
- Remotive/RemoteOK: **0** under **title** rule (keep adapters; they will under-contribute until queries improve).
- One run at N=25 fills from a **typical weekday**. Shelf leftover is large; 50-open cap is the scan comfort.

---

## Out of scope (v1)

- Company watchlist / first-party Greenhouse adapters
- Workday, JobSpy, LinkedIn/Indeed HTML, paid job APIs
- Communal LLM enrich / embeddings / Meilisearch
- freehire as a hard dependency with no fallback (feeds must still work if FH is down)
- Replacing `application` with a second CRM table
- Multi title-pack select
- User-visible daily AI cap slider

---

## Implementation order (epic, not the plan)

1. Core: packs, `NormalizedListing`, adapter interface, cheap score on structured fields.
2. DB: `job_posting`, preference columns, `application.postingId`.
3. Adapters: freehire (ATS gate) + four feeds.
4. Ingest + land + AI queue + caps.
5. Settings + Find jobs now UI.
6. TTL + liveness.
7. Mail harvest toggle (default off).
8. [app-ai-feature-hardening](../../../.agents/skills/app-ai-feature-hardening/SKILL.md).

---

## Risks

| Risk                                      | Mitigation                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| freehire ToS / rate / downtime            | Cache catalog; feeds remain; do not page their entire 3k index every run |
| Attribution / republish                   | Show source + original URL; do not re-post to Google/LinkedIn            |
| BYO cost                                  | N, 50-open, 2N/day; no shared LLM                                        |
| Title-filter starves Remotive/RemoteOK    | Accept in v1; optional later query tweak                                 |
| Inbox still grows if user never opens app | 7-day dismiss + 50 cap                                                   |
