# Seeker Applications CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production-grade multi-tenant applications pipeline (board + list, Sheet CRUD, stage/outcome model, resume link) and shared entity form Sheet; migrate experiences/projects/stacks create/edit from Dialog → Sheet.

**Architecture:** `userId`-scoped `application` table → core Zod enums → oRPC `applications.*` → web board (`@dnd-kit`) + list + one create/edit Sheet. Closed apps (`outcome != null`) hidden from board. View preference in localStorage. Spec: `docs/superpowers/specs/2026-07-28-seeker-applications-crm-design.md`. ADRs: `0024-application-stage-and-outcome.md`, `0025-entity-form-sheet.md`.

**Tech Stack:** Drizzle/Postgres, `@tsu-stack/core`, oRPC, TanStack Start/Router/Query/Form, `@dnd-kit/*` (existing), `@tsu-stack/ui` Sheet/coss, experiences list patterns.

**Skills / agents docs while implementing:** `.agents/end-to-end-features.md`, `.agents/core.md`, `.agents/orpc.md`, `.agents/ui.md`, `.agents/tanstack-patterns.md`, `.agents/api-fetching-patterns.md`, coss / tanstack-form-conventions as needed.

**UX guardrails (must implement):** dirty Sheet close on **all** dismiss paths; sticky footer; Delete via AlertDialog not next to Save; optimistic stage drag + rollback; a11y stage menu; open-only board; progressive fields; empty columns + Add CTA. Full list in design spec § UX guardrails.

**Plan review:** Subagent review (2026-07-28) → **Approve with fixes** applied below (DB→core→API order, full core contracts, write matrix, dirty intercept, naming).

---

## File Structure

| Action | Path                                                                              | Responsibility                        |
| ------ | --------------------------------------------------------------------------------- | ------------------------------------- |
| Create | `packages/db/src/schema/application.schema.ts`                                    | Table + pgEnums                       |
| Modify | `packages/db/src/schema/index.ts`, `relations.ts`                                 | Export / relations                    |
| Create | `packages/db/src/types/application.schema.ts`                                     | Infer types                           |
| Modify | `packages/db/src/types/index.ts`                                                  | Export types                          |
| Create | migration via `vp run db:generate`                                                | SQL                                   |
| Create | `packages/db/src/repositories/application.repository.ts`                          | Tenant-scoped CRUD                    |
| Modify | `packages/db/src/repositories/index.ts`                                           | Export                                |
| Create | `packages/core/src/application/*`                                                 | Enums, I/O schemas, labels            |
| Modify | `packages/core/src/index.ts`                                                      | Export                                |
| Create | `packages/api/src/routers/applications.router.ts`                                 | oRPC (plural, matches peers)          |
| Modify | `packages/api/src/routers/index.ts`                                               | Mount `applications`                  |
| Create | `apps/web/src/shared/ui/entity-form-sheet.tsx`                                    | Shared Sheet shell                    |
| Create | `apps/web/src/features/applications/api/*.ts`                                     | One op per file                       |
| Create | `apps/web/src/pages/dashboard/applications/**`                                    | Page, board, list, form, `_lib`       |
| Create | `apps/web/src/routes/(root-layout)/__protected/dashboard/applications/index.tsx`  | Thin route                            |
| Modify | `apps/web/src/widgets/layout/ui/sidebar.tsx`                                      | Nav link                              |
| Modify | `apps/web/src/widgets/layout/ui/dashboard-breadcrumbs.tsx`                        | Label                                 |
| Modify | `experience-form.tsx`, `projects/ui/project-form.tsx`, `stacks/ui/stack-form.tsx` | Dialog → Sheet                        |
| Modify | `CONTEXT.md`                                                                      | Glossary (done in docs PR if already) |

---

## Write-rule matrix (API + repo — freeze)

| Op                | Open (`outcome == null`)                                    | Closed                                                         |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `updateStage`     | OK; set `stage` + `stageChangedAt`                          | **`INVALID_STATE`**                                            |
| `setOutcome`      | OK; set `outcome` + `outcomeAt`; **do not change `stage`**  | **Allow overwrite** (fix wrong outcome); still no stage change |
| `update` (fields) | OK                                                          | OK for company/notes/resume/etc.                               |
| `update` body     | **Must not** include stage/outcome/outcomeAt/stageChangedAt | same                                                           |
| `reopen`          | —                                                           | **Defer** v1                                                   |

Create defaults: `stage = "saved"`, `hiringUrgency = "unknown"`, `stageChangedAt = now()`, `outcome = null`, `outcomeAt = null`.

List sort: **`updatedAt desc`**.

Resume: FK SET NULL is not enough — on create/update if `resumeId` set, `resumeRepository.findByIdForUser(resumeId, userId)` or **NOT_FOUND**.

---

### Task 1: DB — application table + repository

**Files:**

- Create: `packages/db/src/schema/application.schema.ts`
- Modify: schema index, relations
- Create: `packages/db/src/types/application.schema.ts`
- Modify: types index
- Create: `packages/db/src/repositories/application.repository.ts`
- Modify: repositories index
- Generate migration

- [ ] **Step 1: pgEnums** `application_stage`, `application_outcome`, `hiring_urgency`

- [ ] **Step 2: Table columns** per design: id, userId CASCADE, companyName, title, url, source, location, salaryRange, description, notes, stage, stageChangedAt, outcome, outcomeAt, hiringUrgency, resumeId SET NULL, createdAt, updatedAt

- [ ] **Step 3: Indexes** `(userId)`, `(userId, stage)`

- [ ] **Step 4: Relations** application → user, application → resume

- [ ] **Step 5: Generate migration**

```bash
vp run db:generate
```

- [ ] **Step 6: DATABASE_URL host check** (not production) then migrate per `.agents/workflow.md`

- [ ] **Step 7: Repository**

```ts
findAllByUserId(userId); // order updatedAt desc
findByIdForUser(id, userId);
create(input); // defaults above; id = crypto.randomUUID()
update(id, userId, patch); // body fields only
updateStage(id, userId, stage); // only if open; bump stageChangedAt; return null if missing
setOutcome(id, userId, outcome); // freeze stage; set outcomeAt; allow overwrite when closed
deleteMany(ids, userId);
```

- [ ] **Step 8: Typecheck db**

---

### Task 2: Core — application domain contracts

**Depends on:** Task 1 types for `satisfies` against db types (same pattern as experience/resume).

**Files:**

- Create: `packages/core/src/application/types.ts`
- Create: `packages/core/src/application/utils.ts`
- Create: `packages/core/src/application/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Zod enums** `ApplicationStageSchema`, `ApplicationOutcomeSchema`, `HiringUrgencySchema`

- [ ] **Step 2: Ordered stage list** for board columns derived from enum (single source of truth)

- [ ] **Step 3: Input schemas**

```ts
CreateApplicationInputSchema; // no userId; stage optional; urgency optional
UpdateApplicationInputSchema; // patch body ONLY — no stage/outcome timestamps
UpdateStageInputSchema; // { id, stage }
SetOutcomeInputSchema; // { id, outcome }
DeleteApplicationsInputSchema; // { ids: string[] } non-empty
```

- [ ] **Step 4: Output schemas** `ApplicationOutputSchema` (omit userId; dates `z.date()`), `ApplicationListOutputSchema`

- [ ] **Step 5: Labels + select options + `isOpen(app)`**

- [ ] **Step 6: Export from package index**

- [ ] **Step 7: Typecheck core**

```bash
vp run typecheck --filter=@tsu-stack/core
```

---

### Task 3: API — applications router

**Files:**

- Create: `packages/api/src/routers/applications.router.ts`
- Modify: `packages/api/src/routers/index.ts`

- [ ] **Step 1: Procedures** list, get, create, update, updateStage, setOutcome, delete, deleteMany

- [ ] **Step 2: Always `session.user.id`**; never trust client userId

- [ ] **Step 3: resumeId ownership** on create/update

- [ ] **Step 4: Write-rule matrix** (see above); typed errors `NOT_FOUND`, `INVALID_STATE` via `.errors(...)`

- [ ] **Step 5: Mount as `applications`**

- [ ] **Step 6: Typecheck api**

---

### Task 4: Shared EntityFormSheet

**Files:**

- Create: `apps/web/src/shared/ui/entity-form-sheet.tsx`
- Read: `packages/ui/components/sheet.tsx`, `apps/web/src/shared/ui/form-dirty-guard.tsx`

- [ ] **Step 1: Sheet shell** — title, description, scrollable body, sticky footer, `side="right"`, default width **at least `max-w-lg`** (apps form is long; allow className override)

- [ ] **Step 2: Dirty dismiss intercept (required)** — accept `isDirty` / `onCloseAttempt`; intercept `onOpenChange(false)`, close button, Escape; do **not** close while dirty without confirm (integrate `useFormDirtyGuard` or equivalent). All close paths must share one confirm — not Cancel-only.

- [ ] **Step 3: Do not implement applications form with ad-hoc Sheet** before this shell lands

---

### Task 5: Web feature API + applications page shell

**Files:**

- Create: `apps/web/src/features/applications/api/list-applications.query.ts` (+ create/update/update-stage/set-outcome/delete/delete-many mutations — one file per op)
- Create: `apps/web/src/pages/dashboard/applications/_lib/application.slice.ts`
- Create: `apps/web/src/pages/dashboard/applications/_lib/use-applications-view.ts` (use `useHasMounted`)
- Create: `apps/web/src/pages/dashboard/applications/applications-page.tsx`
- Create: `apps/web/src/routes/(root-layout)/__protected/dashboard/applications/index.tsx`
- Modify: sidebar, breadcrumbs

- [ ] **Step 1: Feature API wrappers** per `.agents/api-fetching-patterns.md` (do not inline orpc only in page like older experiences)

- [ ] **Step 2: Route** thin prefetch `applications.list`

- [ ] **Step 3: Nav** after Resumes

- [ ] **Step 4: View preference** — SSR/first paint `"board"`; after mount read/write `localStorage` key `applications:view`

- [ ] **Step 5: Header** — Board|List toggle, Add application

- [ ] **Step 6: Empty board** — always **5 columns** + Add CTA with zero rows

---

### Task 6: Application form Sheet (create + edit)

**Files:**

- Create: `apps/web/src/pages/dashboard/applications/application-form-sheet.tsx`

- [ ] **Step 1: Fields** — required company/title; optional url, source, location, salaryRange, description, notes, hiringUrgency, resume from `resume.list`

- [ ] **Step 2: Sticky footer** Add to pipeline / Save; Cancel; Delete **not** twin of Save (menu/danger zone + AlertDialog)

- [ ] **Step 3: Dirty close via EntityFormSheet intercept**

- [ ] **Step 4: Edit** — outcome actions (Rejected / Withdrawn / Ghosted / Accepted) only as close actions; toast `Closed · {Outcome}`

- [ ] **Step 5: Invalidate list on success**

---

### Task 7: Board (dnd-kit multi-container)

**Files:**

- Create: `ui/board.tsx`, `ui/card.tsx`

**Note:** Repo only has single-list `SortableList`. Build multi-container: droppable columns + `onDragEnd` for **column change only**; use collision detection suitable for columns (e.g. closestCorners); **no** sortOrder persistence; ignore pure within-column reorder for server writes.

- [ ] **Step 1: Group open apps only** (`outcome == null`) by stage order from core

- [ ] **Step 2: Multi-container dnd-kit** — stage-only drops

- [ ] **Step 3: Optimistic updateStage** — cancelQueries → setQueryData → mutate → rollback previous on error → toast (mirror experiences reorder pattern)

- [ ] **Step 4: Card UI** — company, title, urgency badge if ≠ unknown, resume indicator

- [ ] **Step 5: Card menu (a11y)** — Move to stage… (open only), Close as…, Edit, Delete

- [ ] **Step 6: Drop highlight** + dim dragging card (~opacity 0.4)

- [ ] **Step 7: Per-card in-flight lock** against double stage apply

- [ ] **Step 8: After setOutcome** card leaves board + toast

---

### Task 8: List view

**Files:**

- Create: `ui/list.tsx`

- [ ] **Step 1: Filter chips** Open | Closed | All (client-side on full list)

- [ ] **Step 2: Rows** — company, title, stage badge, urgency, resume hint, dates; outcome badge when closed

- [ ] **Step 3: Multi-select + batch delete** AlertDialog with count (“Delete 3 applications?”); reject empty ids server-side

- [ ] **Step 4: Row click** opens edit Sheet; closed rows: no stage drag; stage menu only if open

---

### Task 9: Migrate experiences, projects, stacks → EntityFormSheet

**Files:**

- `apps/web/src/pages/dashboard/experiences/experience-form.tsx`
- `apps/web/src/pages/dashboard/projects/ui/project-form.tsx`
- stacks form (locate `stack-form` / equivalent under `stacks/`)

- [ ] **Step 1: Replace Dialog chrome with EntityFormSheet**; keep form fields/validation

- [ ] **Step 2: Dirty dismiss on all paths** (same shell)

- [ ] **Step 3: Preserve portfolio toggles** outside Save/Delete adjacency

- [ ] **Step 4: Leave merge/organize/detect-stacks on Dialog**

- [ ] **Step 5: Manual smoke** create/edit each entity

---

### Task 10: Glossary + docs

- [x] **CONTEXT.md** + multi-user follow-up links (docs commit)
- [ ] **Step 1: Verify glossary** matches shipped enums after implementation

---

### Task 11: Validation

- [ ] **Step 1: Typecheck** core, db, api, web

- [ ] **Step 2: Manual checklist** from design spec

- [ ] **Step 3: No production migrate without explicit user OK**

---

## Risk register

| Risk                   | Mitigation                                    |
| ---------------------- | --------------------------------------------- |
| IDOR                   | Always `findByIdForUser(id, session.user.id)` |
| Cross-tenant resumeId  | Ownership check on create/update              |
| Stage via `update`     | Exclude stage/outcome from patch schema       |
| Optimistic drag races  | Per-card in-flight; rollback cache            |
| SSR localStorage flash | Default board until mount                     |
| Dirty loss             | EntityFormSheet intercept all dismiss paths   |
| Multi-container dnd    | Stage-only; a11y menu backup                  |

---

## PR slicing

| PR      | Scope                                   | Implement order inside PR |
| ------- | --------------------------------------- | ------------------------- |
| **PR1** | DB + Core + API (no UI)                 | Task 1 → 2 → 3            |
| **PR2** | EntityFormSheet + applications UI       | Task 4 → 5 → 6 → 7 → 8    |
| **PR3** | Migrate experiences / projects / stacks | Task 9                    |

PR2 must not ship without PR1. Do not build applications form without Task 4 shell.

---

## Appendix — glossary (CONTEXT)

**Application:** Private per-tenant CRM row; not portfolio.

**Application stage:** `saved | applied | screening | interview | offer`.

**Application outcome:** `rejected | withdrawn | ghosted | accepted` or null.

**Hiring urgency:** `unknown | immediate | soon | flexible`.

**Applications board / list:** Open-only kanban vs CRM table with filters.
