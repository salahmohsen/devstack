# Owner Onboarding — Resume Import Design

**Status:** Design session approved 2026-07-26; spec revised after review (transaction/tx, contacts, keys, protectedProcedure, MIME scope).

**Goal:** Let a **signed-in user** (tenant) upload a PDF resume; AI extracts profile, experiences, projects, and stacks into a reviewable draft; they apply in one transaction (with portfolio opt-in) or skip. First-run soft onboarding plus always-available re-import. (Pre multi-user wording said “portfolio owner”; behavior is per-session user.)

## Architecture

Mirror **detect-stacks**: browser uploads via **files-sdk** → API enriches (PDF→text + existing profile/stacks) → **Mastra workflow** streams structured extraction → **client-held draft** for review → **`onboarding.apply`** all-or-nothing write. Do not use the hub chat tool-approval path or the generated-`resume` table for source PDFs.

```
Upload (files-sdk + UploadProgress %)
  → Extract stream (oRPC + resume-import-workflow)
  → Review (coss multi-tab editor)
  → Apply (single outer DB transaction) | Skip | Discard source
```

## Product decisions

| Decision           | Choice                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Product surface    | Hybrid: first-run + always-available re-import                                                                |
| Extracted entities | Profile, experiences, projects, stacks; **auto portfolio opt-in** on Apply (selected rows default included)   |
| Commit model       | Draft → review → Apply                                                                                        |
| Re-import merge    | Profile upsert; stacks upsert-by-name; experiences/projects always create                                     |
| Source PDF         | Session-scoped S3 object until Apply/discard; no durable source table                                         |
| First-run gate     | `user.onboardingCompletedAt` + soft CTAs; **no hard route lock**                                              |
| Apply writes       | Single outer DB transaction via `onboarding.apply` (see Apply transaction)                                    |
| Auth gate          | **`protectedProcedure`** (not `ownerProcedure` — that requires GitHub config and blocks pre-GitHub first-run) |
| Project↔experience | Best-effort nest via draft `clientId` refs                                                                    |
| UI route           | `/dashboard/onboarding` full page                                                                             |
| Extract pipeline   | API PDF parse + Mastra workflow                                                                               |
| Draft storage      | Client-only (+ optional sessionStorage for key/draft)                                                         |
| Upload UX          | files-sdk `useFiles` + existing `UploadProgress` (% bars)                                                     |
| UI kit             | Production coss/`@tsu-stack/ui` composition                                                                   |
| MIME/size limits   | Enforced in **onboarding UI + `extract`**, not a global PDF-only `/api/files` gateway                         |

## Domain

### Glossary (also in `CONTEXT.md`)

- **Owner onboarding** — First-run or re-import flow to populate portfolio evidence from a resume source; completes via Apply or Skip (`onboardingCompletedAt`).
- **Resume source (session)** — Temporary uploaded PDF in object storage for import only; not a `resume` row.
- **Resume import draft** — Structured client-held proposal (profile, experiences, projects, stacks) before Apply.
- **Resume** / **resume builder** — Unchanged: _generated_ output PDFs only (`resumes/…` + `resume` table).
- **Stack** — Resume “skills” map to stacks (unique name).

### Persistence

| Piece                        | Change                                                                                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user.onboardingCompletedAt` | Nullable timestamp on `user`; set on Apply or Skip. **API-only** via `onboarding.status` / apply / skip — not required on Better Auth session payload in v1 (optional `additionalFields` later if UI needs it without extra fetch) |
| Session PDF                  | See **Object keys** below                                                                                                                                                                                                          |
| No `resume` reuse            | Generated PDFs stay `resumes/…` + `resume` rows                                                                                                                                                                                    |
| No draft table               | Client holds draft                                                                                                                                                                                                                 |
| No `media_asset` in v1       | Same as project logos: object key, no generic media table                                                                                                                                                                          |

### Object keys (files-sdk)

Gateway `authorize` returns `keyPrefix: \`${userId}/\``. Client-relative keys do **not** include the userId prefix.

| Actor                              | Key form                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client upload / draft state        | `resume-sources/{uuid}.pdf` — pass explicit path into `files.upload` (or SDK equivalent) so the object is not dumped at prefix root                           |
| Full object key (S3 / mediaBucket) | `{userId}/resume-sources/{uuid}.pdf`                                                                                                                          |
| Extract / discard / delete         | Re-prefix with session `userId` if client sends relative key; **reject** if key contains `..`, starts with another user id, or matches `resumes/` (generated) |

Delete after Apply success, Skip (if key known), Discard, or replace-upload.

### Draft shape (conceptual)

```ts
ResumeImportContact {
  type: "website" | "email" | "phone" | "location" | "linkedin" | "github" | "x" | "youtube"
  value: string
  // icon filled by normalize/apply defaults — never require owner to pick icons in v1
}

ResumeImportDraft {
  profile: {
    name: string           // required in draft after normalize; min 2 on apply
    email?: string | null  // optional; if omitted/empty, keep existing user.email
    summary?: string | null
    contacts: ResumeImportContact[]  // merge semantics below — never send raw [] meaning "wipe"
  }
  experiences: [{
    clientId, title, organization, description,
    fromDate?, toDate?, isPresent?,
    includedInPortfolio: boolean,  // default true from extract
    selected: boolean              // default true; UI primary checkbox
  }]
  projects: [{
    clientId, title, year, summary, description,
    experienceClientId?, stackNames[],
    includedInPortfolio: boolean,
    selected: boolean
  }]
  stacks: [{
    name, description?, type?,
    includedInPortfolio: boolean,
    selected: boolean
  }]
  meta?: { warnings[], sourceFilename? }
}
```

### Selection vs portfolio flags

| Flag                      | Meaning                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`selected`**            | Owner wants this row written on Apply. UI primary checkbox. Default `true`. Unselected rows are **ignored** (not created/updated).                                                     |
| **`includedInPortfolio`** | If selected, whether to create/link `portfolio_entry`. Default `true` from extract. Review UI: secondary control (e.g. “Show on portfolio”) per row or bulk; not the same as deselect. |

Apply processes only `selected === true` rows. Profile is always considered when Apply runs (name required); contacts follow merge rules below.

### Contact merge (profile)

- Draft contacts must include `type` + `value`. Normalize fills **default icons** per type (same map as profile settings if one exists; else fixed lucide/name map in core).
- **Omit** `contacts`, pass `undefined`, **or** `contacts: []` → **no-op** (leave existing contacts untouched). Never route `[]` through `contactRepository.upsert` (that path deletes all contacts today).
- When `contacts` is a non-empty array, Apply uses an explicit merge helper:
  - For each draft contact type: update value/icon if type exists, else insert.
  - Types not present in draft: **leave unchanged** (no delete-on-import).
- Contact **portfolio_entry** links are **not** changed by import (no inventing contact portfolio rows).
- Re-import: match by `(userId, type)` natural key, not by missing draft ids.

### Stack upsert-by-name

- Match existing stack with **case-insensitive** name compare; preserve existing casing on match.
- **Apply payload is authoritative for selected stacks:** for each selected stack row, write `description`/`type` from the draft (including owner review edits). Do not implement dirty-field tracking in v1.
- New stacks: create with draft fields + portfolio when `includedInPortfolio`.
- Existing stacks: update description/type from draft; `includedInPortfolio: true` → ensure portfolio entry.
- Project `stackNames` not in `stacks[]`: **create** minimal stack rows (name only, `includedInPortfolio: true` default) so links resolve.

### Project defaults

- **year**: if missing after extract, use end-date year, else start-date year, else current calendar year; add `meta.warnings`.
- **summary/description**: allow `""` if model empty.
- **sortOrder**: assign sequential `max+1` style orders within Apply (do not leave all at `0`).

### EMPTY_DRAFT rule

Reject Apply only when **no** selected experiences/projects/stacks **and** profile has no meaningful change (name/email/summary/contacts all effectively no-op). Profile-only updates with a real name/summary/contact change are allowed.

### Apply transaction (atomic)

Existing repositories each open their own `getDb().transaction(...)` and **cannot** be composed into one atomic unit as-is.

**Decision:** Implement Apply as **one outer `getDb().transaction`** in the onboarding apply service that:

1. Uses shared `tx` for all writes (profile user row, contacts, stacks, experiences, projects, portfolio_entry, `onboardingCompletedAt`), **either** by extending repository methods with optional `tx` **or** by a dedicated `onboardingApply` data module that performs the inserts with the same SQL shape as repos (prefer **optional `tx` on create/upsert helpers** used by Apply to avoid divergent logic long-term).
2. Does **not** call the public repo `create()` methods that start nested independent transactions for the multi-entity path.

**Order inside the outer transaction:**

1. Profile user fields (name; email only if provided and non-empty; summary). If email changes: same rules as `profile.update` — uniqueness check → typed `EMAIL_TAKEN`; set `emailVerified: false` when the address actually changes. If email omitted/empty: keep existing email and verification state.
2. Contact merge (never wipe-all; `[]`/omit = no-op)
3. Stacks upsert-by-name + portfolio entries
4. Experiences create + portfolio; map `clientId` → real id
5. Projects create with resolved `experienceId` + `stackIds` + portfolio; sequential sortOrder
6. Set `onboardingCompletedAt`

After **successful commit**: best-effort delete session PDF (outside transaction).

## API

### Router: `onboarding` (`protectedProcedure`)

| Procedure       | Kind      | Role                                                                                                     |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `status`        | query     | `{ onboardingCompletedAt, … }` for CTAs                                                                  |
| `extract`       | streaming | `{ objectKey, filename? }` → resolve full key → authorize → download → PDF→text → Mastra workflow stream |
| `apply`         | mutation  | Reviewed draft → one outer DB transaction (shared `tx`)                                                  |
| `skip`          | mutation  | Set `onboardingCompletedAt`; optional delete `objectKey`                                                 |
| `discardSource` | mutation  | Delete session object by key (prefix-checked); no completed flag                                         |

Do **not** use `ownerProcedure` (requires GitHub config; blocks pre-GitHub first-run).

Upload remains **files-sdk** at `/api/files`, not oRPC. Extract receives the storage **key** only.

### Key authorization

- Client may send relative `resume-sources/…` or full `{userId}/resume-sources/…`; server normalizes to full key under session user.
- Reject keys under `resumes/`, path traversal, or other users' prefixes.

### PDF → text

- Server-side library (e.g. `unpdf` / `pdf-parse` — choose at implement time for Node target).
- Fail closed if empty/unreadable.
- Size/MIME (~8–10MB, `application/pdf`): enforce in **onboarding UI + `extract`** after download. Do **not** make `/api/files` PDF-only (shared with image logos).

### Typed errors

`INVALID_OBJECT_KEY`, `UNSUPPORTED_MEDIA`, `FILE_TOO_LARGE`, `EXTRACT_FAILED`, `EMPTY_DRAFT`, `APPLY_VALIDATION`, `APPLY_FAILED` (+ standard auth errors).

## Mastra

| Piece          | Location                                                  |
| -------------- | --------------------------------------------------------- |
| Workflow       | `apps/agent/src/mastra/workflows/resume-import-workflow/` |
| Agent          | Thin `resumeImportExtractorAgent` (structured extract)    |
| Register       | `apps/agent/src/mastra/index.ts`                          |
| Model          | Prefer `qualityFirst` from `model-config.ts`              |
| Core contracts | `packages/core/src/onboarding/` (or `resume-import/`)     |

### Workflow steps

1. **prepare** — pass resume text + existing profile snapshot + existing stack names (API-enriched)
2. **extract** — `agent.generate` + Zod `structuredOutput`
3. **normalize** — dates, years, temp `clientId`s, stack name trim/dedupe, project↔experience refs
4. **format** — `ResumeImportDraft` output

Invocation pattern: copy `agent.router` detectStacks/organizeStacks (create-run + stream JSON events). Client assembly: copy `features/stacks/api/detect-stacks.ts`.

**Non-goals:** workflow writes DB; multimodal/vision PDF; hub tool-approval as primary UX.

## UI

### Composition

| Piece       | Path                                                                                  |
| ----------- | ------------------------------------------------------------------------------------- |
| Route       | `apps/web/src/routes/(root-layout)/__protected/dashboard/onboarding/index.tsx` (thin) |
| Page        | `apps/web/src/pages/dashboard/onboarding/`                                            |
| Feature API | `apps/web/src/features/onboarding/api/`                                               |
| Soft CTAs   | Dashboard banner + settings “Import from resume” → same route                         |

### Steps

1. **Upload** — Dropzone (PDF); `useFiles({ endpoint: "/api/files" })`; **`UploadProgress`** always shown during upload (name + % + Progress); file chip + Replace/Remove; Analyze enabled when key present
2. **Analyzing** — Stream step labels + Spinner/Progress; keep key on failure for retry
3. **Review** — Tabs: Profile | Experiences | Projects | Stacks. Per evidence row: primary Checkbox → `selected`; secondary “Show on portfolio” → `includedInPortfolio`. Edit fields; project parent Select; sticky Apply footer
4. **Done** — Success + links to dashboard entities

Skip on step 1 (first-run). Discard source from upload/review as needed.

### Coss / `@tsu-stack/ui`

Prefer: Button, Card/Frame, Field\*, Input, Textarea, Checkbox, Tabs, Select/Combobox, Progress, Spinner, Alert, Badge, Empty, Separator, toast. Lucide icons. No new `packages/ui` primitive unless a second consumer appears.

Reuse: `apps/web/src/components/files-sdk/upload-progress.tsx` (do not invent a second progress UI).

## Errors, security, resilience

- Prefix-check all object keys; no public extract/apply.
- Avoid logging full resume text (PII).
- Apply all-or-nothing via **one outer transaction** (not sequential independent repo `create()` calls).
- Extract timeouts like detect-stacks.
- PDF delete after apply is best-effort (orphans OK short-term).
- Re-import may duplicate experiences/projects; stacks/profile merge by design.

## Testing guidance

- Core: normalize (dates, clientIds, stack dedupe).
- API: key auth; apply order with mocked repos; empty selection rejected.
- Workflow: fixture text → schema (follow existing LLM test policy).
- UI: not required for v1 unless suite norms change.

## Out of scope (v1)

- Durable resume-source table / audit history
- Server-persisted draft
- Fuzzy match/update of existing experiences/projects
- Hard route blocking when onboarding incomplete
- Vision/multimodal PDF models
- Conversational hub-only import UX
- Extending `resume` table with source kind

## Related ADRs

- `docs/adr/0023-resume-import-not-generated-resume.md` — separate session source + import pipeline from generated resume output
- Portfolio entry visibility: `docs/adr/0013-portfolio-entry-table.md`
- Detect-stacks pattern precedent: stack workflow ADRs / plans under `docs/superpowers/`

## Implementation order (high level)

1. DB: `onboardingCompletedAt` migration + types
2. Core: onboarding/resume-import schemas
3. Mastra: extractor agent + workflow + register
4. API: PDF text helper, `onboarding` router, wire agent stream
5. Web: feature API hooks, onboarding page (upload % → review → apply), soft CTAs, route
6. Docs: refresh `.agents/media-storage.md` notes if upload conventions change for PDF
7. Validate touched packages per workflow.md

Detailed bite-sized plan: to be written under `docs/superpowers/plans/` after user reviews this spec.
