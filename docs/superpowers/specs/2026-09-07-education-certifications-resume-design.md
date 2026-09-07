# Optional education + certifications on generated resumes — design

**Date:** 2026-09-07
**Status:** Grill locked (session 2026-09-07). Ready for an implementation plan.
**Goal:** Per-user source-of-truth education and certification entries that flow into generated resumes via the existing RenderCV pipeline — include-when-present, no toggles, no `resume` table changes.

**Related**

- [Resume schema](../../../packages/db/src/schema/resume.schema.ts) — `resume` rows stay rendered artifacts only (`r2Key`, `prompt`, `author`, `default`)
- [RenderCV mapping](../../../packages/pdf/src/map-rendercv-yaml.ts) — sections assembled at lines 234–247; education section currently absent by design
- [Experience schema](../../../packages/db/src/schema/experience.schema.ts) — column-shape model for the new tables (text dates, `sortOrder`, cascade FK)
- [Resume-import workflow](../../../apps/agent/src/mastra/workflows/resume-import-workflow/) — extraction target for onboarding
- [Core package patterns](../../../.agents/core.md) — shared Zod contracts
- [oRPC patterns](../../../.agents/orpc.md) / [API fetching patterns](../../../.agents/api-fetching-patterns.md)
- [Hub chat tools](../../../.agents/skills/tools/SKILL.md) — read/add/edit tools
- [Testing](../../../.agents/testing.md)
- ATS research (2026 sources): education section parse targets, certifications formatting — distilled in this spec's RenderCV mapping section

**Not this spec:** writing code. Implementation plan comes after this file. Per-generation section-exclusion toggles (documented follow-up, below), education on the **public portfolio**, GPA/format intelligence (e.g. auto-hiding GPA for old graduates), RenderCV YAML user-facing editing.

---

## Glossary

**Source of truth.** Per-user editable rows. Education/certs are user data, like `experience` and `skill`. Never generated-at-time artifacts.

**Rendered artifact.** A `resume` row: PDF in R2 + prompt. Regenerable from source-of-truth data. No structured content stored on it.

**Include-when-present.** If the user has rows, the section renders on every generated resume. If empty, the section is skipped (same rule as `experience`/`skills` today). "Optional" means optional to fill in.

**Grill-locked decisions** (2026-09-07 session):

1. Per-user source of truth — **not** baked into `resume` artifacts. Auth schema is off-limits for domain data.
2. Two dedicated tables (`education`, `certification`) — **not** a `kind` enum on `experience`, **not** jsonb blobs.
3. Include-when-present; **no per-generation toggles day one**.
4. Column shapes per below (text dates, optional `gpa`/`location`/`description`, no `credentialId` column).
5. Entry paths day one: manual CRUD + resume-import extraction + hub chat read/add/edit tools.
6. RenderCV order: `summary → experience → education → projects → skills → certifications`.
7. CRUD UI lives in profile/settings alongside experience & skills.

---

## Product lock

- Education and certifications are **separate sections** in output — never merged (ATS misclassifies blended sections).
- A generated resume renders a section only when the user has entries for it. Empty sections never appear.
- `resume` rows stay PDF-only artifacts; regeneration reads current source data.
- No per-generation exclusion in v1. Known escape-hatch scenario (mismatched degree, e.g. arts graduate applying to CS roles): user deletes education rows for now; toggles are a documented follow-up.
- Certs render as one-liners with full credential name + acronym as entered; ATS keyword matching depends on the user entering the full official name — the import/agent prompts should preserve the source text verbatim.

---

## Storage

New files in `packages/db/src/schema/`, exported from `schema/index.ts` + `types/`, relations in `relations.ts`, repositories in `repositories/`.

```ts
// education
id: text primary key
userId: text → user.id (cascade)
school: text notNull              // RenderCV institution
degree: text notNull              // full name ("Bachelor of Science"); RenderCV studyType
field: text nullable              // "Computer Science"; RenderCV area
location: text nullable           // "Cairo, Egypt"
fromDate: text nullable           // text dates like experience — year-level precision
toDate: text nullable
isPresent: boolean default false  // still enrolled → "Expected [Year]"
description: text nullable        // RenderCV highlights: honors, coursework, thesis
gpa: text nullable                // free text, user's format ("3.8/4.0") — rendered verbatim
sortOrder: integer default 0      // reverse-chronological convention, user-ordered
createdAt, updatedAt

// certification
id: text primary key
userId: text → user.id (cascade)
name: text notNull                // full credential name, acronym inline as entered
issuer: text notNull
issuedAt: text nullable           // "2025-03"
expiresAt: text nullable          // null = no expiry
credentialUrl: text nullable      // verification link; renders on the name
description: text nullable
sortOrder: integer default 0
createdAt, updatedAt
```

No `credentialId` column: `credentialUrl` covers verification; bare IDs are rare. No auth-schema changes. Indexes mirror `experience` (`user_id + sort_order`).

## RenderCV mapping

`packages/pdf/src/map-rendercv-yaml.ts`:

- **Order**: `summary → experience → education → projects → skills → certifications`. Education above projects (education is a parseable ATS field with hard auto-reject when required; projects are optional). Both new sections skip when empty.
- **Education entry**: `school→institution`, `degree→studyType`, `field→area`, `fromDate/toDate` (isPresent → "Expected [Year]" / open-ended), `description` → `highlights` (array of lines), `gpa` → entry field rendered verbatim.
- **Certifications entry**: one-liner, `Name (as entered) — Issuer, Issued Mon YYYY` (+ `· Expires Mon YYYY` when set). `credentialUrl` renders as link on the name, matching the existing `[Dev-Hub](https://…)` project-link pattern.
- Update the test that asserts education is absent (`map-rendercv-yaml.test.ts:67`) to assert presence-when-data and absence-when-empty.

## Entry paths (all day one)

1. **Manual CRUD** in profile/settings, alongside experience & skills. Same add/edit/delete + drag-to-persist `sortOrder` patterns.
2. **Resume-import extraction**: `resume-import-workflow` extract step gains education + certification extraction; applied in the onboarding one-outer-transaction apply (`onboarding-apply.repository.ts`). Prompts preserve credential names verbatim.
3. **Hub chat tools**: read/add/edit for both entities, following existing hub-write conventions (tenant-scoped, evidence/confirmation rules as with other hub writes).

## API surface

oRPC slices per [oRPC patterns](../../../.agents/orpc.md): list/create/update/delete + reorder, `protectedProcedure`, tenant-scoped. Shared Zod contracts (public shapes, upsert schemas) live in `packages/core` (`ai-settings`-style module folder, e.g. `packages/core/src/education/`, `packages/core/src/certification/`).

## Documented follow-up (not v1)

- **Per-generation exclusion toggles** (`includeEducation` / `includeCertifications`, default on when rows exist) for the mismatched-degree case. Deferred: lean-UX — render-when-present is the right default for the majority; controls only where harm is real. Requires generation-options plumbing + generate-UI checkboxes; schema unchanged.
- GPA intelligence (hide when stale), honors-as-structured-field, public portfolio education section.

---

## Verification

- Unit: RenderCV mapping (education + certs present/absent, order, one-liner shape, link rendering) — extend `packages/pdf` tests.
- Unit: core contract schemas; provider-binding unaffected.
- Manual: generate a resume with/without education rows; onboarding import populating both tables; hub chat add/edit round-trip.
- [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) after hub tools + import extraction ship (hub-write surface).
