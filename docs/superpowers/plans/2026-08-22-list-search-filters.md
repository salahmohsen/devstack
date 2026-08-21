# List search, filters, and palette find — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship search (`q`) + Cubby facet chips + display sort on the six dashboard lists, URL-shareable via RSQL, plus authenticated command-palette entity jumps.

**Architecture:** `@tsu-stack/core` owns the AST, RSQL print/parse, and per-resource allowlists. API compiles to Drizzle on `listPage` (jobs get a new `listPage`; Tracked board is a second capped query). Web remaps Cubby Filters onto `@tsu-stack/ui`, drives TanStack `validateSearch`, and injects `search.entities` into the existing palette.

**Tech Stack:** Zod, Drizzle, oRPC, TanStack Router search, TanStack Query infinite, Cubby Filters (copy-own, lucide), `match-sorter` via `useFuzzyFilter`.

**Spec:** `docs/superpowers/specs/2026-08-22-list-search-filters-design.md`

**Branch:** Implement only on `feat/list-search-filters` (git worktree). Do not commit implementation to `main`.

**Conventions (every task):**

1. Follow [`.agents/end-to-end-features.md`](../../../.agents/end-to-end-features.md): core → api → web query wrappers → UI.
2. Follow [`.agents/core.md`](../../../.agents/core.md), [`.agents/orpc.md`](../../../.agents/orpc.md), [`.agents/tanstack-patterns.md`](../../../.agents/tanstack-patterns.md), [`.agents/ui.md`](../../../.agents/ui.md).
3. UI: load **better-ui** + **impeccable** + **coss** before visual work.
4. Tests: only where this plan says so (core compiler). Do not add e2e. Repo [testing.md](../../../.agents/testing.md).
5. After every task: `vp check` in each touched package (`packages/core`, `packages/ui`, `packages/api`, `packages/db`, `apps/web` as applicable). Fix format/lint/type errors before commit.
6. After multi-package slices (tasks 5–8): also `vp run -w fix` if `vp check` is not enough.
7. Conventional commits, subject ≤72 chars, body lines ≤100 chars.
8. Do not extend `packages/api/src/routers/portfolio.queries.ts` `parseRsql`.
9. Do not use nuqs for these six list routes.

---

## File map

| Path                                                     | Role                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `packages/core/src/list-query/*`                         | AST, RSQL, allowlists, leaf adapter, URL helpers, `ListQueryInputSchema`                                 |
| `packages/core/src/list-query/__tests__/rsql.test.ts`    | Print/parse/allowlist/seed tests                                                                         |
| `packages/db` repositories                               | `findPageByUserId` gains query opts; applications `findPageByUserId`                                     |
| `packages/api/src/lib/list-query/compile.ts`             | AST → Drizzle `SQL` per resource                                                                         |
| `packages/api` routers                                   | Extend `listPage` / resume `list`; `applications.listPage` + `applications.listBoard`; `search.entities` |
| `packages/ui/components/filters/*`                       | Remapped Cubby Filters                                                                                   |
| `packages/ui/hooks/use-fuzzy-filter.ts`                  | `match-sorter` wrapper                                                                                   |
| `apps/web/src/widgets/items-page/ui/list-search-bar.tsx` | Shared chrome                                                                                            |
| `apps/web/src/widgets/items-page/lib/list-search.ts`     | `validateSearch` helper, debounce, seed intercept                                                        |
| Six dashboard routes + pages                             | Wire bar, query inputs, empty states                                                                     |
| `apps/web/src/shared/lib/command-palette/*`              | Entity hits                                                                                              |

---

### Task 1: Preserve inspect search params

**Files:**

- Create: `apps/web/src/shared/lib/list-inspect-search.ts`
- Modify: `apps/web/src/pages/dashboard/projects/ui/project-page.tsx` (navigate after `projectId`)
- Modify: `apps/web/src/pages/dashboard/resumes/resume-page.tsx`
- Modify: `apps/web/src/pages/dashboard/tracked-jobs/tracked-jobs-page.tsx`
- Modify: `apps/web/src/routes/(root-layout)/__protected/dashboard/experiences/index.tsx`
- Modify: `apps/web/src/routes/(root-layout)/__protected/dashboard/skills/index.tsx` (live Skills route; `stacks/index.tsx` only redirects — do **not** put `validateSearch` there)
- Modify: `apps/web/src/routes/(root-layout)/__protected/dashboard/new-jobs/index.tsx`
- Modify: matching pages if they navigate with `search: {}`

**Context:** Spec: never `search: {}`. After opening inspect from `?projectId=` (etc.), replace URL by **omitting only the inspect key**, keep future `q`/`filter`/`sort`.

- [ ] **Step 1:** Add helper

```ts
/** Drop one search key; keep the rest (q, filter, sort, …). */
export function omitSearchKey<T extends Record<string, unknown>>(search: T, key: keyof T): T {
  const next = { ...search };
  delete next[key];
  return next;
}
```

- [ ] **Step 2:** Replace every dashboard inspect cleanup `search: {}` with `search: omitSearchKey(current, "projectId" | "resumeId" | "applicationId")`. Use `useSearch()` / route `useSearch()` for `current`.

- [ ] **Step 3:** Add optional inspect ids to route `validateSearch` (string, omit if empty):

  - experiences: `experienceId`
  - skills (`/dashboard/skills` route file `skills/index.tsx`): `stackId`
  - new-jobs: `applicationId`

  Keep existing `projectId` / `resumeId` / tracked `applicationId`. Do **not** add `q`/`filter` yet.

- [ ] **Step 4:** On experiences / skills / new-jobs pages, if the inspect id is in search, open the panel (same pattern as projects), then `replace` with `omitSearchKey`.

- [ ] **Step 5:** `vp check` in `apps/web`. Commit:

```bash
git add apps/web/src/shared/lib/list-inspect-search.ts apps/web/src/pages/dashboard apps/web/src/routes
git commit -m "fix: keep list search params when opening inspect"
```

---

### Task 2: Core list-query AST + RSQL (TDD)

**Files:**

- Create: `packages/core/src/list-query/types.ts`
- Create: `packages/core/src/list-query/rsql.ts`
- Create: `packages/core/src/list-query/allowlists.ts`
- Create: `packages/core/src/list-query/leaves.ts`
- Create: `packages/core/src/list-query/index.ts`
- Create: `packages/core/src/list-query/__tests__/rsql.test.ts`
- Modify: `packages/core/src/index.ts` — `export * from "#@/list-query/index"`
- Modify: `packages/core/src/experience/types.ts`, `project/types.ts`, `stack/types.ts` — extend `*ListPageInputSchema` with list-query fields
- Modify: `packages/core/src/application/types.ts` — add `ApplicationListPageInputSchema` / output; extend resume list input in `resume/types.ts`

**TDD:** tests first in `packages/core`.

- [ ] **Step 1: Failing tests** in `packages/core/src/list-query/__tests__/rsql.test.ts` covering:

  - Round-trip: `is_any_of` → `=in=` → leaves
  - `contains` → `=ilike=`
  - `is_empty` → `==null`
  - `between` two bounds → one `=between=(min,max)` leaf (not two chips)
  - one-sided `matchScore>=3` → between chip `max: null`
  - unknown field on `skills` allowlist → throw `ListQueryError`
  - New jobs `trackingStatus==tracked` → throw
  - `outcome=unrestricted=` allowed only on tracked
  - incomplete leaf (`is_any_of` + `[]`) omitted from print
  - `filterValuesToAst` AND of complete leaves

- [ ] **Step 2:** Run `vp run -F @tsu-stack/core test:unit -- src/list-query` (or package `test:unit` filter). Expect FAIL (module missing).

- [ ] **Step 3: Types** (`types.ts`):

```ts
export type ListQueryCombinator = "and" | "or";
export type ListQueryOp =
  | "eq"
  | "neq"
  | "in"
  | "out"
  | "ilike"
  | "nilike"
  | "istart"
  | "iend"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "between"
  | "empty"
  | "not_empty"
  | "unrestricted";

export type ListQueryAst =
  | { type: "and" | "or"; children: ListQueryAst[] }
  | { type: "cmp"; field: string; op: ListQueryOp; args: string[] };

export type FilterLeaf = {
  id: string;
  field: string;
  operator: string; // Cubby id: is, is_any_of, is_empty, between, …
  value: unknown;
};

export const ListQueryInputSchema = z.object({
  q: z.string().trim().max(200).optional(),
  filter: z.string().max(4000).optional(),
  sortBy: z.string().max(64).optional(),
  sortDir: z.enum(["asc", "desc"]).optional()
});

export class ListQueryError extends Error {
  readonly status = 400;
}
```

Map Cubby operators ↔ `ListQueryOp` / RSQL tokens exactly as the spec table (`=between=`, `=unrestricted=` as `outcome=unrestricted=`).

- [ ] **Step 4: Allowlists** (`allowlists.ts`) — one object per resource: `fields`, `ops` per field, `qColumns`, `sortKeys`, `partition` (`new-jobs` | `tracked-jobs` | `catalog`). Include spec field ids: `includedInPortfolio`, `isFeatured`, `type`, `projects`, `stacks`, `tiedToJob`, `trackingStatus`, `outcome`, `stage`, `sourceTags`, `listingClosed`, `matchScore`.

- [ ] **Step 5: Parser/printer + leaves** — implement until tests pass. Do not import Drizzle. Do not reuse portfolio parser.

- [ ] **Step 6:** Merge `ListQueryInputSchema` into existing `ExperienceListPageInputSchema` (and project/stack) via `.extend`. Add `ApplicationListPageInputSchema` = list-query + `cursor` + `limit` + **`scope: z.enum(["new-jobs", "tracked-jobs"])`** (required). Do **not** take client `trackingStatus` as the list partition (today’s `list` default `"tracked"` would leak CRM into New jobs). Resume `list` input: list-query fields optional.

- [ ] **Step 7:** `vp check` in `packages/core`. Commit:

```bash
git commit -m "feat: add list-query AST and RSQL in core"
```

---

### Task 3: Cubby Filters remapped in `packages/ui`

**Files:**

- Modify: `packages/ui/components.json` — add `"@cubby-ui": "https://www.cubby-ui.dev/r/{name}.json"`
- Create: `packages/ui/components/filters/**` (from CLI, then remap)
- Create: `packages/ui/hooks/use-fuzzy-filter.ts`
- Modify: `packages/ui/package.json` — `match-sorter` if CLI does not add it

- [ ] **Step 1:** From `packages/ui`:

```bash
pnpm dlx shadcn@latest add @cubby-ui/filters @cubby-ui/use-fuzzy-filter
```

If the registry URL fails, copy from https://www.cubby-ui.dev/docs/components/filters (manual section in the spec session) into `packages/ui/components/filters/`.

- [ ] **Step 2:** Remap imports to `@tsu-stack/ui/components/{button,badge,input,combobox,dropdown-menu,kbd,number-field}` and `Group` from `group.tsx` instead of Cubby `ButtonGroup`. Lucide icons (`Plus`, `X`) instead of Hugeicons. Drop `@hugeicons/*`. Map Cubby `size` button variants onto existing Button sizes (`sm` / `default` / `lg` / `icon`).

- [ ] **Step 3:** `useFuzzyFilter` in `packages/ui/hooks/use-fuzzy-filter.ts` wrapping `match-sorter` as in Cubby docs.

- [ ] **Step 4:** Export filters from a barrel `packages/ui/components/filters/index.ts`.

- [ ] **Step 4b:** After `shadcn add`, delete vendored Cubby copies of button/combobox/hugeicons (`registryDependencies`). Keep `filters/*` + `use-fuzzy-filter`. Button sizes: map Cubby `icon_sm` / `icon_lg` to this repo’s `icon-sm` / `icon-lg`. This repo’s Button has no `leadingIcon` — use children / `render`.

- [ ] **Step 5:** `vp check` in `packages/ui`. Commit:

```bash
git commit -m "feat: add remapped Cubby filters to ui package"
```

---

### Task 4: Web list-search chrome (no page wiring yet except types)

**Files:**

- Create: `apps/web/src/widgets/items-page/lib/list-search.ts`
- Create: `apps/web/src/widgets/items-page/ui/list-search-bar.tsx`
- Create: `apps/web/src/widgets/items-page/lib/list-search-fields.ts` (shared Cubby field factories: portfolio boolean, etc.)
- Modify: `apps/web/src/widgets/items-page/index.ts` — export bar + helpers
- Modify: `apps/web/src/shared/ui/header-actions.tsx` — disable Reorder when `reorderDisabled?: boolean`

**Context:** Bar reads TanStack search via callbacks (do not import every route). Pages pass `fields`, `value`, `onValueChange`, `q`, `onQChange`, `sortBy`, `sortOptions`, `onSortChange`, `narrowed`, empty copy handled by pages.

- [ ] **Step 1:** `parseListSearch(raw)` using Zod: `q`, `filter`, `sortBy`, `sortDir` + pass-through inspect ids. Used by all six `validateSearch` later.

```ts
export const ListSearchSchema = z.object({
  q: z.string().optional(),
  filter: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  // Inspect ids — keep on the same schema so later validateSearch does not strip Task 1 keys
  projectId: z.string().optional(),
  resumeId: z.string().optional(),
  applicationId: z.string().optional(),
  experienceId: z.string().optional(),
  stackId: z.string().optional()
});
```

- [ ] **Step 2:** `ListSearchBar` — search `Input` (debounce 300ms via `useDebouncedValue`), `<Filters>` from `@tsu-stack/ui/components/filters`, native/`Select` sort. `allowDuplicateFields={false}`. Incomplete chips stay in local Cubby state until complete, then parent writes RSQL via `printRsql(filterValuesToAst(leaves), resource)`.

- [ ] **Step 3:** Jobs seed helpers in `list-search.ts`: `NEW_JOBS_SEED = "trackingStatus==inbox"`, `TRACKED_SEED = "outcome==null"`, `NEW_JOBS_ALL = "trackingStatus=in=(inbox,dismissed)"`, `TRACKED_ALL = "outcome=unrestricted="`. `resolveJobsFilterParam({ page, filter })` implements omit → seed.

  **Clear vs remove-last-chip (required):** Cubby Clear and removing the last chip both yield `[]`. Do **not** treat every `[]` as seed.

  - **Remove last chip / `onValueChange([])` from chips:** write page-scoped **all** (`NEW_JOBS_ALL` / `TRACKED_ALL`).
  - **Clear control:** do not use default `FilterClearButton` on jobs. Custom Clear calls `onClear` → write **seed** RSQL (and drop `q`).
  - Catalogs: `[]` omits `filter`.

- [ ] **Step 4:** `HeaderActions` `sort.reorderDisabled` hides/disables Reorder when true.

- [ ] **Step 4b:** `astToFilterValues`: `outcome=unrestricted=` is **not** a chip; keep other leaves.

- [ ] **Step 5:** `vp check` in `apps/web` and `packages/ui`. Commit:

```bash
git commit -m "feat: add list search bar widget"
```

---

### Task 5: Skills listPage + Projects chip + project jump

**Files:**

- Modify: `packages/db/src/repositories/stack.repository.ts` — `findPageByUserId` accepts `{ q, filter, sortBy, sortDir }` and applies compiled SQL; `totalCount` uses same where; cursor keyset follows active sort
- Create: `packages/api/src/lib/list-query/compile.ts` — `compileListQuery({ resource, userId, ast, q })` → `SQL | undefined`
- Modify: `packages/api/src/routers/stacks.router.ts` — parse `filter` with skills allowlist; `ListQueryError` → oRPC 400
- Modify: `apps/web/src/pages/dashboard/stacks/api/list-stacks-page.query.ts` — pass search into infinite `input`
- Modify: `apps/web/src/routes/(root-layout)/__protected/dashboard/skills/index.tsx` — `validateSearch` with list search + `stackId` (not the stacks redirect)
- Modify: `apps/web/src/pages/dashboard/stacks/stacks-page.tsx` — `ListSearchBar`; empty state branch; disable reorder when narrowed
- Modify: `apps/web/src/widgets/items-page/ui/project-info-panel.tsx` — dashboard-only “View skills” `Link` to `/dashboard/skills?filter=projects=in=(id)`

**Compile notes:** `projects=in=` → `EXISTS` on `project_stack`. `includedInPortfolio` → `portfolioEntryId IS NOT NULL`. `q` on skills: `name ILIKE` **OR** `EXISTS (SELECT 1 FROM jsonb_array_elements_text(alternative_names) AS alias(name) WHERE alias.name ILIKE …)` — wrap the set-returning function in `EXISTS` or skill rows duplicate and keyset/`totalCount` break. Compile in `packages/api` to Drizzle `SQL`; repositories accept `SQL` + sort, they must **not** re-parse RSQL. Disable Cubby `includes_all` on relation chips (`disabledOperators: ["includes_all"]`). Portfolio booleans must not use `is_empty`.

- [ ] **Step 1:** Implement `compile.ts` for `skills` only (other resources can throw “not implemented” until later tasks). Map `ListQueryError` in stacks router.

- [ ] **Step 2:** Repository: AND userId + compile where; sort `sortOrder` default else `name`/`projectCount`/`updatedAt`; keyset on those columns + `id`.

- [ ] **Step 3:** Infinite query key includes `q`/`filter`/`sortBy`/`sortDir`. Reset on change (new key).

- [ ] **Step 4:** Skills page chrome + Projects multiselect options from `orpcQueryClient.projects.list`. Type select from `STACK_TYPE_ORDER`. Featured + portfolio booleans.

- [ ] **Step 5:** 400 on bad filter: toast, omit `filter` (catalog rule).

- [ ] **Step 6:** View skills on project inspect (dashboard only, not public panel): `<Link to="/dashboard/skills" search={{ filter: \`projects=in=(${id})\` }} />`. Do **not** put `?filter=`on`to`.

- [ ] **Step 7:** `vp check` in `packages/db`, `packages/api`, `apps/web`. Commit:

```bash
git commit -m "feat: filter and search skills list"
```

---

### Task 6: Experiences, projects, resumes

**Files:**

- Modify: `experience.repository.ts`, `project.repository.ts`, `resume.repository.ts`
- Modify: `experiences.router.ts`, `projects.router.ts`, `resume.router.ts`
- Modify: `compile.ts` — those resources
- Modify: page queries, routes `validateSearch`, pages + `ListSearchBar`
- Projects Skills chip options: `stacks.list`
- Experiences: no inspect jump required beyond task 1 `experienceId`

- [ ] **Step 1:** Compile + repos + routers for the three resources. Resume stays full `list` with where/sort (no cursor). Resume `q` / `tiedToJob` must use the same linked-job definition as `withLinkedJobs` (`application.resumeId` **and** apply-package prompt ids), not `resumeId` alone.

- [ ] **Step 1b:** Same UX as Skills: 400 → omit `filter`; narrowed empty + Clear; reorder disabled when narrowed; catalog **Default** sort omits `sortBy`/`sortDir`. Default `sortDir`: desc for dates/score/`fromDate`/`year`/`updatedAt`; asc for `title`/`name`.

- [ ] **Step 2:** Wire three pages. Projects inverse `stacks=in=`. Resume `tiedToJob` `is_empty`.

- [ ] **Step 3:** `vp check` touched packages. Commit:

```bash
git commit -m "feat: filter experiences, projects, and resumes"
```

---

### Task 7: Applications listPage, New jobs, Tracked jobs

**Files:**

- Modify: `packages/db/src/repositories/application.repository.ts` — `findPageByUserId`, `findBoardByUserId` (cap 200, always `outcome IS NULL` extra AND)
- Modify: `packages/core/src/application/types.ts` — page schemas, board output
- Modify: `packages/api/src/routers/applications.router.ts` — `listPage`, `listBoard`; keep `list` for hub/pickers
- Modify: `compile.ts` — jobs; `sourceTags` as `text[]` overlap; `listingClosed` via `job_posting.closedAt` / existing listingClosed helper; `matchScore` `DESC NULLS LAST`. **Board compile:** strip **all `outcome` leaves** (including `unrestricted`) from the AST, then AND `outcome IS NULL`. Do not `AND` URL outcome with `IS NULL` (that empties the board on closed/all-tracked). Other chips + `q` + sort still apply.
- Modify: every applications mutation invalidation (`applicationsQueryKeys.list`, hub tools, new-jobs/tracked pages) — also invalidate `listPage` infinite keys and `listBoard` keys. Keep `applications.list` for hub/pickers.
- Modify: `apps/web/src/features/applications` query wrappers
- Modify: `new-jobs-page.tsx` — drop inbox/dismissed **tabs**; seed chip; `listPage` infinite; counts on tracking options
- Modify: `tracked-jobs-page.tsx`, `ui/list.tsx`, `ui/board.tsx` — drop `listFilter` store; list uses `listPage`; board uses `listBoard` with same `q`/`filter`/`sort` (server still forces open)
- Modify: new-jobs + tracked-jobs routes `validateSearch` + loaders
- Modify: `application.slice.ts` — remove `listFilter` if unused

**Jobs URL:** implement spec lock exactly (`omit` → replace seed; all-tracked `outcome=unrestricted=`; New jobs always has `trackingStatus` leaf; Clear intercepts to seed).

**Empty:** not narrowed → existing empty inbox/board; narrowed → “No jobs match” + Clear (re-seed).

**Board cap:** if `totalCount > 200`, show notice; do not paint closed cards.

- [ ] **Step 1:** DB + compile + `listPage`/`listBoard` procedures. Input `scope: "new-jobs" | "tracked-jobs"` (not optional `trackingStatus`). Compile **always** ANDs the partition: new-jobs → `trackingStatus IN ('inbox','dismissed')`; tracked list **and** `listBoard` → `trackingStatus = 'tracked'`. Then apply RSQL chips. Never AND a client `trackingStatus: "inbox"` onto the query (that would make dismissed/all become inbox-only). `listBoard` keeps the tracked partition **and** `outcome IS NULL` after stripping outcome leaves — `outcome IS NULL` alone would include inbox rows. `matchScore DESC NULLS LAST` keyset must encode null scores (or later pages skip/repeat).

- [ ] **Step 2:** New jobs UI (no tabs). Compose `FiltersProvider` + `FiltersBar` children (chips + add + **custom** Clear) so default `FilterClearButton` does not turn last-chip-remove into seed. `listingClosed` WHERE uses `job_posting.closedAt` via `postingId`. Sort key `company` → `companyName`. Route loaders use `loaderDeps` on `q`/`filter`/`sort*` so prefetch matches the query key.

- [ ] **Step 3:** Tracked list + board queries.

- [ ] **Step 4:** 400 → write **seed** RSQL (not omit).

- [ ] **Step 5:** `vp check` + `vp run -w fix` if needed. Commit:

```bash
git commit -m "feat: paginated filtered new and tracked jobs"
```

---

### Task 8: Palette `search.entities`

**Files:**

- Modify: `packages/core` — `SearchEntitiesInputSchema` / output
- Modify: `packages/api` — `search.entities` `protectedProcedure` (new small router or under a `search` key on `appRouter`)
- Modify: `apps/web/src/shared/lib/command-palette/types.ts` — optional
- Modify: `apps/web/src/widgets/layout/ui/command-palette.tsx` and `use-command-palette.ts` — thread the input `q` into `useCommandItems(q)` (today it takes no query). Fetch `search.entities` when signed in and `q.trim().length >= 2`.
- Modify: `use-command-items.ts` — merge entity hits
- Modify: `command-palette.tsx` — pass query into items hook; `useFuzzyFilter` on combined items. Command is Base UI Autocomplete, **not** cmdk: do not assume `filter={null}`. Pre-filter with fuzzy, then disable Autocomplete’s default string filter (pass a pass-through / `always true` filter, or feed already-filtered `items`). Add the six entity labels to `GROUP_ORDER`.
- Modify: `CommandAction` navigate variant: add `search?: Record<string, string>`. `handleItemClick` must `router.navigate({ to, params, search })`. Do **not** glue `?stackId=` onto `to` — TanStack will not parse it as `validateSearch`.

**Search:** cap 8 per type. `inbox_job` = inbox+dismissed. `tracked_job` = tracked. Navigate with `to: "/dashboard/skills"` and `search: { stackId }` (etc.). Guest never calls.

- [ ] **Step 1:** Procedure + compile `q` ILIKE per type (no RSQL).

- [ ] **Step 2:** Palette UI + fuzzy rank. Empty copy already handles 1-char.

- [ ] **Step 3:** `vp check` + `vp run -w fix`. Commit:

```bash
git commit -m "feat: add authenticated palette entity search"
```

---

## Manual verification (after task 8)

- Six pages: `q`, chips, sort, URL share, refresh.
- Inspect id + filters together (strip only id).
- Project → View skills.
- New jobs cannot chip `tracked`; remove seed → both; Clear → inbox seed.
- Tracked board never shows closed; list can.
- Palette signed-in vs guest.
- Reorder disabled while narrowed.
- `vp run -w fix` clean.

## Out of plan

Nested group UI, ReUI Filters, portfolio RSQL, e2e, hub tools, ai-feature-harness (not a hub tool slice).
