# Application pipeline uses active stages + terminal outcomes

Seeker CRM tracks job applications as private, per-tenant rows. Progress
through hiring is modeled as an **active stage**. How an application ends
is modeled as a separate **terminal outcome**. The kanban board shows only
open applications (`outcome IS NULL`).

## Context

A single status enum that mixes mid-pipeline steps (`interview`) with
endings (`rejected`, `ghosted`) forces wide boards, loses “how far did I
get when it died?”, and confuses analytics/AI (progress features vs close
labels). Job-seeker CRMs need honest terminals: employer no, self-exit,
silence, and win.

## Decision

- **Active stages** (board columns, drag targets):

  `saved` → `applied` → `screening` → `interview` → `offer`

- **Terminal outcomes** (nullable on the row; set when closed):

  `rejected` | `withdrawn` | `ghosted` | `accepted`

- **Open** means `outcome IS NULL`. **Closed** means `outcome IS NOT NULL`.
- On close: set `outcome`, `outcomeAt`; **freeze** `stage` at the last
  progress step (do not move stage to a synthetic “rejected” column).
- Board UI: only open apps. List UI: filters Open / Closed / All with
  outcome badges on closed rows.
- Cross-column drag updates **stage only** (no persisted within-column
  sort order in v1). Optimistic client update + rollback on error.
- Hard delete removes the row; outcomes are the non-destructive “archive”
  path.

## Consequences

- Core enums/schemas live in `packages/core` (`application` domain) and
  drive DB, API, and UI labels.
- Closing is an explicit action (menu/drawer), not a board column.
- Future AI triage can suggest `ghosted` from staleness without inventing
  a mid-pipeline stage.
- Custom user-defined columns are out of scope; extend the fixed enums
  via migration when product needs change.
