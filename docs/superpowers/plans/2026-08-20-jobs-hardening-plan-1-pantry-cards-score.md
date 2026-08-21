# Jobs hardening plan 1 — pantry, company, cards, honest score

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared `job_company`, listing years/logo, close/prune, skills bar, years cap after min-match gate, humanizer 5-bullet agent take.

**Architecture:** Follow `.agents/end-to-end-features.md`: db → core → api → web. Spec: `docs/superpowers/specs/2026-08-20-devhub-jobs-hardening-from-freehire-design.md`. ADR 0026.

**Tech Stack:** Drizzle, Zod in `@tsu-stack/core`, oRPC, TanStack Query, existing blobatar / `ItemAvatar`.

**Skills:** `@tsu-stack/core`, `@.agents/end-to-end-features.md`, `@.agents/workflow.md` (db:generate, never prod DATABASE_URL), `@.agents/orpc.md`, `@.agents/testing.md` (tests are requested here), `@humanizer` when writing take prompts + min-match tooltip, `@mastra` when touching agent instructions.

## Global Constraints

- Personal career hub. Not a public job search engine. Do not crawl ATS boards. Consume public JSON adapters only (including Freehire).
- Shared pantry: `job_posting` has no `userId`. Personal score/take live on `application`.
- One hunt: existing single `job_preference` row. No saved searches.
- Years never hide a job. Land/dismiss compares **uncapped** AI `landScore` to Settings `minMatchScore`. Persist and display `displayScore` (`application.matchScore`).
- `YEARS_SCORE_CEILING = 65`. Cap display only when both year numbers exist and `listingMinYears > seekerYears`.
- Seeker years: `mergeExperienceYears` on tenant experience `fromDate`/`toDate`/`isPresent`. Skip undated. Null if nothing dated → do not cap.
- Skills bar: `posting.skills ∩ stack names`, exact, case-insensitive. Hide the bar if the job lists no skills (`available: false`). No adjacent-skill dictionary.
- Blobatar stays the identity face. Do **not** pass company logo as `ItemAvatar` `imageSrc` (that replaces the face). Add a separate small pictogram.
- Logo URL order: adapter/company `logoUrl` on the row, else `https://logo.freehire.me/${encodeURIComponent(companyName)}`. Fail closed: `onError` hides the pictogram. Do not block render. Do not add logo.dev.
- Company identity this run: adapter slug if present, else `companySlugFromName(companyName)`. No merge worker. Duplicate Stripe / Stripe Inc rows are acceptable.
- Close: set `closedAt` + `closedReason`. Do not ingest-land closed rows. After 90 days closed, DELETE the pantry row only if **no** `application` (any trackingStatus) references `postingId`. If any application points at it, close only (`postingId` already `onDelete: set null`).
- Agent take: markdown list, **maximum 5 bullets**, prefer 3–5, prefer <800 chars. Persist markdown on `application.agentTake`. Do **not** flatten to 1–3 sentences (`normalizeAgentTakeText` today does that — rewrite it).
- Humanizer in prompts only (no second LLM). Plain words, `is`/`are`/`has`, no hype, no em dashes, no invented employers/skills/years. Weak fit: say it. Optional cheap strip of `—` / `–` on store.
- Harvest takes: do not slice mid-bullet; if over 1200 keep first complete bullets.
- Catalog LLM enrichment on `job_posting` is forbidden. Personal AI only.
- `vp run db:generate` only after confirming `DATABASE_URL` is local Docker / not `neon.tech` / not production. Never migrate production from this work.
- Tests live in `src/**/__tests__/*.test.ts`. Use `#@/` imports. Conventional commits. `vp check` on touched packages.
- Do not restructure unrelated files. Follow existing drizzle / repository / oRPC patterns.

## File map

| File                                                                                      | Responsibility                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/core/src/job-discovery/{company-slug,seeker-years,skills-overlap,years-cap}.ts` | Pure helpers (Task 1; already in working tree)                      |
| `packages/core/src/job-discovery/types.ts`                                                | `NormalizedListing` optional company/years/logo                     |
| `packages/core/src/application/agent-take.ts`                                             | Markdown take normalizer (replace sentence flattener)               |
| `packages/db/src/schema/job-company.schema.ts`                                            | New `job_company` table                                             |
| `packages/db/src/schema/job-posting.schema.ts`                                            | `companyId`, `experienceYearsMin`, `companyLogoUrl`, `closedReason` |
| `packages/db/src/schema/application.schema.ts`                                            | Denorm `experienceYearsMin`, `companyLogoUrl` at land               |
| `packages/db/src/repositories/job-company.repository.ts`                                  | Upsert by slug                                                      |
| `packages/db/src/repositories/job-posting.repository.ts`                                  | Upsert new fields; `markClosed(id, at, reason)`; prune              |
| `packages/api/src/lib/job-discovery/adapters/*.ts`                                        | Map stated adapter fields only                                      |
| `packages/api/src/lib/job-discovery/ingest.ts`                                            | Company upsert + hydrate; skip closed                               |
| `packages/api/src/lib/job-discovery/inbox-ai.ts`                                          | Years cap after min-match; denorm on insert                         |
| `packages/api/src/lib/application/generate-agent-take.ts`                                 | Take prompt + persist markdown                                      |
| `apps/agent/src/mastra/agents/job-agent-take-agent.ts`                                    | 5-bullet humanizer instructions                                     |
| `apps/web` New jobs / Tracked / hub triage cards                                          | Years badge, skills bar, blobatar + pictogram, markdown take        |
| `apps/web/.../job-preference-fields.tsx`                                                  | Locked min-match tooltip copy                                       |

---

### Task 1: Core helpers (years, slug, skills, cap)

**Files:**

- Create: `packages/core/src/job-discovery/company-slug.ts`
- Create: `packages/core/src/job-discovery/seeker-years.ts`
- Create: `packages/core/src/job-discovery/skills-overlap.ts`
- Create: `packages/core/src/job-discovery/years-cap.ts`
- Create: matching `__tests__/*.test.ts`
- Modify: `packages/core/src/job-discovery/index.ts`

**Interfaces:**

- Consumes: experience rows `{ fromDate, toDate, isPresent }`
- Produces:
  - `companySlugFromName(name: string): string`
  - `mergeExperienceYears(rows, now?: Date): number | null`
  - `skillsOverlap({ jobSkills, stackNames }): { available: boolean; matched: string[]; missing: string[]; percent: number | null }`
  - `applyYearsCap({ aiScore, listingMinYears, seekerYears }): { landScore: number; displayScore: number; capped: boolean }`
  - `YEARS_SCORE_CEILING = 65`

**Note:** These files already exist uncommitted on `feat/jobs-hardening-from-freehire`. Verify they match the interfaces, run tests, fix gaps, then commit. Do not rewrite working helpers.

- [ ] **Step 1:** Confirm tests cover: undated → null; overlap merge; present uses `now`; slug strips Inc/LLC/Ltd; empty job skills → `available: false`; cap display only when listing > seeker; score already below 65 stays; missing years → no cap.

- [ ] **Step 2:** Run:

```bash
cd packages/core && vp run test:unit -- src/job-discovery/__tests__/company-slug.test.ts src/job-discovery/__tests__/seeker-years.test.ts src/job-discovery/__tests__/skills-overlap.test.ts src/job-discovery/__tests__/years-cap.test.ts
```

Expected: all pass.

- [ ] **Step 3:** Commit only core helper files (not docs):

```bash
git add packages/core/src/job-discovery/company-slug.ts packages/core/src/job-discovery/seeker-years.ts packages/core/src/job-discovery/skills-overlap.ts packages/core/src/job-discovery/years-cap.ts packages/core/src/job-discovery/index.ts packages/core/src/job-discovery/__tests__/company-slug.test.ts packages/core/src/job-discovery/__tests__/seeker-years.test.ts packages/core/src/job-discovery/__tests__/skills-overlap.test.ts packages/core/src/job-discovery/__tests__/years-cap.test.ts
git commit -m "feat(core): job years cap, skills overlap, company slug"
```

---

### Task 2: Schema `job_company` + posting/application fields

**Files:**

- Create: `packages/db/src/schema/job-company.schema.ts`
- Modify: `packages/db/src/schema/job-posting.schema.ts`
- Modify: `packages/db/src/schema/application.schema.ts`
- Modify: `packages/db/src/schema/index.ts`, `relations.ts`
- Generate: `packages/db/src/types`, migration under `packages/db`

**Interfaces:**

- Consumes: existing `jobPosting` / `application` tables, `user` not on company
- Produces: `job_company` row; posting FKs; application denorm columns for stable cards after close

- [ ] **Step 1:** Add `job_company` matching this shape (ids `crypto.randomUUID()` at insert, not in schema):

```ts
export const jobCompany = pgTable(
  "job_company",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    website: text("website"),
    tagline: text("tagline"),
    employeeCount: integer("employee_count"),
    companySize: text("company_size"),
    companyType: text("company_type"),
    hqCountry: text("hq_country"),
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [uniqueIndex("job_company_slug_uidx").on(table.slug)]
);
```

- [ ] **Step 2:** On `job_posting` add:

```ts
companyId: text("company_id").references(() => jobCompany.id, { onDelete: "set null" }),
experienceYearsMin: integer("experience_years_min"),
companyLogoUrl: text("company_logo_url"),
closedReason: text("closed_reason")
```

Index `job_posting_company_id_idx` on `companyId`.

- [ ] **Step 3:** On `application` add denorm (copied at land, never as the source of truth):

```ts
experienceYearsMin: integer("experience_years_min"),
companyLogoUrl: text("company_logo_url")
```

- [ ] **Step 4:** Export from `schema/index.ts`. Relations: `jobCompany.postings` many; `jobPosting.company` one. Follow `defineRelationsPart` style in `relations.ts`.

- [ ] **Step 5:** Confirm `DATABASE_URL` is local (`docker-compose.infra.yml` Postgres). If it contains `neon.tech` or a production host, **stop**. Then `vp run db:generate` from `packages/db`. Do not run migrate against production.

- [ ] **Step 6:** Commit:

```bash
git commit -m "feat(db): job_company and posting years/logo/closedReason"
```

---

### Task 3: Repositories + ingest mapping

**Files:**

- Create: `packages/db/src/repositories/job-company.repository.ts`
- Modify: `packages/db/src/repositories/job-posting.repository.ts`
- Modify: `packages/db/src/repositories/index.ts`
- Modify: `packages/core/src/job-discovery/types.ts` (`NormalizedListingSchema`)
- Modify: adapters `freehire.ts`, `himalayas.ts`, `remotive.ts`, `remoteok.ts`, `arbeitnow.ts`
- Modify: `packages/api/src/lib/job-discovery/raw.ts` (`toNormalizedListing` already parses the schema)
- Modify: `packages/api/src/lib/job-discovery/ingest.ts`
- Modify: `packages/api/src/lib/job-discovery/liveness.ts` — pass `closedReason` into `markClosed`
- Modify: fixtures + `adapters/__tests__/normalize.test.ts`

**Interfaces:**

- Consumes: Task 1 `companySlugFromName`; Task 2 schema
- Produces: `NormalizedListing` optional `companySlug?: string | null`, `companyLogoUrl?: string | null`, `experienceYearsMin?: number | null`, `seniority?: string | null` (all optional; adapters must not guess from JD prose)
- `jobCompanyRepository.upsertBySlug({ slug, name, logoUrl?, website?, ...profile fields })`
- `jobPostingRepository.upsert` writes new fields when provided; omit keys to leave stored values (same pattern as location/workMode)
- `jobPostingRepository.markClosed(id, closedAt, closedReason)`
- `jobPostingRepository.deleteClosedUnreferenced(now, olderThanMs = 90d)` — delete only if no application has that `postingId`

- [ ] **Step 1:** Extend `NormalizedListingSchema` with optional nullable fields. Do **not** put them in `listingContentHash` (hash stays title/company/location/workMode/skills/description).

- [ ] **Step 2:** Freehire normalize (stated fields only):

```ts
companySlug: asNonEmptyString(rec.company_slug),
experienceYearsMin: asFiniteNumber(enrichment?.experience_years_min),
seniority: asNonEmptyString(enrichment?.seniority)
```

Add those keys to the first fixture job in `freehire-search.json` (`company_slug: "acme"`, `enrichment.experience_years_min: 5`). Assert them in `normalize.test.ts`.

- [ ] **Step 3:** Himalayas: map `companySlug` / `companyLogo` / `companyLogoUrl` if present (`asNonEmptyString`). Remotive: `company_logo`. RemoteOK: `logo` or `company_logo` when non-empty string. Arbeitnow: only if a stated logo field exists; do not scrape.

- [ ] **Step 4:** After listing upsert in `ingest.ts`, if `companySlug` (or slugified name): `upsertBySlug`. If adapter is freehire and slug is set, `GET https://freehire.me/api/v1/companies/{slug}` with **8s timeout**. Swallow errors. Never block ingest. Map stated company JSON onto `job_company` (name, logo, website, size hints, rest in `profile`). Copy `logoUrl` onto posting `companyLogoUrl` when the listing did not already state one.

- [ ] **Step 5:** Skip ingest upsert of rows that are already closed (`closedAt` set) unless the adapter is reopening (this run: do not reopen). Land already uses `listOpenForLand` / `closedAt != null` skip — keep that. `markClosed` must store `closedReason` (`http_gone` | `freehire_missing` | existing probe reason). Add prune: closedAt older than 90d AND no applications with that postingId → delete posting. Call prune from the liveness tick after close work.

- [ ] **Step 6:** Commit:

```bash
git commit -m "feat(api): map company slug years logo on ingest"
```

---

### Task 4: Land/evaluate score cap + take shape

**Files:**

- Modify: `packages/api/src/lib/job-discovery/inbox-ai.ts`
- Modify: `packages/api/src/lib/application/generate-agent-take.ts`
- Modify: `packages/core/src/application/agent-take.ts` (`normalizeAgentTakeText`)
- Modify: `packages/core/src/application/__tests__/` (add/adjust take normalizer tests)
- Modify: `apps/agent/src/mastra/agents/job-agent-take-agent.ts`
- Modify: harvest take prompt in `apps/agent/src/mastra/workflows/mail-job-harvest-workflow/index.ts`
- Modify: `apps/web/src/features/agent-hub/ui/hub-assistant-toolkit.tsx` (it currently calls `normalizeAgentTakeText` for JD preview)
- Modify: `apps/agent/src/mastra/agents/today-letter-writer-agent.ts` — stored takes stay as markdown bullets; do not flatten two named takes into one hype sentence
- Tests: `packages/api/src/lib/job-discovery/__tests__/inbox-ai-decision.test.ts` plus a focused years-cap persist test if one exists nearby

**Interfaces:**

- Consumes: `applyYearsCap`, `mergeExperienceYears`, `YEARS_SCORE_CEILING`
- Produces: insert `matchScore = displayScore`; keep/dismiss uses `landScore` vs `prefs.minMatchScore`; `agentTake` markdown

- [ ] **Step 1:** Rewrite `normalizeAgentTakeText` to keep markdown. Algorithm:

1. Trim.
2. Optionally replace `—` and `–` with `, ` or `. `.
3. Split on lines matching `/^\s*[-*]\s+/`.
4. Keep at most 5 non-empty bullets. Rejoin as `- …\n`.
5. If there are no bullets, wrap the first paragraph as a single `- ` bullet (still max 5 after split).
6. If length > 1200, drop trailing complete bullets until ≤1200 or one bullet remains. Never slice mid-bullet.

Delete the 1–3 sentence flattener. Update any tests that expected sentence slicing.

- [ ] **Step 2:** In `runInboxAiForPosting` after AI `match.score`: load experiences for the user; `seekerYears = mergeExperienceYears(rows)`; `listingMin = posting.experienceYearsMin`; `capped = applyYearsCap({ aiScore: match.score, listingMinYears: listingMin, seekerYears })`. Pass **`capped.landScore`** into `decideInboxAiKeep` / min-match. Persist **`capped.displayScore`** as `application.matchScore`. Copy `experienceYearsMin` and `companyLogoUrl` onto the application insert.

- [ ] **Step 3:** Replace take instructions (agent + `buildPrompt` in generate-agent-take). Load `/humanizer`. Required prompt rules:

```
Write the seeker's agent take as markdown only.
- Maximum 5 bullets. Prefer 3-5. One short point per bullet.
- Optional one-line heading at most. No JSON, no preamble paragraph.
- Ground in listing fields, match reasons, prefs, years badge, and skills overlap when provided.
- If years were capped (listing asks more years than the seeker has), say the listing asks N years.
- Column hard-fails (exclude, level floor, salary, years cap) are law; mention them when they fired.
- Plain words. Short sentences. is/are/has. No hype, no pivotal/landscape/delve, no em dashes.
- Do not invent employers, skills, or years.
- If fit is weak, say so. Do not sell the job.
- Prefer under 800 characters.
```

Pass `experienceYearsMin`, `seekerYears`, `capped` into the prompt JSON.

- [ ] **Step 4:** Harvest path: same markdown rules. If stored take > 1200, keep first complete bullets (the new normalizer).

- [ ] **Step 5:** Commit:

```bash
git commit -m "feat(agent): five-bullet humanizer agent take and years cap"
```

---

### Task 5: Web cards + min-match tooltip

**Files:**

- Modify: `apps/web/src/pages/dashboard/new-jobs/new-jobs-page.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/ui/{list,board,application-info-panel}.tsx`
- Create: `apps/web/src/features/applications/ui/job-card-marks.tsx` (years badge, skills bar, logo pictogram)
- Modify: `apps/web/src/features/agent-hub/ui/new-jobs-triage-card.tsx` (hub HITL — required Plan 1 surface)
- Modify: `packages/core/src/application/propose-new-jobs-triage.ts` (`ProposeNewJobsTriageRow` gains optional `experienceYearsMin`, `companyLogoUrl`, skills overlap)
- Modify: `apps/web/src/features/job-preference/ui/job-preference-fields.tsx`
- Modify: application list/get oRPC output schemas if they omit the new denorm fields
- Modify: `apps/agent/src/mastra/tools/list-new-jobs.tool.ts` to include years/logo/skills so hub triage can show the same marks

**Interfaces:**

- Consumes: `skillsOverlap`, application/posting `experienceYearsMin`, `companyLogoUrl`, `companyName`, `agentTake` markdown
- Produces: shared marks used on New jobs, Tracked, hub triage

- [ ] **Step 1:** Years badge when `experienceYearsMin` is a number: `Asks {n} years`. No badge if null.

- [ ] **Step 2:** Skills bar: compute `skillsOverlap({ jobSkills: posting.skills ?? [], stackNames })`. If `!available`, render nothing. Else a compact bar + `{percent}%` and matched names. Stack names come from the tenant stacks already loaded on the page or from API. If the page does not have stacks, add them to the list payload rather than N+1 fetching in the row.

- [ ] **Step 3:** Identity: keep `ItemAvatar name={companyName}` **without** `imageSrc`. Beside it (or as a 16px overlay that does not replace the face), render `<img>` for logo. Source: `application.companyLogoUrl ?? posting.companyLogoUrl ?? \`https://logo.freehire.me/${encodeURIComponent(companyName)}\``. `onError` → hide img. Empty `companyName` → skip proxy.

- [ ] **Step 4:** Render `agentTake` as markdown (existing card markdown path, e.g. the same renderer other job notes use). Not a `<p>` of flattened text. Info panel currently uses `<p>{item.agentTake}</p>` — switch to markdown.

- [ ] **Step 5:** Min-match slider description **exact copy** (humanizer; no em dash):

`This is the passing line. Each job gets a match score. If that score is below this number, it does not go into New jobs. Years on a listing can lower the score you see; they do not hide the job by themselves.`

- [ ] **Step 6:** Commit:

```bash
git commit -m "feat(web): job cards years logo skills bar and take markdown"
```

---

## Verification

- Core unit tests for years/skills/cap/slug
- Adapter normalize tests for new fields
- Take normalizer keeps bullets; does not flatten to 3 sentences
- `vp check` on touched packages (`core`, `db`, `api`, `web`, `agent` if touched)
- Do not migrate production

## Plan review (2026-08-20)

Self-review vs spec: pantry/company/years/logo/close-90d/skills bar/years cap after land gate/5-bullet take/humanizer/min-match tooltip/hub triage marks covered. Blobatar-vs-logo conflict with `ItemAvatar imageSrc` called out. `normalizeAgentTakeText` sentence flattener called out as required rewrite.

Adversarial review (2026-08-20): named `new-jobs-triage-card.tsx` + `ProposeNewJobsTriageRow`; store path is generate-agent-take + normalizeAgentTakeText + hub-assistant-toolkit; 90-day prune hooked from liveness not a dead helper; Today letter must not flatten bullets.
