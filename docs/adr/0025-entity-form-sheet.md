# Dashboard entity create/edit uses Sheet, not Dialog

Create and edit flows for durable dashboard entities (applications,
experiences, projects, stacks) use a **right side Sheet** (drawer), not a
centered Dialog. Short tools and destructive confirms stay on Dialog /
AlertDialog.

## Context

NN/g and Material guidance: modals for multi-field edit **cover context**
users need (list/board rows). Side sheets keep the primary surface
partially visible and scale better for long forms. Experiences, projects,
and stacks historically used Dialog; applications (longer CRM form)
should not invent a third pattern.

## Decision

- Introduce a shared **entity form Sheet** shell (app-level, e.g.
  `apps/web/src/shared/ui` or widgets) wrapping `@tsu-stack/ui` `Sheet`:
  title, description, scrollable body, sticky footer actions.
- **Applications:** one Sheet for create and edit.
- **Experiences, projects, stacks:** migrate create/edit from Dialog to
  the same Sheet shell in the same epic as applications.
- **Keep Dialog / AlertDialog** for: merge stacks, organize, detect-stacks,
  delete confirms, other short multi-step tools.
- Dirty close: if the form is dirty, confirm before discard (do not silent
  wipe long notes/JD).
- Primary Save and destructive Delete must not sit as equal adjacent
  twins; Delete in danger zone / overflow menu + AlertDialog.

## Consequences

- One interaction language across evidence entities and Seeker CRM.
- Mechanical form-body moves; validation/schemas stay TanStack Form + core
  Zod.
- Mobile: full-height Sheet is acceptable for long forms; do not force
  bottom sheets for multi-section entity edit (those suit short tasks).
