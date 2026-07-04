# Portfolio entry table for per-item visibility

The `enable_ai` boolean lived on `experience`, `project`, and `stack` as
a per-row opt-in to "show this in the public portfolio and feed it to
the AI agent." We moved that decision out of the entity tables and into
a dedicated `portfolio_entry` join table keyed on `(type, entity_id)`,
with a single `portfolio.toggle` oRPC route owning the write and a
`portfolio.list` oRPC route serving the read for both the public site
and the agent.

## Context

The original boolean scattered the visibility rule across three tables,
made "include contact" impossible without a fourth column, and forced
every entity `update` input schema to carry the field. The agent
needed a single way to ask "what's in scope?" and the public portfolio
needed the same answer. A dedicated table makes the gate the source of
truth, lets the agent fetch one route, and lets the toggle evolve
(timestamps, owner-only restriction, audit trail) without a column
migration on every entity.

## Decision

- New table `portfolio_entry` with `id` (PK), `type` (`pgEnum` of
  `experience | project | stack | contact`), `entity_id` (text, the
  referenced row's PK), and timestamps.
- `experience`, `project`, `stack`, and `contact` each carry a
  nullable `portfolio_entry_id` FK back to the table. Cascade on
  entity delete — removing an entity removes its entry.
- `type` is an enum, not four nullable FKs, because a single Postgres
  column cannot FK four tables. Cross-table referential integrity is
  enforced in the toggle handler; the migration `up` is a single
  data backfill from `enable_ai = true` rows to `portfolio_entry` rows.
- `portfolio.toggle` is a single `protectedProcedure` taking
  `{ type, entityId, included }`. Upserts when `included: true`,
  deletes when `false`. The entity-side `enable_ai` field is removed
  from every update/create input.
- `portfolio.list` is a single `publicProcedure` taking
  `{ filter?: string, paginated?: boolean, cursor?, limit? }`. Returns
  the full nested evidence tree (experiences with their projects with
  their stacks, plus the standalone stacks and contacts arrays).
  `filter` is an RSQL-style string parsed in
  `packages/api/src/lib/rsql.ts`; default (no filter) returns every
  opted-in row of every type; `paginated` opts in to cursor pagination
  on the per-type arrays.

## Consequences

- The contact table gains `portfolio_entry_id` even though it never
  had `enable_ai`; that's intentional — contact rows can be opted in
  on first toggle, and a missing `enable_ai` history doesn't block
  the new model.
- The `enable_ai` boolean is gone from the entity schemas. Web forms
  move the switch to a separate `Include in portfolio` UI element
  that calls `portfolio.toggle` and invalidates the list query.
- The RSQL parser is a new dependency surface inside `packages/api`.
  It must be hardened (escaping, depth limits) before exposing it to
  the public surface; see `packages/api/src/lib/rsql.ts` for the
  grammar.
- The migration backfills `portfolio_entry` from existing
  `enable_ai = true` rows, then drops the columns in a second step.
  Two migrations to keep the data move and the schema change
  reviewable.
