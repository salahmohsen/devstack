# Seeker Applications CRM — Design

**Date:** 2026-07-28  
**Status:** Approved (grilled + UX-validated)  
**Goal:** Ship a production-grade, multi-tenant **job applications** pipeline: board + list, Sheet create/edit, link generated resumes, hard delete — plus a shared entity **Sheet** shell and migrate experiences/projects/stacks create/edit off Dialog.

**ADRs:**

- `docs/adr/0024-application-stage-and-outcome.md`
- `docs/adr/0025-entity-form-sheet.md`

**Related:** Multi-user foundation (`docs/superpowers/specs/2026-07-27-multi-user-tenancy-restructure-design.md` — Seeker CRM was “next epic”). Resume catalog: existing `resume` table / ADR-0023 (generated only).

---

## Product intention

Private seeker CRM for each tenant (`userId`). Track applications against the living evidence graph by linking a **generated** `resumeId`. Not marketplace, not employer email, not AI auto-fill in v1.

```text
Career OS
  ├── Evidence graph     (experiences, projects, stacks, portfolio)
  ├── Generated resumes  (resume table)
  └── Applications ← this epic (pipeline + list)
```

---

## Frozen decisions (grill log)

| #   | Topic           | Decision                                                                                                        |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Scope           | **Pipeline MVP** — no AI auto-fill, job prefs, tags, follow-up fields, cover letter, resume upload-in-drawer    |
| 2   | Model           | Active **stages** + terminal **outcomes** (ADR-0024)                                                            |
| 3   | Closed on board | **Hidden** (`outcome IS NULL` only)                                                                             |
| 4   | Default view    | **Board first**; persist `list` \| `board` in **localStorage** (mount-safe)                                     |
| 5   | Drag            | **Stage only**; no within-column `sortOrder`                                                                    |
| 6   | Create/edit     | **One Sheet** for create + edit (ADR-0025)                                                                      |
| 7   | Epic scope      | Shared Sheet shell + applications + migrate **experiences, projects, stacks** Dialog → Sheet                    |
| 8   | Fields          | See data model                                                                                                  |
| 9   | List            | CRM lite: multi-select, batch hard-delete; no portfolio/sort mode                                               |
| 10  | Drag UX         | **Optimistic** + rollback toast                                                                                 |
| 11  | Urgency         | `unknown` \| `immediate` \| `soon` \| `flexible` (default `unknown`; badge only if ≠ unknown)                   |
| 12  | Nav             | `/dashboard/applications` after Resumes                                                                         |
| 13  | Data load       | One `applications.list`; client group/filter                                                                    |
| 14  | Delete          | **Hard** delete + AlertDialog                                                                                   |
| 15  | Empty           | Board columns visible + **Add application** CTA                                                                 |
| —   | Kanban          | `@dnd-kit` (already in monorepo); ReUI Kanban as **UX reference only**, reimplemented with coss/`@tsu-stack/ui` |

---

## UX guardrails (research sharpening)

Sourced from Nielsen Norman Group, Material Design 3, Atlassian DnD guidelines. Implement these as non-optional product rules.

### Sheet / forms

1. **Right Sheet** for create/edit; keep board/list partially visible.
2. **Sticky footer:** primary Save / Add to pipeline; secondary Cancel.
3. **Dirty close:** if form dirty, confirm before discard (avoid silent loss of JD/notes).
4. **Delete:** AlertDialog only; not adjacent as equal twin to Save (danger zone / menu).
5. **Progressive disclosure:** required company + title first; optional details below; no v1 tags/follow-ups/uploads.
6. **Long body:** scrollable Sheet body; do not use bottom sheet for full entity edit on mobile — full-height Sheet is fine.

### Board (dnd-kit)

7. Cards are **implied draggable** (whole card); hover/grab feedback; dim original while dragging (~40% opacity pattern).
8. **Clear drop result:** highlight target column; drop = stage change only (no sort line if order not persisted).
9. **Accessible non-drag path:** card menu or drawer must change stage (keyboard/AT).
10. **Optimistic** move; on failure restore + error toast; avoid double-submit while mutation in flight.
11. **Open only** on board; closing removes card from board with toast (“Closed · Rejected”).

### List

12. Filters: **Open / Closed / All** (client-side on full list).
13. Row shows company, title, stage badge, urgency (if set), resume hint, dates; closed shows **outcome** badge.
14. Multi-select + batch delete with count in confirm (“Delete 3 applications?”).

### Empty & chrome

15. Empty board: five stage columns + clear **Add application** (header + empty overlay). No AI import empty state in v1.
16. View toggle **Board | List** in header; default board; persist after mount via localStorage key e.g. `applications:view`.

### Consistency

17. Experiences/projects/stacks create/edit use the **same Sheet shell** in this epic.
18. Merge / organize / detect-stacks remain Dialog; deletes remain AlertDialog.

---

## Domain model

### Enums (`packages/core`)

```ts
applicationStageEnum = ["saved", "applied", "screening", "interview", "offer"] as const;

applicationOutcomeEnum = ["rejected", "withdrawn", "ghosted", "accepted"] as const;

hiringUrgencyEnum = ["unknown", "immediate", "soon", "flexible"] as const;
```

Display labels: title-case in UI (`Saved`, `Applied`, …).

### Table `application`

| Column                    | Type                   | Notes                               |
| ------------------------- | ---------------------- | ----------------------------------- |
| `id`                      | text PK                | UUID                                |
| `userId`                  | text FK → user CASCADE | Tenant                              |
| `companyName`             | text NOT NULL          |                                     |
| `title`                   | text NOT NULL          | Role                                |
| `url`                     | text null              | Job posting URL                     |
| `source`                  | text null              | Channel label (LinkedIn, Referral…) |
| `location`                | text null              | Free text                           |
| `salaryRange`             | text null              | Free text v1                        |
| `description`             | text null              | JD body                             |
| `notes`                   | text null              |                                     |
| `stage`                   | enum NOT NULL          | Default `saved`                     |
| `stageChangedAt`          | timestamptz NOT NULL   | Set on create + every stage change  |
| `outcome`                 | enum null              | Null = open                         |
| `outcomeAt`               | timestamptz null       | Set when outcome set                |
| `hiringUrgency`           | enum NOT NULL          | Default `unknown`                   |
| `resumeId`                | text null FK → resume  | ON DELETE SET NULL                  |
| `createdAt` / `updatedAt` | timestamptz            |                                     |

Indexes: `(userId)`, `(userId, stage)`, partial or filter queries for open (`outcome IS NULL`).

**Integrity:** `resumeId` must belong to same `userId` on create/update (API check → NOT_FOUND if wrong tenant).

### Out of schema v1

tags, followUpAt/Note, cover letter, attachments table, interviews, events, job_preference, custom stages, sortOrder.

---

## API (`packages/api`)

Router `applications` — all `protectedProcedure`, always scope `context.session.user.id`.

| Procedure     | Kind                   | Behavior                                                                                            |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `list`        | query                  | All apps for user, `updatedAt desc` (or `stageChangedAt`). Client filters open/closed.              |
| `get`         | query                  | `{ id }` → for user or NOT_FOUND                                                                    |
| `create`      | mutation               | Input: fields; default stage `saved`, urgency `unknown`                                             |
| `update`      | mutation               | Patch fields (not used for pure stage drag if separate)                                             |
| `updateStage` | mutation               | `{ id, stage }` — sets stage + `stageChangedAt`; only if open (or allow stage edit while open only) |
| `setOutcome`  | mutation               | `{ id, outcome }` — sets outcome + `outcomeAt`; clears from board                                   |
| `reopen`      | mutation (optional v1) | Clear outcome/outcomeAt — **defer** unless cheap                                                    |
| `delete`      | mutation               | Hard delete one                                                                                     |
| `deleteMany`  | mutation               | Hard delete ids for user                                                                            |

Typed errors as needed: `NOT_FOUND`, `VALIDATION`, `INVALID_STATE` (e.g. updateStage when already closed — product choice: allow or reject; **recommend reject stage drag on closed**, closed only on list).

---

## Web architecture

### Routes / nav

- Route: `apps/web/src/routes/(root-layout)/__protected/dashboard/applications/index.tsx`
- Page: `apps/web/src/pages/dashboard/applications/`
- Sidebar: after Resumes — `{ href: "/dashboard/applications", label: "Applications", group: "Dashboard" }`
- Breadcrumbs label: Applications

### Feature layout

```text
apps/web/src/features/applications/api/   # list/create/update/stage/outcome/delete
apps/web/src/pages/dashboard/applications/
  applications-page.tsx                   # view toggle, empty, host list|board
  application-form-sheet.tsx              # create|edit
  ui/board.tsx                            # dnd-kit columns
  ui/list.tsx                             # multi-select list
  ui/card.tsx
  _lib/application.slice.ts               # selection, opened id, sheet mode
  _lib/use-applications-view.ts           # localStorage view preference
```

### Shared Sheet shell

```text
apps/web/src/shared/ui/entity-form-sheet.tsx  # or widgets/
```

Props: open, onOpenChange, title, description, children, footer, size.

Migrate:

- `experience-form.tsx` Dialog → shell
- project form Dialog → shell
- stack form Dialog → shell

### View preference

```ts
// After mount only
const STORAGE_KEY = "applications:view"; // "board" | "list"
// SSR / first paint: "board"
// useHasMounted / useIsClient then read storage
```

No dual source of truth with URL in v1.

### Board implementation notes

- Five columns from core stage constants.
- `DndContext` + multiple `SortableContext` or droppable columns (dnd-kit multi-container pattern).
- `onDragEnd`: if column changed → optimistic cache update → `updateStage`.
- Card click → open edit Sheet.
- Card menu: stages + Close → outcome submenu + Delete.

### List

- Mirror experiences density via `ListItem` / multi-select patterns where it fits.
- Open sheet on row activate.
- Filter chips Open | Closed | All.

---

## End-to-end order

Per `.agents/end-to-end-features.md` (and plan Tasks 1→3 inside PR1):

1. DB schema + migration + repository
2. Core enums/schemas/**outputs**/labels (after db types exist for `satisfies`)
3. API router (`applications.router.ts`) with write-rule matrix
4. Entity form Sheet shell (dirty intercept on all dismiss paths)
5. Web feature api hooks (one op per file) + page shell + nav
6. Form Sheet + board (dnd-kit multi-container) + list
7. Migrate experiences / projects / stacks
8. Validate touched packages

**Write rules:** `update` never carries stage/outcome; `updateStage` open-only; `setOutcome` freezes stage and may overwrite when already closed.

---

## Explicit non-goals (v1)

- AI JD auto-fill / match score
- job_preference
- Custom stages
- Within-column order persistence
- Cover letter / attachment uploads
- Soft delete
- Undo toast after close
- Outbound employer email
- Public applications surface

---

## Success criteria

- Two users: zero IDOR on applications; resume link only own resumes.
- Board shows only open apps; drag changes stage optimistically.
- Close with outcome removes from board; list Closed filter shows them.
- Create/edit Sheet works for applications; experiences/projects/stacks also Sheet.
- View preference survives reload (after mount).
- Empty board teaches five stages + Add CTA.
- Hard delete confirmed; batch delete states count.

---

## Testing checklist (manual)

1. Create app (required fields only) → appears in Saved.
2. Drag Saved → Applied → stage persists after refresh.
3. Set outcome Rejected → leaves board; list Closed shows badge.
4. Link resume from list; delete resume → resumeId null (SET NULL).
5. Wrong-user id → NOT_FOUND.
6. Toggle Board/List; reload → last view restored.
7. Dirty Sheet close → confirm.
8. Batch delete 2 apps → confirm count.
9. Experience create uses Sheet (same for project/stack).
10. Keyboard: open card menu, change stage without drag.
