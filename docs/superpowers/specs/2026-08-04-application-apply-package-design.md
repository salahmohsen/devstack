# Application Apply Package — Design

**Date:** 2026-08-04  
**Status:** Approved (spec review)  
**Goal:** Per-application AI workflow that analyzes the job + portfolio evidence and produces a reviewable **apply package** (tailored resume, cover letter, recruiter outreach email), with confirm-and-send outbound mail.

**Related:**

- Seeker Applications CRM — `docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md`
- Career Inbox / AI platform — `docs/superpowers/specs/2026-07-29-career-inbox-ai-platform-design.md`
- Career mail assistant — `docs/superpowers/specs/2026-07-31-career-mail-assistant-design.md`
- Apply package workflow split — `docs/superpowers/specs/2026-08-04-apply-package-workflow-split-design.md` (generation: rewrite-all + multi-step)
- Resume import (source PDF ≠ generated resume) — ADR-0023 / onboarding design
- Generated resumes — `resume` table, `packages/api` resume router + `buildResumeDocument`

---

## Product intention

From an application (harvested or manual), the seeker clicks **Prepare application**. A **Mastra workflow** analyzes:

1. Job context (title, company, description, URLs, notes, apply method, match score)
2. Listing page text when JD is thin (reuse harvest `fetch-job-page`)
3. Portfolio-opted-in experiences, projects (**including private `project.analysis`** when present), stacks, contacts, user profile

…and returns a **structured apply draft**. The seeker reviews/edits, then **Accept package** materializes artifacts. Separately they **Send** outreach email (always with resume PDF) after confirm.

Not in scope: Easy Apply automation, ATS form bots, Review-queue for this package, auto-send outreach.

---

## Frozen decisions (grill log)

| #   | Topic           | Decision                                                                                                                                                                                                                                                                          |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Product object  | Linked package on the application                                                                                                                                                                                                                                                 |
| 2   | Resume AI       | **Superseded for generation** by workflow-split: rewrite **all** portfolio-opted-in items with `include: true` on PDF (grounded; no inventing employers). User may still toggle `include` in review before Accept. Original “select + rewrite” no longer describes AI generation. |
| 3   | Storage / send  | Columns on `application` + Confirm & send (not Review queue)                                                                                                                                                                                                                      |
| 4   | Engine          | Mastra workflow (AI judgment; schema rails only)                                                                                                                                                                                                                                  |
| 5   | Commit          | Structured draft → **Accept** materializes                                                                                                                                                                                                                                        |
| 6   | Recruiter email | Optional field; AI may propose; user confirms; required to send                                                                                                                                                                                                                   |
| 7   | Evidence        | Portfolio-opted-in only (`portfolioEntryId` set)                                                                                                                                                                                                                                  |
| 8   | Re-run          | New draft; Accept creates **new** resume PDF + retargets `resumeId`; old resume kept                                                                                                                                                                                              |
| 9   | Attachment      | Always attach resume PDF on send                                                                                                                                                                                                                                                  |
| 10  | Stage           | Successful send: `saved` → `applied`                                                                                                                                                                                                                                              |
| 11  | Thin JD         | Fetch listing when description empty/short                                                                                                                                                                                                                                        |
| 12  | Draft store     | Server-persisted draft JSON on application                                                                                                                                                                                                                                        |
| 13  | Copy            | Separate cover letter **and** outreach subject/body                                                                                                                                                                                                                               |
| 14  | CTA             | Application info panel + board/list row menu                                                                                                                                                                                                                                      |
| 15  | Send metadata   | `outreachSentAt` + `outreachProviderMessageId` only (no body snapshot v1)                                                                                                                                                                                                         |
| 16  | Preflight       | Fail closed (portfolio / AI / mail)                                                                                                                                                                                                                                               |
| 17  | Cover artifact  | Text + cover-letter PDF on Accept                                                                                                                                                                                                                                                 |

---

## Architecture

```text
UI: Prepare application
  → API applications.generateApplyPackage
      → preflight (evidence + BYO AI)
      → call Mastra apply-package-workflow
      → persist applyPackageDraft (+ draftedAt) on application
  → Package Sheet (edit draft)

UI: Accept package
  → API applications.acceptApplyPackage
      → render resume PDF (rewritten bullets + selected items)
      → store resume row (author: agent), set application.resumeId
      → delete previous coverLetterR2Key object if any; write new cover PDF
      → write coverLetterBody, outreachSubject/Body, recruiterEmail
      → **clear** applyPackageDraft + applyPackageDraftedAt (no dual source of truth)

UI: Send outreach
  → API applications.sendOutreach
      → reject if application has outcome set (closed)
      → require recruiterEmail + resumeId + body
      → sendCareerReply + PDF attachment
      → outreachSentAt, outreachProviderMessageId
      → if stage === saved → applied + stageChangedAt = now
```

**Layers:**

| Layer           | Responsibility                                   |
| --------------- | ------------------------------------------------ |
| `packages/core` | Draft schema, I/O contracts, AI feature key      |
| `packages/db`   | Application columns + migration                  |
| `apps/agent`    | Workflow + skill + agent                         |
| `packages/api`  | Generate / accept / send / update package fields |
| `apps/web`      | CTAs, package sheet, send confirm                |

---

## Data model

### New / extended columns on `application`

| Column                      | Type             | Notes                                  |
| --------------------------- | ---------------- | -------------------------------------- |
| `recruiterEmail`            | text null        | Validated email when set               |
| `coverLetterBody`           | text null        | Accepted cover letter                  |
| `coverLetterR2Key`          | text null        | Cover PDF object key under user prefix |
| `coverLetterFilename`       | text null        | Download name                          |
| `outreachSubject`           | text null        | Accepted email subject                 |
| `outreachBody`              | text null        | Accepted email body (plain text)       |
| `outreachSentAt`            | timestamptz null | Last successful send                   |
| `outreachProviderMessageId` | text null        | Resend id                              |
| `applyPackageDraft`         | jsonb null       | Structured draft (schema below)        |
| `applyPackageDraftedAt`     | timestamptz null | Last generate time                     |

Existing: `resumeId`, `description`, `url`, `applyUrl`, etc. unchanged.

### Apply package draft (JSON)

```ts
ApplyPackageDraft {
  applicationId: string
  generatedAt: string // ISO
  jobContext: {
    title, companyName
    descriptionUsed: string  // may include fetched page text
    listingFetched: boolean
    listingUrl?: string | null
  }
  proposedRecruiterEmail: string | null
  professionalSummary: string | null  // tailored summary for resume
  experiences: Array<{
    experienceId: string
    include: boolean
    companyName: string
    title: string
    rewrittenBullets: string[]  // AI rewrite; grounded
  }>
  projects: Array<{
    projectId: string
    include: boolean
    name: string
    rewrittenSummary: string
    rewrittenBullets?: string[]
  }>
  stacks: Array<{ stackId: string; include: boolean; name: string }>
  coverLetterBody: string
  outreachSubject: string
  outreachBody: string
  notes?: string  // AI rationale for human
}
```

**Rules:**

- Every experience/project id must exist and be portfolio-opted-in for the tenant.
- AI must not invent employers, titles, or project names; only rewrite language.
- `include: false` items are shown in review but excluded from PDF on Accept.

### Cover PDF storage

- Object key: `{userId}/cover-letters/{applicationId}-{uuid}.pdf`
- Not a `resume` row (resume table remains CV catalog only)
- **Re-Accept:** delete prior `coverLetterR2Key` object before writing the new one
- **Application hard delete:** delete cover object when present (resume row is not cascade-deleted — catalog stays; same as today for linked resume)
- Download: authenticated app route or oRPC-backed download (mirror resume download pattern), not public

---

## Mastra workflow

### Id

`apply-package-workflow`

### Skill

`apps/agent/skills/application-apply-package/SKILL.md` — rewrite-all multi-step phases, no hallucination, cover vs email tone.

### Agent

Thin structured agent (e.g. `applyPackageAgent`) with BYO model via `requestContext` + `generateModelOption` (same pattern as harvest after fix).

### Steps (logical)

1. **prepare** — server builds workflow input (app + portfolio + llm + optional page text)
2. **apply-package-workflow (split)** — see `2026-08-04-apply-package-workflow-split-design.md`:
   prepare-context → rewrite-experiences (chunks of 3) → rewrite-projects (chunks of 3) → draft-summary-and-letters → assemble-draft.
   Product: rewrite all portfolio-opted-in items; all `include: true` on PDF.
3. **validate** — schema + id membership; strip unknown ids (also enforced inside `assemble-draft`)

### Thin JD threshold

- If `description` is null or `trim().length < 400` (exact constant in core) **and** `url` or `applyUrl` is http(s), fetch page text (cap ~10–12k chars).
- Do **not** auto-write fetched text back to `application.description` in v1.

### AI feature

Add `AiFeature` value: **`applyPackage`** (default model same flash/pro family as other career features). Resolve via `resolveRuntimeAiCredentials(userId, "applyPackage")`.

### Timeouts

- Workflow: allow long run (e.g. 120–180s) — large portfolio + rewrite.
- Server agent call timeout must match.

---

## API (oRPC under `applications`)

| Procedure                 | Behavior                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `generateApplyPackage`    | `{ applicationId }` → preflight → workflow → save draft → return application + draft                           |
| `updateApplyPackageDraft` | Patch draft fields / toggles before Accept (optional; sheet can edit locally then Accept with full draft body) |
| `acceptApplyPackage`      | Materialize PDFs + write accepted fields; **clear** draft columns (no package status field)                    |
| `sendOutreach`            | Confirm send; attach resume PDF; update send metadata + stage                                                  |
| existing `update`         | Allow editing `recruiterEmail` without full package flow                                                       |

**Accept input:** may accept client-edited draft payload (preferred) or use server-stored draft if client sends empty.

**Errors (typed):**

| Code                  | When                                   |
| --------------------- | -------------------------------------- |
| `NOT_FOUND`           | Application missing                    |
| `NO_EVIDENCE`         | Zero opted-in experiences and projects |
| `AI_NOT_CONFIGURED`   | Missing BYO key / model                |
| `AGENT_FAILED`        | Workflow fail-closed                   |
| `NO_RESUME`           | Send without accepted resume           |
| `NO_RECIPIENT`        | Send without valid recruiter email     |
| `MAIL_NOT_CONFIGURED` | Missing Resend key / From              |
| `SEND_FAILED`         | Resend error                           |

---

## PDF generation

### Resume

- Extend `buildResumeDocument` (or parallel builder path) to accept **override portfolio**: selected experiences/projects with rewritten bullets/summary + tailored professional summary + profile/contacts.
- `resume.author = "agent"`, `prompt` may store short note e.g. `apply-package:{applicationId}`.
- Object key: prefer `{userId}/resumes/{filename}` (align with media-storage conventions when wiring).
- Filename: include company/role slug + date.

### Cover letter

- Simple text→PDF (pdfnative or minimal layout: title, date, body paragraphs).
- Store key + filename on application.

---

## Outbound send

- Extend `sendCareerReply` (or sibling `sendCareerOutreach`) to support **optional PDF attachment** (Resend attachments API: filename + content base64).
- Load resume bytes from media bucket via `resume.r2Key`.
- Always attach when sending from this flow (no checkbox).
- From: same as career reply (BYO inbound address / platform fallback).
- **Never** auto-send; UI always confirm dialog.

---

## UI

### Entry (two distinct actions)

| State                                       | Primary                                                                                                                              | Secondary                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| No draft                                    | **Prepare application** → runs generate (loading) → opens package sheet                                                              | —                                                                                                       |
| Draft exists (`applyPackageDraft` non-null) | **Review package** → opens package sheet with server draft (no AI call)                                                              | **Regenerate** → always confirm (cost + overwrite) → generate overwrites draft → reopens sheet          |
| Accepted (draft null, resume/cover present) | **Review materials** — edit stored `recruiterEmail` / cover / outreach via normal application update fields; download resume + cover | **Prepare again** → regenerate new draft (existing resume/cover remain until Accept retargets/replaces) |

**Send while a new draft is open:** allowed — uses **last accepted** materials (`resumeId`, accepted cover/outreach fields), not the in-progress draft.

- Surfaces: application info panel + board card / list row overflow (same actions).
- Never re-run AI merely by opening an existing draft.

### Package sheet

Right Sheet for draft review/edit:

1. Job summary + “listing fetched” badge if used
2. Proposed / editable `recruiterEmail`
3. Resume: professional summary; toggles + edited bullets per experience/project
4. Cover letter textarea (+ note PDF on Accept)
5. Outreach subject + body
6. Footer: **Accept package** | Cancel

**Accept** clears draft columns. After Accept: panel shows resume link, cover download, **Send** CTA.

**Accept materialization sources:**

- Rewritten text / include flags: from draft (client may pass edited draft body)
- Experience/project **dates, companies, titles (identity):** live DB rows by id at Accept time
- **Contacts + profile (name, email, summary):** always current tenant data at Accept — not selected in draft

### Send

- AlertDialog: To, subject preview, “Resume will be attached”.
- On success: toast + refresh application (stage badge may change).

### Fail closed

- Disable Prepare if no opted-in evidence (client heuristic + server hard check).
- AI/mail errors via existing toast patterns (`toastAiError`).

---

## Preflight checklist (server)

Generate requires:

1. Application owned by user
2. ≥1 opted-in experience **or** project
3. Resolvable BYO LLM for `applyPackage`

Send requires:

1. Valid `recruiterEmail`
2. Linked `resumeId` with readable PDF
3. Non-empty outreach subject + body
4. Resend key + From (existing career send rules)
5. Application not closed (`outcome IS NULL`)

---

## Explicit non-goals (v1)

- Review queue items for apply packages
- Full autonomy auto-send for outreach
- Cover letter as email body (separate fields)
- Using non-portfolio private-only entities
- Version history table for packages
- Overwriting portfolio experience text in DB (rewrites live only in draft/PDF)
- Easy Apply / external browser automation

---

## Testing

| Area         | Approach                                                        |
| ------------ | --------------------------------------------------------------- |
| Draft schema | Unit: zod parse, id validation helpers                          |
| Preflight    | Unit/integration: no evidence → NO_EVIDENCE                     |
| Accept       | Integration: draft → resume row + keys set (mock media + agent) |
| Send         | Unit: attachment payload shape; mock Resend                     |
| Thin JD      | Unit: threshold + skip when description long                    |

No E2E required for v1 unless existing app harness makes it cheap.

---

## Implementation phases (for planning)

1. **Schema + core contracts** — columns, draft schema, AiFeature
2. **Agent workflow + skill** — generate structured draft
3. **API generate + draft persistence**
4. **Accept materialize** — resume + cover PDFs
5. **Send with attachment + stage**
6. **Web UI** — CTAs, package sheet, send dialog

---

## Success criteria

1. From an application with portfolio data and BYO AI, Prepare produces a persisted draft in &lt; timeout.
2. Accept links a new agent resume and cover PDF and fills cover/outreach fields.
3. Send attaches resume PDF, records send metadata, moves `saved` → `applied`.
4. Fail closed when evidence/AI/mail missing.
5. Re-generate replaces draft only; prior resumes remain in catalog until user deletes.
