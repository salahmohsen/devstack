# DevHub jobs hardening (from Freehire) — design

**Date:** 2026-08-20  
**Status:** Grill locked (session 2026-08-20). Ready for an implementation plan.  
**Goal:** Harden DevHub jobs using Freehire as a product and data reference. Stay a personal career hub. Do not become a public job search engine.

**Hardening:** After implementation, run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md). Fresh report + lessons in that skill’s `LESSONS.md`.

**Related**

- [Job discovery adapters](./2026-08-14-job-discovery-adapters-design.md)
- [Two-axis matching](./2026-08-15-job-preference-two-axis-extraction-design.md)
- [New jobs + Tracked jobs](./2026-08-11-new-jobs-tracked-jobs-design.md)
- [Seeker applications CRM](./2026-07-28-seeker-applications-crm-design.md)
- [Career Inbox](./2026-07-29-career-inbox-ai-platform-design.md)
- [Apply package](./2026-08-04-application-apply-package-design.md)
- ADR [0026](../../adr/0026-job-posting-shared-pool-and-company-table.md) (pool + company table)
- ADR [0024](../../adr/0024-application-stage-and-outcome.md) (stage vs outcome)
- [Tracked jobs blobatar](./2026-08-19-tracked-jobs-blobatar-design.md)

**Amends:** [Product program map](./2026-08-15-product-program-map.md) slots 5 (mail → job CRM) and 6 (logos) are pulled into this program. [Shared integration contracts](./2026-08-15-shared-integration-contracts-design.md) decision 11 (`companyLogoUrl` on application only, no company table) is **superseded** by ADR 0026 and this spec.

**Execution:** Three plan files. One continuous run (plan 1 then 2 then 3, no review pause unless a slice fails). Human review of the finished branch.

**Source study:** `/tmp/freehire-analysis/freehire` ([strelov1/freehire](https://github.com/strelov1/freehire)). Not a dependency.

**Not this spec:** writing code. Implementation plan comes after this file.

---

## Glossary (plain)

**ATS.** Software a company uses to post jobs and collect applications (Greenhouse, Lever, Ashby). The real apply page.

**Job board.** A site that lists many companies’ jobs. Often copies postings. Links can die.

**Pantry / shelf / pool.** Shared `job_posting` rows. No `userId`. One Stripe role, one row.

**Plate / inbox.** Your `application` rows (`inbox`, `tracked`, `dismissed`).

**Hunt.** One person’s job taste. Today: a single `job_preference` row.

**Years required.** Minimum years the _role_ asks for. Lives on the posting, not the company.

**Company.** The employer. Own table. Jobs point at it.

**Blobatar.** Generated face used as the item identity mark. Not replaced by logos.

**Silence nudge.** Reminder that a tracked job has had no stage change and no mail for too long.

**3-stage fit.** Freehire’s paid LLM report (checklist, recruiter scores, skeptic pass). Not how we _find_ jobs.

**Land AI.** DevHub `matchScore` + `agentTake` when a job enters New jobs.

**Humanizer.** Writing rules from the project `/humanizer` skill (plain voice, no hype, no em dashes, no invented facts). Encoded in job-AI prompts and checked on user-facing strings. Not a runtime call to the skill file.

**Agent take.** Short markdown on the job: why it may fit. Max **five** concise bullet points. Not a 1–3 sentence paragraph.

---

## Product lock

DevHub is a personal career hub: fill New jobs, track applications, wire mail and BYO AI.

It is not a public catalogue browser. We do not crawl company ATS boards ourselves. We consume public JSON adapters (including Freehire). We steal career-product ideas, not Freehire’s crawl fleet or Meilisearch board.

---

## What we already have

Shared ingest → `job_posting` → cheap score + two-axis → evaluate (BYO score + take) → New jobs. Tracked CRM. Career Inbox classify and CRM apply. Apply package. Hub Find now and triage. HTTP liveness and 7-day inbox TTL. Blobatar on cards.

Gaps: no company entity, no years field, no stored logo, `matchScore` can look too high vs years, job card does not show mail threads, no silence reminders, no interview rehearsal.

---

## Program scope (in)

### Data and Find

- Keep the shared pantry. Close dead listings (`closedAt` + `closedReason`). Do not land closed rows. After 90 days closed, **DELETE** the pantry row only if **no** `application` (any trackingStatus) still references it. If any application points at it, close only (`postingId` already `onDelete: set null` as a backstop).
- One hunt (`job_preference`). No multiple saved searches in this program.
- `job_company` table (slug, name, logoUrl, website, profile jsonb, size/type hints).
- `job_posting`: `companyId` / slug, `experienceYearsMin`, denorm `companyLogoUrl` for lists, `closedReason`.
- Hydrate company from Freehire `GET /api/v1/companies/{slug}` when `company_slug` exists. Years from Freehire `enrichment.experience_years_min` (and any structured adapter field). Logos from Himalayas/Remotive (etc.) URLs.
- Company identity this run: adapter slug if present, else slugify `companyName`. No merge worker. Duplicate “Stripe” / “Stripe Inc” rows are acceptable.
- Cards (New jobs, Tracked, hub triage): years badge, small logo pictogram if we have one. Blobatar spec expands from tracked-only to these surfaces for identity.
- Blobatar stays the identity face. Small logo from adapter `logoUrl`, then `https://logo.freehire.me/{encodedName}` (fail closed: 404 or timeout → hide pictogram). Do not block render on the proxy. Do not require logo.dev.
- Years on the job: still land. Badge “asks N years.”
- **Your years:** merge overlapping dated experience ranges (`fromDate`/`toDate`; present = now). Skip undated rows. If nothing dated, do not cap.
- **Cap vs min match:** land/dismiss uses **uncapped** AI score vs Settings min match. Persist and display `min(score, 65)` when listing min years > your years. Years never hide a job by themselves.
- Settings min-match tooltip (humanizer): “This is the passing line. Each job gets a match score. If that score is below this number, it does not go into New jobs. Years on a listing can lower the score you see; they do not hide the job by themselves.”

### Scoring (now vs later)

- Skills bar: `posting.skills` ∩ tenant **stack names**, exact, case-insensitive. Hide the bar if the job lists no skills (unverifiable, not 0%). No adjacent-skill dictionary this run.
- Years cap as above. No visa/education cap this run.
- Keep `agentTake` at land. Do not run extra LLM on Find now.
- Plan 3: Freehire-style 3-stage fit, **auto once** when apply package is first generated (tracked + package). Not at land. Cache on the application (jsonb + package/content hash). Re-run if they generate a new package. Server owns overall; model does not. Ground skills in the skills bar. Never invent skills. UI label: take = prefs fit; 3-stage = resume vs this JD.

### AI voice (all job-generated copy)

Every user-facing string from job AI must follow `/humanizer` (implementers load that skill when writing prompts). Apply to land take, regenerate take, harvest take, 3-stage free text (comments, strengths, gaps, recommendation), mail-stage reasons shown in UI, interview rehearsal replies, hub triage one-liners. Do not apply to numeric scores, JSON fields, or logs.

Rules that must show up in prompts. **No second LLM** to “humanize.” Optional cheap strip of em dashes on store.

- Plain words. Short sentences. `is` / `are` / `has`.
- No hype, no “pivotal / landscape / delve”, no em dashes.
- No invented employers, skills, or years.
- Weak fit: say it. Do not sell the job.

**Agent take shape (supersedes 1–3 sentences):**

- Markdown only. A tight list, not a paragraph and not JSON.
- **Maximum 5 bullets.** Prefer 3–5. Each bullet is one short point (one line if possible).
- Optional one-line heading at most; no title stack, no preamble.
- Ground in listing fields, match reasons, prefs, years badge / skills bar when present.
- Hard fails (exclude, level floor, salary, years cap) stay law; mention them when they fired.
- Same shape for single regenerate and batch harvest (`takes[].agentTake` is this markdown).
- Persist as markdown on `application.agentTake`. UI renders markdown (existing card markdown path). Truncate on store if needed, but prefer the model staying under ~800 characters instead of slicing mid-bullet.

UI: New jobs / Tracked / Today letter / hub triage consume this list. Today letter still “at most two named takes”; it must not flatten bullets into one hype sentence.

### Track and mail

- Silence: **day 7** notify “this has been quiet” (tracked, outcome null, no stage change and no linked mail in 7 days). **Day 14** notify again and **suggest** Ghosted (one tap). Do **not** auto-set `outcome`. Linked mail or stage change clears the clock.
- Job card lists mails where `mail_message.applicationId` = this application. Manual assign writes that field (not posting id). Stage AI = existing classify / `mail_crm_apply`, visible and undoable. Monotonic: may move stage forward or set outcome; may not move interview back to saved.

### Hub

- Triage HITL shows logo, years, skills bar (same fields as dashboard).
- Interview rehearsal (plan 3): hub thread bound to a **tracked** `applicationId` (server checks ownership). Interviewer prompt, one question at a time, JD + agent take + package resume if present. Humanizer voice. Do not persist answers as experience/resume facts. Not a scored product.

---

## Out of scope (explicit skip)

- Public faceted job board / Meilisearch catalogue
- Multiple named hunts, digests, shared `/b/slug` boards
- ATS YAML crawl fleet, harvest-* workers, YC directory import
- Logo.dev as a paid vendor of our own (we may use Freehire’s public proxy)
- Replacing blobatar
- Referrals, tracer links, browser autofill extension
- Hiding jobs for years mismatch
- Catalog LLM enrichment on `job_posting` (personal AI only)
- Splitting bookmarks vs applications into two tables (keep one `application` row with trackingStatus)
- Market analytics / company response-rate stats (needs many tenants’ outcomes)
- Adjacent-skill dictionary; visa/education score caps
- Auto-ghosted outcome; dedicated “my skills” profile list; company merge worker

---

## Flows affected

| Flow                      | Change                                                  |
| ------------------------- | ------------------------------------------------------- |
| Catalog ingest            | Upsert company + years + logo URL; skip/close hygiene   |
| Find jobs now / cron land | Ignore closed pantry rows; cap score; skills bar inputs |
| New jobs / Tracked cards  | Logo pictogram, years badge, mail list on tracked       |
| Inbox-AI scorer / take    | Honor years cap; take is ≤5 md bullets, humanizer voice |
| Liveness / TTL            | `closedReason`; don’t delete tracked history            |
| Notifications             | Silence nudges; mail assign may cancel them             |
| Career Inbox              | Assign mail ↔ job; stage AI visible                     |
| Apply package             | Triggers 3-stage once when generated (later slice)      |
| Hub triage                | Same card fields                                        |
| Hub chat                  | Interview rehearsal preset                              |

---

## Data sketch (not a migration)

```text
job_company
  id, slug, name, logoUrl, website, tagline,
  employeeCount, companySize, companyType, hqCountry,
  profile jsonb, firstSeenAt, updatedAt

job_posting  (add)
  companyId, experienceYearsMin, companyLogoUrl, closedReason

application  (add as needed)
  denorm logo/years at land for stable cards
  mail links stay mail_message.applicationId + assign UI

application_activity
  extra kinds if needed: employer_reply, silence_nudged
```

Adapter contract (`NormalizedListing`) gains optional `companySlug`, `companyLogoUrl`, `experienceYearsMin`, `seniority`. Stated fields only. No guessing work mode or years from JD prose in the adapter.

---

## Scoring map

```text
Discovery (keep)     cheap score + two-axis + land AI (score + take)
Now (add)            skills bar; years cap on matchScore
On package (add)     3-stage fit, once, BYO, cached
Never on Find now    3-stage
```

Freehire prompt ideas to reuse on 3-stage (not land): ATS parser statuses, evidence strength, recruiter does not output overall, skeptic pass, structured résumé not raw PII, cap JD length.

---

## Three plans, one continuous run

Write three plan files. Execute 1 → 2 → 3 in one session. Stop only on failed verification. Human reviews the branch at the end.

**Plan 1 — Pantry, company, cards, honest score**

1. Schema: `job_company` + posting fields + `closedReason`
2. Adapters + Freehire company hydrate; close; 90-day delete if unreferenced
3. Cards: blobatar + optional logo + years badge (New jobs, Tracked, hub triage)
4. Skills bar (stacks, exact); years cap after land gate; take ≤5 md bullets + humanizer; min-match tooltip

**Plan 2 — Track + mail**

5. Silence: nudge 7d, suggest Ghosted 14d
6. Mail list on job card; manual assign via `applicationId`; visible undoable stage AI

**Plan 3 — Hub extras**

7. Interview rehearsal (thin, tracked job)
8. 3-stage auto on first apply package

---

## Success (human)

- New jobs still fills from one hunt and a shared pantry.
- Cards show years when we know them. A small logo if we have one. Blobatar still identifies the row.
- A 3-year profile can still see an “8 years” job; the score on the card is capped; it still passed min match on the raw grade.
- A dead listing does not wipe a tracked application. Closed pantry rows with no apps can go away after 90 days.
- Quiet tracked jobs nudge at 7 days; at 14 days you can confirm Ghosted.
- You can open a job and see its mail, or pin a mail onto a job.
- Agent take is a short markdown list (≤5 points), plain voice.
- Tracked job can start a mock interview in hub.
- After an apply package exists, a resume-vs-JD fit report can appear once.

---

## Grill locks (checklist)

- [x] Personal hub, not public search engine
- [x] One hunt; saved searches later
- [x] Shared pool + close/prune
- [x] `job_company` table; years on posting
- [x] Logo: adapter URL, then logo.freehire.me pictogram, blobatar always
- [x] Years: land + cap + badge, do not hide
- [x] Land AI: matchScore + agentTake; skills bar now
- [x] All job AI user-facing copy follows `/humanizer` in prompts
- [x] Agent take: structured markdown, max 5 short bullets (not 1–3 sentences)
- [x] 3-stage later, auto once on package, not at land
- [x] Silence nudges
- [x] Mail ↔ job UI + stage AI
- [x] Hub triage fields + interview rehearsal (thin, tracked)
- [x] No catalog LLM on shared postings
- [x] Three plans, one continuous run
- [x] Seeker years from merged experience dates; cap 65 after land gate
- [x] Skills bar = stacks, exact
- [x] Mail = `applicationId`; reuse CRM apply
- [x] Silence 7d nudge / 14d suggest Ghosted
- [x] Close + unreferenced 90-day delete
- [x] Humanizer in prompts only (no second model)
- [x] Min-match tooltip copy locked
