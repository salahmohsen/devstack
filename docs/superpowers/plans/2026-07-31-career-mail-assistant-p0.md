# Career Mail Assistant P0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Career Mail Assistant foundation: extended mail labels (`job_notifier`, `noise`, `application_status`), Needs action + Noise hub categories, application schema for match % / apply method / dual URLs, job preference schema, classify routing that uses real corpus patterns, and sparse notification kinds — without full job crawl harvest yet.

**Architecture:** Extend existing Career Inbox classify + hub cards + Applications CRM. P0 = contracts + DB + classify heuristics/LLM kinds + hub UI + prefs storage. Job-link harvest workflow is **P1** (enqueue stub only in P0 when `job_notifier` is labeled).

**Tech Stack:** packages/core (zod), packages/db (Drizzle), packages/api (oRPC), apps/web (TanStack), apps/server (BullMQ), Mastra classify (existing), `@tsu-stack/ui` / coss.

**Spec:** `docs/superpowers/specs/2026-07-31-career-mail-assistant-design.md`

---

## File map (P0)

| Area                     | Files                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mail labels + categories | `packages/core/src/mail/types.ts`, `constants.ts`, `classify.ts`, list filter schemas                                                                    |
| Notifications            | `packages/core/src/notification-settings/types.ts`, `constants.ts`                                                                                       |
| Application fields       | `packages/core/src/application/types.ts`, `utils.ts`                                                                                                     |
| Job preferences          | **Create** `packages/core/src/job-preference/*`                                                                                                          |
| DB                       | `packages/db/src/schema/mail-message.schema.ts` (if needsAction flag), `application.schema.ts`, **create** `job-preference.schema.ts`, migrations, repos |
| API                      | mail list filters, applications CRUD fields, **create** jobPreference router                                                                             |
| Web                      | `mail-category-page.tsx`, mail feature queries, applications board badges, Settings Jobs page                                                            |
| Worker                   | classify output accepts new labels; harvest enqueue **stub**                                                                                             |

---

### Task 1: Core — extend mail system labels + hub categories

**Files:**

- Modify: `packages/core/src/mail/types.ts`
- Modify: `packages/core/src/mail/constants.ts`
- Modify: `packages/core/src/mail/classify.ts`
- Modify: `packages/core/src/mail/corrections.ts` (if label enums)
- Test: existing mail unit tests under `packages/core` if present

- [ ] **Step 1: Extend `MailSystemLabelSchema`**

```ts
// types.ts
export const MailSystemLabelSchema = z.enum([
  "application",
  "recruiter",
  "interview",
  "offer",
  "job_notifier",
  "noise",
  "application_status"
]);
```

- [ ] **Step 2: Extend `MailCategoryIdSchema`**

Add: `needs_action`, `noise` (keep applications/recruiters/interviews/offers/unsorted/all).

- [ ] **Step 3: Update constants maps**

- `MAIL_SYSTEM_LABELS`, category cards order:

```text
needs_action, applications, recruiters, interviews, offers, noise, unsorted, all
```

- Map `job_notifier` → not a dedicated card (or optional later); harvest goes to Applications
- Map `noise` → category `noise`
- `needs_action` is **filter**: messages with needsAction true OR labels in {recruiter, interview, offer} OR application_status with pending user step — implement filter rule in list repo (Task 3)

- [ ] **Step 4: Update `heuristicClassifyMail`**

- If `isJobAlertDigestMail` → primary system label **`job_notifier`** (not null)
- Add noise heuristics from corpus domains: github.com, spotify, substack, cloudflare, openai, airbnb (careful), wuzzuf marketing subjects
- application_status: keep APPLICATION_RE but emit **`application_status`** when status-like; keep `application` for pipeline-linked career signal if already used — **spec lock:** status phrases → `application_status`
- Do not CRM-mutate on `job_notifier` or `noise` (worker already should skip digests — verify)

- [ ] **Step 5: Unit tests for heuristics**

Cases: LinkedIn jobalerts from; “application was sent”; openai product; offer letter.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/mail
git commit -m "feat(mail): extend system labels for assistant (job_notifier, noise, application_status)"
```

---

### Task 2: Core + DB — Application applyMethod, applyUrl, matchScore

**Files:**

- Modify: `packages/db/src/schema/application.schema.ts`
- Modify: `packages/core/src/application/types.ts`, `utils.ts`, `index.ts`
- Modify: applications repository + API create/update schemas
- Migration via `pnpm db:generate` (local only)

- [ ] **Step 1: Schema**

```ts
export const applicationApplyMethodEnum = pgEnum("application_apply_method", [
  "easy_apply",
  "external",
  "email",
  "unknown"
]);

// columns on application:
applyUrl: text("apply_url"),
applyMethod: applicationApplyMethodEnum("apply_method").notNull().default("unknown"),
matchScore: integer("match_score"), // 0-100, nullable
// url remains listing/source URL
```

- [ ] **Step 2: Core zod types + list output**

Include new fields on Application schema for list/detail.

- [ ] **Step 3: Migration + apply local**

```bash
pnpm dotenvx run -f ./packages/env/.env -- pnpm db:generate
# migrate only if DATABASE_URL is localhost
```

- [ ] **Step 4: Wire API create/update** (optional fields)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(applications): applyMethod, applyUrl, matchScore"
```

---

### Task 3: DB + API — JobPreference singleton

**Files:**

- Create: `packages/core/src/job-preference/types.ts`, `constants.ts`, `index.ts`
- Create: `packages/db/src/schema/job-preference.schema.ts`
- Create: repository + oRPC `jobPreference.get` / `jobPreference.upsert`
- Export from package indexes

- [ ] **Step 1: Core schema**

```ts
workMode: z.enum(["remote", "hybrid", "onsite"]);
JobPreferenceSchema = z.object({
  workModes: z.array(WorkModeSchema).default([]),
  locations: z.array(z.string()).default([]),
  roleKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  salaryMin: z.number().nullable().optional(),
  salaryCurrency: z.string().nullable().optional(),
  minMatchScore: z.number().int().min(0).max(100).default(60)
});
```

- [ ] **Step 2: Table `job_preference`** unique on `user_id`

- [ ] **Step 3: Protected oRPC get/upsert**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(job-preference): user job preferences for mail harvest filter"
```

---

### Task 4: Mail list — Needs action + Noise filters

**Files:**

- Modify: `packages/db` mail list repository category filters
- Modify: `packages/core` list category schema
- Modify: `apps/web/.../mail-category-page.tsx` + CAREER_LABELS display

- [ ] **Step 1: Repository filters**

- `noise`: labels contain `noise`
- `needs_action`: labels overlap `{recruiter, interview, offer, application_status}` OR future `needs_action` flag — for P0 use label set; exclude pure `noise` and pure `job_notifier` without other action labels
- Document rule in code comment

- [ ] **Step 2: Hub cards render new categories** (constants already)

- [ ] **Step 3: Reader badges** for new labels (variants)

- [ ] **Step 4: Manual smoke** — open `/dashboard/mail/needs-action` and `/dashboard/mail/noise`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(mail): Needs action and Noise hub categories"
```

---

### Task 5: Classify worker — emit new labels; harvest enqueue stub

**Files:**

- Modify: mail classify Mastra/worker path under `apps/agent` + `apps/server` queues
- Create: `packages/core/src/mail/harvest-queue.ts` job payload `{ messageId, userId }`
- Modify: after classify if `job_notifier` in labels → `enqueueMailJobHarvest` (no-op worker log)

- [ ] **Step 1: Ensure CRM effects skip `job_notifier` / `noise`**

- [ ] **Step 2: Enqueue harvest stub** (P1 implements real crawl)

- [ ] **Step 3: Re-classify path for testing** — optional admin/dev or re-run existing classify for sample message ids

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(mail): classify job_notifier/noise; stub job harvest enqueue"
```

---

### Task 6: Notification kinds

**Files:**

- Modify: `packages/core/src/notification-settings/types.ts`, `constants.ts`
- Wire emit points only where already easy (optional in P0 if emit helpers exist)

Add kinds:

```ts
"mail.needs_action";
"mail.apply_nudge";
"mail.job_alerts_ready";
```

- [ ] **Step 1: Schema + labels/descriptions**
- [ ] **Step 2: Do not emit on noise**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(notifications): mail assistant notification kinds"
```

---

### Task 7: Settings → Jobs UI (prefs)

**Files:**

- Create: settings section under dashboard settings (follow existing mail/AI settings patterns)
- Feature query/mutation wrappers in `apps/web/src/features/job-preference/`

- [ ] **Step 1: Form** work modes multi-select, locations chips or comma text, keywords, exclude, minMatchScore slider
- [ ] \*\*Step 2: Wire get/upsert
- [ ] **Step 3: Empty helper copy** — “Used to filter jobs from email alerts”
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): Settings Jobs preferences for mail harvest"
```

---

### Task 8: Applications UI — show match % + apply badges (read-only P0)

**Files:**

- Applications board/list card components under `apps/web/src/pages/dashboard/applications` or features

- [ ] **Step 1: Badge** `87% match` when matchScore non-null
- [ ] **Step 2: Badge** Easy Apply / External / Email from applyMethod
- [ ] **Step 3: Links** — if applyUrl, show Apply + View listing
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(applications): display match score and apply method"
```

---

### Task 9: Corpus fixtures + heuristic regression (no PII in git)

**Files:**

- Create: `packages/core/src/mail/__fixtures__/classify-cases.json` — **redacted** subjects/from only (no body PII)
- Test: heuristic cases from design lock § eval fixtures

- [ ] **Step 1: Add redacted fixtures**
- [ ] \*\*Step 2: Tests pass
- [ ] **Step 3: Commit**

```bash
git commit -m "test(mail): redacted classify fixtures from real corpus patterns"
```

---

### Task 10: Docs touch-up

**Files:**

- Modify: `.scratch/career-inbox-ai-platform/MAIL.md` or link from Agents index if needed
- Link design lock from career-inbox spec Related section (one line)

- [ ] **Step 1: Cross-link**
- [ ] **Step 2: Commit**

```bash
git commit -m "docs: link Career Mail Assistant design lock"
```

---

## P0 out of scope (do not implement here)

- Full job page crawl / extract Mastra workflow (P1)
- Match scoring implementation beyond storing fields (P1 uses prefs)
- Gmail first-sync maxResults increase
- Agent chat job submit
- Browser-based crawl

## P1 preview (next plan)

1. Harvest worker: extract links → fetch → extract job → score vs prefs → create apps
2. Batch `mail.job_alerts_ready` notification
3. Reader assistant strip for harvest progress

---

## Verification (P0 done when)

- [ ] New labels exist in core and classify heuristics cover corpus patterns
- [ ] Hub shows Needs action + Noise; list filters work
- [ ] Applications can store/display applyMethod, applyUrl, matchScore
- [ ] Job preference get/upsert works from Settings
- [ ] job_notifier enqueue harvest stub logs without creating apps yet
- [ ] Unit tests for heuristics green
