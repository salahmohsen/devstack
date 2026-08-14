# Dashboard entity create/edit uses the side panel (inset Sheet on mobile)

Create and edit flows for durable dashboard entities (applications,
experiences, projects, stacks) use the **dashboard side panel** — the same
chrome as item inspect (`ItemInfoPanel`). On viewports below `xl`, that
chrome is an **inset right Sheet**. Centered Dialog is not used for these
forms. Short tools and destructive confirms stay on Dialog / AlertDialog.

## Context

NN/g and Material guidance: modals for multi-field edit **cover context**
users need (list/board rows). The existing inspect panel already keeps the
list visible and scales for long content. Entity forms should share that
surface instead of a second overlay language.

## Decision

- Shared shell: `apps/web/src/pages/dashboard/_lib/entity-form-panel.tsx`.
  - **Desktop (`xl+`):** `SidePanelPortal` + `ItemInfoPanel` (header, scroll
    body, prev/next + timestamps footer).
  - **Mobile:** `Sheet` `variant="inset"` `side="right"` with the same
    panel chrome and a close button.
- **Save lives in the header** (same idea as Settings). Do **not** add a
  dialog-style Cancel/Save footer.
- Dirty close: confirm before discard (Escape, sheet close, or navigating
  away). No silent wipe of long notes/JD.
- Destructive Delete stays in a danger zone / overflow + AlertDialog, not
  as an equal twin of Save.
- Keep Dialog / AlertDialog / PromptDialog for: merge stacks, organize,
  detect-stacks, passkey name, fix URL, delete confirms.

## Consequences

- One inspect/edit language across evidence entities and Seeker CRM.
- Mechanical form-body moves; validation/schemas stay TanStack Form + core
  Zod.
