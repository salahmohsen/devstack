# List search, filters, and command-palette find — design

**Date:** 2026-08-22  
**Status:** Grill locked (session 2026-08-22). Ready for an implementation plan.  
**Goal:** Search + facet chips + display sort on the six dashboard lists, URL-shareable via RSQL, plus authenticated entity jumps in the command palette. One query contract in `@tsu-stack/core`. Cubby Filters as the chip bar (AND-only in v1).

**Related**

- [New jobs + Tracked jobs](./2026-08-11-new-jobs-tracked-jobs-design.md) — `trackingStatus` partitions; Dismissed is a subview of New jobs, not a third nav item
- [Seeker applications CRM](./2026-07-28-seeker-applications-crm-design.md)
- [Jobs hardening from Freehire](./2026-08-20-devhub-jobs-hardening-from-freehire-design.md)
- [TanStack patterns](../../../.agents/tanstack-patterns.md) — `validateSearch`
- [Core package patterns](../../../.agents/core.md) — shared enums, filter schemas, sort values
- [UI guidelines](../../../.agents/ui.md)
- [Testing](../../../.agents/testing.md) — no e2e unless asked; compiler unit tests are in this spec
- Cubby Filters: https://www.cubby-ui.dev/docs/components/filters
- Cubby `useFuzzyFilter`: https://www.cubby-ui.dev/docs/hooks/use-fuzzy-filter (client rank only)

**Not this spec:** writing code. Implementation plan comes after this file. Nested AND/OR **group UI**, ReUI Filters as the bar, `react-rsql-query-builder`, fuzzy Postgres, mail list filters, public portfolio RSQL.

**Amends:** New jobs **New / Dismissed** tabs and Tracked jobs **open / closed / all** local filter become **seeded removable Cubby chips** on the same bar as other facets. Page identity (`inbox|dismissed` vs `tracked`) does not move into a cross-page Status chip.

---

## Glossary

**AST.** Allowlisted query tree in core: `and` / `or` / `{ field, op, value }`. Groups exist in the type so a later jobs group UI can attach without a new wire format.

**RSQL print.** String form of the AST for `?filter=` and oRPC. Not the UI model. Not portfolio `portfolio.list` RSQL.

**Chip / leaf.** One Cubby `FilterValue` (`id`, `field`, `operator`, `value`). v1 UI emits a **flat AND** of complete leaves.

**`q`.** Always-visible search box. Separate URL key. Not a Title/Name chip.

**Display sort.** `sortBy` + `sortDir` on the list query. Does not write `sortOrder`.

**Reorder.** Existing drag-to-persist `sortOrder` on experiences / projects / skills. Separate header action.

**Partition.** Jobs page identity: New jobs allowlists `inbox|dismissed` only; Tracked allowlists `tracked` only.

**Seeded chip.** Default leaf mounted on first paint (inbox on New jobs, open on Tracked). In the URL. Removable.

---

## Product lock

Dashboard lists are find + narrow, not a SQL workbench.

- Experiences, projects, skills, resumes, new jobs, tracked jobs all get the same chrome: **search + chips + display sort**.
- Palette **jumps** to a row (inspect deep link). It does not seed page chips and does not speak RSQL.
- Authenticated entity hits never appear for guests (`authRequired` + `protectedProcedure`).
- Nested OR of different fields is **not** in the v1 bar. `is any of` covers “stage is interview or offer.”
- Manual catalog order stays. Filter/sort-by never saves `sortOrder`.

---

## What we already have

- Cursor `listPage` for experiences, projects, skills (`cursor` + `limit` only). Full `list` for pickers and reorder.
- Resumes: full `resume.list`. Deep link `?resumeId=`.
- Jobs: full `applications.list({ trackingStatus })`. New jobs tabs inbox/dismissed. Tracked `listFilter` open/closed/all in a client store. Deep link `?applicationId=`. Board-first on Tracked.
- `ItemsFilterButton`: single-select command popover. Not this system.
- Command palette in root layout: pages + GitHub cache items; `authRequired` on Agent nav; no entity rows.
- `nuqs` adapter on TanStack Router (tabs, GitHub). These six lists will **not** use nuqs for filter state.
- Inspect opens then `navigate({ search: {} })` — **must stop wiping** `q` / `filter` / sort.
- Portfolio `parseRsql` in `packages/api/src/routers/portfolio.queries.ts` is **portfolio columns only**. Do not extend it.
- Skills list is slim (`projectCount`, no project array). Join table `project_stack`.

---

## Locked decisions

| #   | Topic              | Decision                                                                                                   |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | Product            | Search + facets on all six lists                                                                           |
| 2   | Jobs query tree UI | Not in v1. AST can represent groups later                                                                  |
| 3   | Palette            | Jump only; `authRequired` groups; no seed of page `q`/chips                                                |
| 4   | Execution          | Server-side for all six (SQL `WHERE`)                                                                      |
| 5   | Wire               | Core AST + `q` + sort. Cubby adapter. RSQL print for URL/oRPC                                              |
| 6   | Chip UI            | Cubby Filters, copy-own, remap to `@tsu-stack/ui` + lucide                                                 |
| 7   | Sort               | Display sort only. Reorder separate; disabled while `q` or chips active                                    |
| 8   | URL                | TanStack `validateSearch` per route: `q`, `filter`, `sortBy`, `sortDir`, inspect id                        |
| 9   | Page search        | Dedicated `q` input. No Title/Name chip                                                                    |
| 10  | Skills × projects  | Chip **Projects** `is any of` + **View skills** jump from project inspect                                  |
| 11  | Jobs tabs          | Drop tab chrome. Seeded removable chips. Page allowlists unchanged                                         |
| 12  | Palette backend    | One `search.entities`. Cap 8 per type. `q` ≥ 2                                                             |
| 13  | `useFuzzyFilter`   | Palette (and large chip option lists) only. Not list SQL                                                   |
| 14  | Jobs paging        | `listPage` for New jobs and Tracked **list**. Tracked **board** is a second query (no cursor, cap **200**) |
| 15  | Resumes            | Full `list` with `q`/filter/sort until it hurts                                                            |
| 16  | v1 fields          | Table in [v1 fields](#v1-fields)                                                                           |

---

## Architecture

```
URL (q, filter RSQL, sortBy, sortDir, inspectId)
  → ListSearchBar (Cubby chips + q + sort)
  → adapter FilterValue[] ↔ AST
  → oRPC listPage/list { q, filter, sortBy, sortDir, cursor }
  → parse RSQL → AST → allowlist → Drizzle
```

**Core** owns `ListQuery`, AST, per-resource allowlists, `printRsql` / `parseRsql` (new module).

**Web** owns Cubby chrome, adapter, route search, palette injection.

**API/DB** own compile + pagination. Skills **Projects** / Projects **Skills** = `EXISTS` / `NOT EXISTS` on `project_stack`.

Palette is a **separate** `search.entities` path. It does not read `filter`.

---

## Components

### `packages/ui`

- `npx shadcn@latest add @cubby-ui/filters` and `@cubby-ui/use-fuzzy-filter`.
- Remap Cubby Button, Combobox, Badge, Input, DropdownMenu → existing `@tsu-stack/ui` primitives. Lucide, not Hugeicons.
- Export `Filters`, `createFilter`, types, `useFuzzyFilter`.

### `packages/core`

- `ListQuery`, AST types, operator enums, resource allowlists (fields, ops, sort keys, `q` columns).
- `printRsql` / `parseRsql` for this AST only.
- `filterValuesToAst` / `astToFilterValues` (AND of leaves). Incomplete leaves omitted.
- Operator map (Cubby → RSQL):

| Cubby            | RSQL                          | SQL (typical)                                 |
| ---------------- | ----------------------------- | --------------------------------------------- |
| `is` / `eq`      | `==`                          | `=`                                           |
| `is_not` / `neq` | `!=`                          | `<>`                                          |
| `is_any_of`      | `=in=`                        | `IN (...)`                                    |
| `is_not_any_of`  | `=out=`                       | `NOT IN`                                      |
| `contains`       | `=ilike=`                     | `ILIKE '%' \|\| val \|\| '%'`                 |
| `not_contains`   | `=nilike=`                    | `NOT ILIKE`                                   |
| `starts_with`    | `=istart=`                    | `ILIKE val \|\| '%'`                          |
| `ends_with`      | `=iend=`                      | `ILIKE '%' \|\| val`                          |
| `gt` / `lt`      | `>` / `<`                     | same                                          |
| `between`        | two comparisons `>=` and `<=` | AND of bounds (omit null bound)               |
| `is_empty`       | `==null`                      | `IS NULL` or `NOT EXISTS` for relation fields |
| `is_not_empty`   | `!=null`                      | `IS NOT NULL` / `EXISTS`                      |

Unknown field or op → parse error (400). Do not implement `includes_all` in v1.

### `apps/web`

- Shared `ListSearchBar`: search input, `Filters`, sort select. Reads/writes route search.
- Per page: field config, seed chips, inspect param name.
- Chip option catalogs: `projects.list` / `stacks.list` (full picker lists), not `listPage`.
- Project inspect: `Link` to `/dashboard/skills?filter=projects=in=(id)` (keep other skills search empty unless already present — this jump **sets** `filter` for skills; it does not have to preserve a previous skills filter).
- Palette: merge `search.entities` into groups Experiences, Projects, Skills, Resumes, New jobs, Tracked jobs. `useFuzzyFilter` on combined items; Command `filter={null}`.
- New inspect search params: `experienceId`, `stackId` (projects/resumes/tracked already have ids). New jobs inspect should use `applicationId` or a dedicated param if the route has none today — **add `applicationId` on New jobs** if missing so palette can open a row.

**Not v1:** group combinator in the bar, Title chips, `ItemsFilterButton` as this system.

---

## Data flow

**URL (source of truth)**

| Param                | Rule                                        |
| -------------------- | ------------------------------------------- |
| `q`                  | Trimmed; omit when empty                    |
| `filter`             | RSQL of complete leaves; omit when none     |
| `sortBy` / `sortDir` | Omit when page default                      |
| inspect id           | Existing names + `experienceId` / `stackId` |

Opening inspect **preserves** `q` / `filter` / sort. Strip **only** the inspect id when closing if that is current behavior; never `search: {}`.

**Bar → URL**

- `q` debounced **300ms**, `navigate` replace.
- Chip changes: drop incomplete leaves; AST → RSQL.
- Seeded jobs chips are complete leaves on first paint (URL includes them).
- Sort writes `sortBy` / `sortDir` only.

**URL → server**

- `listPage` input: `{ cursor, limit, q, filter, sortBy, sortDir }` plus jobs **implicit** `trackingStatus` from the **page** (Tracked always `tracked`; New jobs always `inbox|dismissed` via chip or default).
- Any change to `q` / `filter` / sort **resets** infinite query (new key, cursor `null`).
- Tracked board: same input, **no cursor**, `limit = 200`. If `totalCount > 200`, board shows a cap notice; list view still pages.
- Palette does not send `filter`.

**Compile**

1. Parse RSQL → AST; fail closed.
2. Allowlist for resource + partition.
3. `q` → `OR` of `ILIKE` on `q` columns.
4. AST → `AND` of predicates.
5. Sort: explicit `sortBy` else page default (`sortOrder` catalogs; see field table for jobs/resumes).
6. `totalCount` is **filtered** count.

**Reorder**

Enabled only when `q` is empty **and** there are no chips. After clearing jobs seeds, reorder stays disabled on jobs (jobs have no `sortOrder`). Catalog reorder still loads full unfiltered `list` to persist order.

---

## v1 fields

| Page         | `q` columns                          | Chips                                                                                                   | Default sort (unfiltered / no display sort) | Sort-by options                               |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Experiences  | `title`, `organization`              | **In portfolio**                                                                                        | `sortOrder`                                 | `fromDate`, `title`, `updatedAt`              |
| Projects     | `title`                              | **In portfolio**, **Skills** (`is any of`)                                                              | `sortOrder`                                 | `year`, `title`, `updatedAt`                  |
| Skills       | `name`, `alternativeNames`           | **Type**, **In portfolio**, **Featured**, **Projects** (`is any of`)                                    | `sortOrder`                                 | `name`, `projectCount`, `updatedAt`           |
| Resumes      | `filename`, linked job title/company | **Tied to a job** (`is empty` = general)                                                                | `updatedAt` desc                            | `updatedAt`, `createdAt`                      |
| New jobs     | `title`, `company`                   | Seeded **Tracking is inbox**; also `dismissed`; **source**; **listing closed**; **match score** (range) | `matchScore` desc, then `updatedAt`         | `matchScore`, `updatedAt`, `company`          |
| Tracked jobs | `title`, `company`                   | Seeded **Open** (`outcome is empty`); **stage**; **outcome**; **source**; **match score**               | `updatedAt` desc                            | `updatedAt`, `stage`, `matchScore`, `company` |

**Out of v1:** experience date range chip, work mode/location, `includes all` projects, resume author, mail, Featured as a jobs field.

**Jobs seeds (RSQL)**

- New jobs: `trackingStatus==inbox`. Allowlist `trackingStatus` ∈ `{inbox, dismissed}` only. Remove chip → both. Invalid: `tracked`.
- Tracked: `outcome==null` (Open). Allowlist stages/outcomes for **tracked** rows only. Remove chip → all tracked. Implicit procedure input `trackingStatus: "tracked"`.

**Relation chips**

- Skills `projects=in=(id,…)` → `EXISTS project_stack`.
- Skills `projects==null` is **not** required in v1 (any-of only unless `is empty` falls out of Cubby defaults; if exposed, `NOT EXISTS`).
- Projects `stacks=in=(id,…)` → same join, other direction.

**Project → Skills jump:** `/dashboard/skills?filter=projects=in=(<projectId>)`.

---

## Palette

- Procedure: `search.entities` (`protectedProcedure`).
- Input: `{ q: string (min 2), types?: EntityType[] }`.
- Output: `{ type, id, label, sublabel, href }[]` grouped conceptually by type; **max 8 per type**.
- Types: `experience`, `project`, `stack`, `resume`, `inbox_job`, `tracked_job`.
- `inbox_job`: `trackingStatus in (inbox, dismissed)`.
- `tracked_job`: `trackingStatus = tracked`.
- `href` uses inspect search params on the owning dashboard route.
- Guest: no call. Signed-out palette keeps public pages + public GitHub only.
- Client: `useFuzzyFilter` ranks **nav + GitHub + entity hits** together.

---

## Errors, empty states, verification

**Fail closed**

- Bad RSQL / unknown field/op / partition violation → oRPC 400. Client toasts, **drops `filter`** from the URL, does not run an unscoped list.
- Palette on guest: never requested.

**Empty**

- Unfiltered empty catalog: keep today’s “Add …” empty states.
- Filtered/q no matches: “No {noun} match” + **Clear filters**. Clear restores `q` empty, chips empty, **then re-seeds jobs defaults**.
- Board over cap: notice on board only.

**Incomplete chips:** `is empty` / `is not empty` are complete. Empty arrays, `""`, `null` scalars stay local only.

**Verification**

- Unit tests in `packages/core` (`src/**/__tests__/*.test.ts`): print/parse round-trip; allowlist reject; `between` / `==null` / `=in=`; relation-field compile fixtures if the compiler is pure enough to test without DB.
- No new e2e unless asked.
- Manual: six pages; URL share; inspect id + filters together; project → skills; palette signed-in vs guest; reorder disabled while filtered; New jobs cannot chip `tracked`; board cap copy.

---

## Out of scope

- Nested group UI in Cubby (AST already allows `or` for later)
- ReUI Filters, `react-rsql-query-builder` as UI
- Extending portfolio `parseRsql`
- nuqs on these six routes
- Client-only filtering of `listPage` rows
- Mail, GitHub palette ranking changes beyond fuzzy on existing items
- Killing catalog reorder
- Public profile filters

---

## Implementation notes (for the plan)

Suggested order:

1. Core AST + RSQL print/parse + allowlists + unit tests.
2. Cubby install + remap in `packages/ui`.
3. Adapter + `ListSearchBar` + `validateSearch` on one catalog page (Skills) including Projects chip + jump from project.
4. Experiences, projects, resumes.
5. Applications `listPage` + New jobs / Tracked list + seeds + board second query.
6. `search.entities` + palette groups + `useFuzzyFilter`.
7. Fix inspect navigation so it does not wipe list search params; add `experienceId` / `stackId` / New jobs `applicationId`.

Hub/AI surfaces are unchanged except they may call `listPage` with `q` later; not required in v1. After dashboard UI ships, run [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) only if hub tools grow a “filter my skills” path in the same change; **this slice is list chrome**, not a new agent tool — skip the harness unless the plan adds hub tools.
