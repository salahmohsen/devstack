# Dashboard detect, lists, multi-select, Review removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship detached detect stacks (organize-like UX), fix detect/organize LLM scale hangs with Mastra-native patterns, floating multi-select, infinite dashboard lists, and remove Review queue in favor of on-the-fly mail reply with tools.

**Architecture:** Pattern-first on `main`: shared agent helpers → Mastra workflow foreach/progress → web detached AI job kit (detect mirrors organize) → shared floating batch UI → cursor `useInfiniteQuery` + `useInfiniteScroll` → Review vertical delete + mail send/generate rewire → hub audit/background tasks. DRY shared helpers; follow `apps/agent/AGENTS.md` and monorepo feature slices.

**Tech Stack:** Mastra workflows/agents (`@mastra/core`), TanStack Query infinite, oRPC, Drizzle/Neon, coss UI, sonner toasts, existing `shared/lib/ai-job`.

**Spec:** `docs/superpowers/specs/2026-08-13-dashboard-detect-lists-review-removal-design.md`

**Conventions (every task):**

1. Load **mastra** skill + verify APIs in embedded docs / Context7 before agent code.
2. Agent layout: `workflows/<name>-workflow/`, `lib/` for shared helpers, register in `index.ts` only.
3. Web: feature folders; no business logic in route files.
4. Shared contracts → `packages/core`.
5. DRY: no new copy-pasted timeout/chunk loops.
6. UI tasks: impeccable, coss, coss-particles, better-ui, transitions-dev.
7. Narrow validation per `.agents/workflow.md`; commit atomically on `main` when asked.
8. After non-trivial changes: code review subagent loop until solid.

---

## File map (create / modify)

### Agent

| Path                                                                                | Action                                                           |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/agent/src/mastra/lib/with-timeout.ts`                                         | **Create** — promote from organize `with-timeout.ts`             |
| `apps/agent/src/mastra/lib/workflow-progress.ts`                                    | **Create** — thin helpers for progress labels / writer if needed |
| `apps/agent/src/mastra/workflows/organize-stacks-workflow/with-timeout.ts`          | **Modify** — re-export from lib or delete after migrate          |
| `apps/agent/src/mastra/workflows/detect-stacks-workflow/ai-categorize.step.ts`      | **Modify** or split into prepare + foreach batch step            |
| `apps/agent/src/mastra/workflows/detect-stacks-workflow/index.ts`                   | **Modify** — foreach graph if steps split                        |
| `apps/agent/src/mastra/workflows/detect-stacks-workflow/utils.ts`                   | **Modify** — BATCH_TIMEOUT_MS, chunk constants                   |
| `apps/agent/src/mastra/workflows/organize-stacks-workflow/sort-stacks.step.ts`      | **Modify** / split foreach                                       |
| `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-renames.step.ts`     | **Modify** — timeout/progress DRY                                |
| `apps/agent/src/mastra/workflows/organize-stacks-workflow/find-enrichments.step.ts` | **Modify** — same                                                |
| `apps/agent/src/mastra/workflows/organize-stacks-workflow/index.ts`                 | **Modify** if graph changes                                      |
| `apps/agent/src/mastra/agents/mail-reply-agent.ts`                                  | **Modify** — more tools + instructions                           |
| `apps/agent/src/mastra/agents/hub-supervisor.ts`                                    | **Modify** — inventory, processors, background tasks, no weather |
| `apps/agent/src/mastra/index.ts`                                                    | **Modify** — registration only if new agents/tools               |

### Web

| Path                                                                | Action                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/web/src/features/stacks/lib/detect-stacks-job-store.ts`       | **Create**                                                   |
| `apps/web/src/features/stacks/api/detect-stacks-job.tsx`            | **Create**                                                   |
| `apps/web/src/features/stacks/api/detect-stacks.mutation.ts`        | **Modify** — share stream parser or deprecate for job module |
| `apps/web/src/pages/dashboard/projects/ui/project-form.tsx`         | **Modify** — detached detect UX                              |
| `apps/web/src/pages/dashboard/projects/ui/detect-stacks-dialog.tsx` | **Modify** — results-only when ready                         |
| `apps/web/src/pages/dashboard/projects/ui/*-repos-detect-dialog*`   | **Create** — menu pre-detect repos                           |
| `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`         | **Modify** — menu item                                       |
| `apps/web/src/shared/ui/batch-selection-bar.tsx`                    | **Modify** — floating variant                                |
| `apps/web/src/pages/dashboard/*/…` multi-select pages               | **Modify** — use floating bar                                |
| `apps/web/src/shared/hooks/use-infinite-scroll.ts`                  | **Create**                                                   |
| `apps/web/src/features/stacks/api/*list*` / stacks page             | **Modify** — infinite query                                  |
| Other list features                                                 | **Modify** — same pattern                                    |
| `apps/web/src/features/review/**`                                   | **Delete**                                                   |
| `apps/web/src/pages/dashboard/review/**`                            | **Delete**                                                   |
| Sidebar, command palette, mail page                                 | **Modify**                                                   |
| Mail reply generate/send hooks                                      | **Create/Modify**                                            |

### API / DB / Core / Server

| Path                                                 | Action                       |
| ---------------------------------------------------- | ---------------------------- |
| `packages/api/src/routers/stacks.router.ts` (+ repo) | Pagination                   |
| Other list routers                                   | Pagination                   |
| `packages/core` list page schemas                    | **Create/Modify**            |
| `packages/api/src/routers/review.router.ts`          | **Delete**                   |
| `packages/api/src/lib/review/*`                      | Relocate keep / delete queue |
| `packages/api/src/lib/mail/*`                        | Reply generate + send        |
| `packages/db` review schema + migration              | Drop carefully               |
| `apps/server/src/queues/run-mail-classify.ts`        | Remove auto-draft            |
| Notifications / AI settings                          | Trim autonomy / draft_ready  |

---

## Phase P0 — Shared timeout + detect categorize hang fix

### Task 1: Shared `with-timeout` lib

**Files:**

- Create: `apps/agent/src/mastra/lib/with-timeout.ts`
- Modify: organize imports of `with-timeout.ts` → lib
- Modify: detect `ai-categorize` / any `Promise.race` timeouts to use lib

- [ ] **Step 1:** Move `withTimeout` + `withTimeoutSignal` from organize to `lib/with-timeout.ts` unchanged.
- [ ] **Step 2:** Re-export from old path or update all imports (`rg with-timeout` under agent).
- [ ] **Step 3:** Run agent package check if available: `pnpm --filter @tsu-stack/agent check` (or project equivalent).
- [ ] **Step 4:** Commit: `refactor(agent): share withTimeoutSignal for workflow LLM steps`

### Task 2: Detect `ai-categorize` Mastra foreach + abort + progress

**Files:**

- Modify: `detect-stacks-workflow/ai-categorize.step.ts`, `utils.ts`, `index.ts`, schema as needed
- **Skills:** mastra skill; Context7 `/mastra-ai/mastra` foreach + abortSignal + writer

- [ ] **Step 1:** Read current `ai-categorize.step.ts` and installed docs for `.foreach`, `writer`, `agent.generate` options.
- [ ] **Step 2:** Lower `BATCH_TIMEOUT_MS` (e.g. 60_000); keep or slightly lower `BATCH_CHUNK_SIZE`.
- [ ] **Step 3:** Refactor to emit batch array then `.foreach(categorizeBatchStep, { concurrency: 2 })` **or** keep single step but use concurrent pool **plus** `withTimeoutSignal` + abort into generate + progress writer — prefer foreach if name-merge can be post-pass.
- [ ] **Step 4:** Pass `abortSignal` into `agent.generate`; on timeout abort local controller.
- [ ] **Step 5:** Emit progress (foreach progress or `writer.custom`) with chunk index/total.
- [ ] **Step 6:** Soft wall-clock for whole categorize; fallback remaining unknowns.
- [ ] **Step 7:** Ensure logs include event names searchable in Axiom.
- [ ] **Step 8:** Manual or unit: soft-fail path for empty unknown / missing model still works.
- [ ] **Step 9:** Commit: `fix(agent): make detect ai-categorize cancelable, chunked, and progressive`

---

## Phase P1 — Organize sort (and rename/enrich) scale

### Task 3: Organize sort via Mastra patterns + progress

**Files:**

- `organize-stacks-workflow/sort-stacks.step.ts`, `index.ts`, related schema
- Client organize job already has STEP_LABELS — extend for progress if custom events

- [ ] **Step 1:** Document current `aiImportanceOrder` behavior; keep ordinal sort + heuristics.
- [ ] **Step 2:** Restructure to prepare work items → `.foreach(sortChunkStep, { concurrency: 2|3 })` OR improve existing path with shared timeout (already) + **progress writer** + slightly smaller chunks if failures persist.
- [ ] **Step 3:** Map progress to organize toast step labels.
- [ ] **Step 4:** Align rename/enrich chunk timeouts to shared `withTimeoutSignal` + abortSignal into generate.
- [ ] **Step 5:** Test with large stack list (or unit reassembly); confirm soft notes still work.
- [ ] **Step 6:** Commit: `fix(agent): scale organize sort/rename/enrich LLM chunks with progress`

---

## Phase P2 — Detached detect UX

### Task 4: Detect job store + job runner

**Files:**

- Create: `detect-stacks-job-store.ts`, `detect-stacks-job.tsx`
- Modify: `features/stacks/index.ts` exports
- Reference: `organize-stacks-job.tsx`, `organize-stacks-job-store.ts`

- [ ] **Step 1:** Copy organize store shape; fields: status, stepLabel, runId, results, error, dialogOpen, projectId, startedAt, notes if any.
- [ ] **Step 2:** Implement `startDetectStacksJob({ projectId, repos })` with single-flight, detached controller, sticky toast, stream loop (from mutation).
- [ ] **Step 3:** Map progress events → stepLabel; on success set ready + dialogOpen; on empty success toast without dialog.
- [ ] **Step 4:** `cancelDetectStacksJob` only on explicit cancel.
- [ ] **Step 5:** Commit: `feat(web): detached detect-stacks job with toast progress`

### Task 5: Project form + results dialog wiring

**Files:**

- `project-form.tsx`, `detect-stacks-dialog.tsx`

- [ ] **Step 1:** Remove local AbortController cancel-on-sheet-close for detect.
- [ ] **Step 2:** Detect button: if running for this project → step + X; else start job from form repos (require id + repos).
- [ ] **Step 3:** Dialog controlled by global store `dialogOpen` + results; apply path unchanged (`upsertFromDetection` + stackIds).
- [ ] **Step 4:** Mount dialog at form **or** layout level so it works when form closed — prefer app/dashboard layout or projects page root so global.
- [ ] **Step 5:** Commit: `feat(web): project form uses detached detect job`

### Task 6: Project menu + repos dialog

**Files:**

- Project list actions / menu
- New dialog component for repos edit + save + start

- [ ] **Step 1:** Add menu item “Detect stacks”.
- [ ] **Step 2:** Dialog loads project repos; editable multi-select/list; Save → `projects.update` → `startDetectStacksJob`.
- [ ] **Step 3:** If job already running, toast; if ready, reopen results.
- [ ] **Step 4:** Commit: `feat(web): detect stacks from project menu with repos save`

---

## Phase P3 — Floating multi-select

### Task 7: Floating batch selection card

**Files:**

- `shared/ui/batch-selection-bar.tsx`
- stacks, projects, experiences, resumes, new-jobs, tracked-jobs list pages
- **Skills:** coss, better-ui, transitions-dev, impeccable

- [ ] **Step 1:** Add floating layout: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` card chrome (border, shadow, rounded, padding).
- [ ] **Step 2:** Replace inline bars on all multi-select pages; hide when sort mode.
- [ ] **Step 3:** Motion enter/exit; a11y `aria-label`; keyboard focus order OK.
- [ ] **Step 4:** Commit: `feat(web): floating bottom multi-select action card`

---

## Phase P4 — Infinite scroll

### Task 8: `useInfiniteScroll` hook

**Files:**

- Create: `apps/web/src/shared/hooks/use-infinite-scroll.ts` (+ export barrel if any)

- [ ] **Step 1:** IntersectionObserver on ref; call `fetchNextPage` when visible and `hasNextPage && !isFetchingNextPage`.
- [ ] **Step 2:** Options: root, rootMargin, enabled.
- [ ] **Step 3:** Commit: `feat(web): useInfiniteScroll hook for dashboard lists`

### Task 9: Stacks list pagination + infinite query

**Files:**

- Core schemas if needed
- `packages/db` stacks repo list method
- `packages/api` `stacks.list`
- `stacks-page.tsx`, route loader

- [ ] **Step 1:** Add `limit` + `cursor` input; return `{ items, nextCursor, totalCount? }`.
- [ ] **Step 2:** Wire `useInfiniteQuery`; flatten pages for grid; sentinel at bottom.
- [ ] **Step 3:** Keep batch selection across pages.
- [ ] **Step 4:** Prefetch first page only in route.
- [ ] **Step 5:** Commit: `feat: infinite scroll stacks list`

### Task 10: Roll infinite pattern to other dashboard lists

**Files:** projects, experiences, resumes, applications (new/tracked), mail as feasible

- [ ] **Step 1:** Same API shape per list; reuse hook.
- [ ] **Step 2:** Document any list that remains load-all with reason (tiny sets).
- [ ] **Step 3:** Commit per domain or one: `feat(web): infinite scroll for dashboard item lists`

---

## Phase P5 — Review removal + mail reply

### Task 11: Expand mail-reply agent tools

**Files:**

- `mail-reply-agent.ts`, tools already on hub (list/get experiences, projects, stacks, job prefs)
- `mail-reply-workflow` draft step if instructions change

- [ ] **Step 1:** Attach focused tools; update instructions (job context + profile tools; never send).
- [ ] **Step 2:** abortSignal + structuredOutput resilience per Mastra docs.
- [ ] **Step 3:** Commit: `feat(agent): mail-reply agent tools for full career context`

### Task 12: Mail UI generate + send (no Review)

**Files:**

- `mail-category-page.tsx` (and composer)
- API: generate ephemeral draft + send reply RPC
- Relocate `call-mail-reply-agent.ts` under `lib/mail/`

- [ ] **Step 1:** Generate fills local composer only.
- [ ] **Step 2:** Send uses `sendCareerReply` without `review_item`.
- [ ] **Step 3:** Remove “Queue for review” / navigate to Review.
- [ ] **Step 4:** Commit: `feat(mail): on-the-fly generate and send reply`

### Task 13: Remove Review surface + classify auto-draft

**Files:**

- Delete review web/api/core queue types as scoped
- `run-mail-classify.ts` remove auto draft/send
- Sidebar, command palette, notifications, AI settings autonomy
- DB migration drop FK + `review_item`

- [ ] **Step 1:** Remove routes/UI/nav.
- [ ] **Step 2:** Remove router + queue create/confirm paths.
- [ ] **Step 3:** Migration: drop `app_notification.review_item_id` FK/column if unused, drop `review_item`.
- [ ] **Step 4:** Keep job/career notifications → mail deep link.
- [ ] **Step 5:** Update CONTEXT.md / README only if required by repo norms (prefer minimal).
- [ ] **Step 6:** Commit: `feat!: remove career Review queue; notify opens mail`

---

## Phase P6 — Hub audit + background tasks + weather purge

### Task 14: Hub supervisor hygiene

**Files:**

- `hub-supervisor.ts`, `index.ts`, processors config
- **Skills:** mastra docs processors, background tasks, delegation

- [ ] **Step 1:** Inventory tools/workflows vs product; remove weather leftovers anywhere.
- [ ] **Step 2:** Add TokenLimiter / ToolCallFilter if available in version.
- [ ] **Step 3:** messageFilter on delegation; confirm maxSteps/approval still correct.
- [ ] **Step 4:** Enable **background tasks** for long workflows if docs + storage allow; otherwise document skip in commit message.
- [ ] **Step 5:** Commit: `feat(agent): hub capability audit and long-job background tasks`

---

## Phase P7 — Verification + review loop

### Task 15: End-to-end verification

- [ ] **Step 1:** Detect: large unknown set completes; cancel works; form edit + close sheet keeps toast; menu path saves repos.
- [ ] **Step 2:** Organize: large stack sort completes with progress.
- [ ] **Step 3:** Floating bar on all multi-select pages while scrolling.
- [ ] **Step 4:** Infinite stacks (and others) load more on scroll.
- [ ] **Step 5:** No `/dashboard/review`; mail generate + confirm send; notification opens mail.
- [ ] **Step 6:** Dispatch code-review subagents on diff vs main; fix until solid.
- [ ] **Step 7:** Final commit if fixes needed.

---

## Planning clarifications (from spec review)

| Topic                                | Rule                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty detect results                 | **No dialog** — success toast only (spec §3 overrides “always dialog” for empty/no-changes).                                                                                                                                                                                                                      |
| Detect single-flight while `running` | Toast “Detection already running” (or focus existing toast); do not start a second job.                                                                                                                                                                                                                           |
| List pagination API                  | Prefer **`list` → `{ items, nextCursor, totalCount? }`** and migrate callers. Keep a **full-list path** for pickers (`stack-selector`, comboboxes) via `listAll` **or** high-limit list + separate query key — decide in Task 9 after grepping consumers; do not break optimistic `setQueryData` shapes silently. |
| Select all + infinite scroll         | **Select all = all currently loaded rows only**; label e.g. “Select all loaded (N)”. No server-side select-entire-catalog in this program.                                                                                                                                                                        |
| Weather purge                        | Grep + delete remnants only; not a large feature.                                                                                                                                                                                                                                                                 |
| Mail path                            | Explicit replace: generate → local composer → confirm → `sendCareerReply`; touch mail page, classify auto-draft, `mailReplyAutonomy`, notification kinds.                                                                                                                                                         |

## Execution notes

- Work on **`main`** as requested; small atomic commits.
- Prefer **subagent-driven-development** per phase with review between tasks.
- If plan is too large for one session: stop after a completed phase boundary (P0–P6). Hang fix (P0–P1) ships value even if later phases wait.
- Infinite scroll page size default: start **24–40** items (tune per list density).
- Detect job dialog host: must live outside ProjectForm unmount tree (projects page or dashboard shell).
