# Dashboard detect, lists, multi-select, Review removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Logging:** This plan explicitly requires durable logging when you find a gap. Read **Logging mandate** below; follow [`.agents/logging.md`](../../../.agents/logging.md). Add/fix loggers when needed, then continue the main task.

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
9. **Logging is in scope for this plan** — if you touch or discover a path that should have durable logs and doesn’t (or logs poorly), **add/fix loggers using the rules below, then continue the main task**. Do not open a separate ticket and skip logging. Full policy: [`.agents/logging.md`](../../../.agents/logging.md).

---

## Logging mandate (every implementing agent)

**Rule:** While implementing any task in this plan, if you find workflow steps, RPCs, queues, job runners, or other server/agent outcomes that lack useful durable logs (or only have `console.*` / silent catches), **add proper loggers before or as part of finishing that task**, then continue. Do not strip temporary debug noise into production; replace with structured wide events.

### Source of truth

- Monorepo: [`.agents/logging.md`](../../../.agents/logging.md)
- Agent: `createAgentLogger` from `apps/agent/src/mastra/agent-logger.ts` (wraps `@tsu-stack/logger/server`)
- Never import `evlog` directly from features; use `@tsu-stack/logger` / `@tsu-stack/logger/server` (or agent helper).

### When you MUST add or fix logs (this program)

| Situation                                                                                           | Action                                                                                  |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| LLM step / workflow step with soft-fail or timeout (detect categorize, organize sort/rename/enrich) | Wide event: start context + **one** completed/failed emit with counts, duration, reason |
| Stream/job hang or cancel path                                                                      | Log cancel, abort, soft wall-clock completion with `reason`                             |
| New mail `generateReply` / `sendReply`                                                              | Outcome logs: success/fail, messageId (id only), no bodies/secrets                      |
| Migration / destructive Review removal                                                              | Lifecycle log on migration if pattern exists; otherwise skip client noise               |
| Silent `catch` that swallows errors                                                                 | At least `ERROR`/`WARN` with stable `event` + safe fields, or rethrow to global handler |
| Existing `createAgentLogger` / `createLogger` patterns nearby                                       | **Match them** (same `operation` naming, field style)                                   |

### When NOT to log

- Routine successful HTTP/query noise, React renders, hover, navigation.
- “Reached line X” breadcrumbs that aren’t outcomes.
- Client-side spam; client logs are rare (errors / failed important workflows only; never in render).

### Best practices (do this every time)

1. **Facade only:** `@tsu-stack/logger/server` or `createAgentLogger({ operation: "agent__…" })`. No direct `evlog` in app code.
2. **Wide events, emit once:** Create logger at operation start → `set({ … })` as you go → **one** `emit()` on success; on failure `error(...)` then `emit({ _forceKeep: true })` if needed. Never `set`/`emit` after emit (sealed instance).
3. **Log outcomes, not intentions:** Prefer `detect_stacks_ai_categorize_completed` over “starting categorize”. Include `durationMs`, counts, `reason` for soft-fails.
4. **Stable `event` names** + structured fields — not interpolated message strings as the only data.
5. **Levels:** `INFO` sparse business outcomes; `WARN` degraded but expected (soft-fail chunk); `ERROR` failed op; avoid permanent `DEBUG` in product paths.
6. **Request handlers:** Use middleware/request-scoped logger when available; don’t double-wrap request loggers.
7. **Sensitive data:** Never log API keys, tokens, cookies, raw mail bodies, full LLM prompts with secrets. For BYO use `llmLogFields()` / `modelId` + `hasByoApiKey` only.
8. **Agent operations:** Prefer `operation: "agent__<domain>_<action>"` and events like `organize_stacks_sort_completed` (see existing detect/organize steps).
9. **API server:** Prefer existing request logger + outcome fields; don’t duplicate middleware errors.
10. **If unsure:** Read `.agents/logging.md` and copy the nearest sibling workflow step’s logger shape rather than inventing a new style.

### Minimal agent-step pattern (copy shape)

```ts
const started = Date.now();
const log = createAgentLogger({ operation: "agent__detect_stacks_ai_categorize" });
try {
  // ... work; log.set({ chunkIndex, unknownCount }) as needed
  log.set({
    event: "detect_stacks_ai_categorize_completed",
    unknownCount,
    categorizedCount,
    durationMs: Date.now() - started,
    reason: "ok" // or soft-fail reason
  });
  log.emit();
} catch (error) {
  log.error(error instanceof Error ? error : new Error(String(error)), {
    event: "detect_stacks_ai_categorize_failed"
  });
  log.emit({ _forceKeep: true });
  throw error; // or soft-fail per product rules
}
```

### Task handoff checklist (implementers)

Before marking a task done, ask:

- [ ] Did I touch a long-running / AI / mail / migration path? If yes, does it emit a searchable Axiom-friendly outcome?
- [ ] Are soft-fails visible (`reason`, counts) without logging secrets?
- [ ] No `console.log` left for production diagnosis?
- [ ] Main task still complete — logging was additive, not a distraction rewrite?

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
- [ ] **Step 3:** From `apps/agent`: `vp check` (package-local; see `.agents/workflow.md`).
- [ ] **Step 4:** Commit: `refactor(agent): share withTimeoutSignal for workflow LLM steps`

### Task 2: Detect `ai-categorize` Mastra foreach + abort + progress

**Files:**

- Modify: `detect-stacks-workflow/ai-categorize.step.ts`, `utils.ts`, `index.ts`, schema as needed
- Create if useful: `apps/agent/src/mastra/lib/workflow-progress.ts` (or keep progress emit inline)
- **Skills:** mastra skill; Context7 `/mastra-ai/mastra` foreach + abortSignal + writer

**Progress event contract (agent → web):** Prefer Mastra `workflow-step-progress` when using foreach (`completedCount` / `totalCount`). Additionally or alternatively emit custom writer chunks `{ type: "data-detect-progress", chunkIndex, chunkTotal, unknownTotal, label }` mapped client-side to `stepLabel` e.g. `Categorizing packages 26–50 of 120…`. Task 4 must handle these (organize only maps `workflow-step-start` today).

- [ ] **Step 1:** Read current `ai-categorize.step.ts` and installed docs for `.foreach`, `writer`, `agent.generate` options.
- [ ] **Step 2:** Lower `BATCH_TIMEOUT_MS` (e.g. 60_000); keep or slightly lower `BATCH_CHUNK_SIZE`.
- [ ] **Step 3:** Refactor to emit batch array then `.foreach(categorizeBatchStep, { concurrency: 2 })` **or** keep single step but use concurrent pool **plus** `withTimeoutSignal` + abort into generate + progress writer — prefer foreach if name-merge can be post-pass.
- [ ] **Step 4:** Pass `abortSignal` into `agent.generate`; on timeout abort local controller.
- [ ] **Step 5:** Emit progress per contract above.
- [ ] **Step 6:** Soft wall-clock for whole categorize (**under ~310s proxy kill**, target ~240–280s total); fallback remaining unknowns so stream can finish cleanly.
- [ ] **Step 7:** Step **`retries`** (1–2) on LLM batch step if supported; **`structuredOutput` errorStrategy fallback** (or equivalent soft schema fail) — verify on installed Mastra and apply.
- [ ] **Step 8:** Name-critical path: **post-merge display-name reuse after foreach**, or run categorize concurrency **1** if concurrent `usedNames` is unsafe.
- [ ] **Step 9:** Ensure logs include event names searchable in Axiom.
- [ ] **Step 10:** Manual or unit: soft-fail path for empty unknown / missing model still works.
- [ ] **Step 11:** Commit: `fix(agent): make detect ai-categorize cancelable, chunked, and progressive`

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
- [ ] **Step 2:** Implement `startDetectStacksJob({ projectId, repos })` with single-flight, detached controller, sticky toast, stream loop (from mutation). While `running`, second start → toast only (no second job).
- [ ] **Step 3:** Map `workflow-step-start` **and** progress contract from Task 2 (`workflow-step-progress` / `data-detect-progress`) → `stepLabel`; on success with reviewable stacks set ready + dialogOpen; on empty/no-changes success toast without dialog.

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
- Multi-select pages (all six):
  - `apps/web/src/pages/dashboard/stacks/stacks-page.tsx`
  - `apps/web/src/pages/dashboard/projects/ui/project-page.tsx`
  - `apps/web/src/pages/dashboard/experiences/experiences-page.tsx`
  - `apps/web/src/pages/dashboard/resumes/resume-page.tsx`
  - `apps/web/src/pages/dashboard/new-jobs/new-jobs-page.tsx`
  - `apps/web/src/pages/dashboard/tracked-jobs/ui/list.tsx`
- **Skills:** coss, better-ui, transitions-dev, impeccable

- [ ] **Step 1:** Add floating layout: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` card chrome (border, shadow, rounded, padding).
- [ ] **Step 2:** Replace inline bars on all six pages; hide when sort mode; Select all = loaded only when infinite.
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
- Consumers: `stack-selector`, project form, optimistic `setQueryData` — inventory first

- [ ] **Step 1:** Grep all `stacks.list` consumers including **`organize-stacks-job.tsx`**, `stack-selector`, project form, optimistic `setQueryData`; choose paginated list vs `listAll` for pickers; document in commit.
- [ ] **Step 2:** Add `limit` + `cursor` input; return `{ items, nextCursor, totalCount? }` for dashboard; keep full list for pickers if needed.
- [ ] **Step 3:** Wire `useInfiniteQuery`; flatten pages for grid; sentinel at bottom.
- [ ] **Step 4:** Keep batch selection across pages; Select all = loaded only.
- [ ] **Step 5:** Prefetch first page only in route; fix optimistic cache for new shape.
- [ ] **Step 6:** Commit: `feat: infinite scroll stacks list`

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

### Task 12: Mail generate + send APIs and UI (no Review)

**Files:**

- Relocate: `packages/api/src/lib/review/call-mail-reply-agent.ts` → `packages/api/src/lib/mail/call-mail-reply-agent.ts`
- Create: core Zod I/O for ephemeral draft + send under `packages/core/src/mail/`
- Create/Modify: `mail.router` — **generateReply** (subject/body only, no `review_item`) and **sendReply** (`sendCareerReply`)
- Create: web hooks under `features/mail/` (not `features/review/`)
- Modify: `mail-category-page.tsx` composer

- [ ] **Step 1:** Relocate `callMailReplyAgent` to `lib/mail/`; no review_item writes.
- [ ] **Step 2:** **generateReply** RPC: input `messageId` only (owner-scoped). Server loads message, rejects non-career / `system_notification` like create-reply-draft (`NOT_CAREER`), builds `jobContext` (non-persist half of create-draft), `resolveRuntimeAiCredentials(userId, "reply")`, calls mail-reply agent/workflow. Output `{ subject, bodyText }` only. Fail closed if BYO missing.
- [ ] **Step 3:** **sendReply** RPC: input `messageId` + `subject` + `bodyText` (plain text). Server loads message, derives **`to` from `message.fromEmail`** (never trust client `to`), ownership check, then `sendCareerReply({ bodyText })`. Never touches review_item.
- [ ] **Step 4:** **Composer body shape (locked):** Prefer **plain subject + plain body** fields for generate/send (match Review’s send path). If mail UI keeps `RichTextEditor`, strip HTML to `bodyText` the same way `queueComposerForReview` does before generate/send — never pass HTML as `bodyText` into `sendCareerReply` (escapes markup for recipients). Store agent `subject` in local state.
- [ ] **Step 5:** Web: Generate fills **local composer** only — no Review navigation.
- [ ] **Step 6:** Web: **Human confirm before send** (AlertDialog “Send reply?”); disable Send while mutation pending (no double Resend); not one-click from Generate.
- [ ] **Step 7:** Remove “Queue for review” / `/dashboard/review` links from mail UI.
- [ ] **Step 8:** Commit: `feat(mail): on-the-fly generate and confirmed send reply`

### Task 13: Remove Review surface + classify auto-draft

**Cascade touchpoints (all required):**

- Delete web review route/page/`features/review/**`
- Delete `review.router.ts`; unmount from `routers/index.ts`
- Delete queue libs after Task 12 APIs exist (`create-reply-draft-from-mail`, `confirm-reply-draft`)
- Core queue types out; keep/move reply draft schemas for agent
- DB: schema/repo/relations; migration drop `app_notification.review_item_id` then `review_item`
- Notifications: `reviewItemId`, kind `mail.reply.draft_ready` + settings UI
- AI settings: `mailReplyAutonomy` UI/router/core
- `run-mail-classify.ts` auto draft/send block
- Sidebar, command palette, breadcrumbs, email template samples, `parse-ai-error` `"review"`

- [ ] **Step 1:** Remove routes/UI/nav/command palette.
- [ ] **Step 2:** Remove review router + queue RPCs after mail RPCs ship.
- [ ] **Step 3:** Data fix **before/with** schema drop: for rows with `kind = mail.reply.draft_ready` and/or `href` containing `/dashboard/review` — **rewrite `href` to `/dashboard/mail/all`** (parity with `mail.classified.important`; mail selection is local state today, not URL `messageId`). Optional later: `?messageId=` + open-in-reader is **out of this plan** unless implemented as a small explicit add-on. Do **not** invent `/dashboard/mail/<uuid>` paths.
- [ ] **Step 4:** Migration: drop notification FK/column, drop `review_item` (+ enums as safe). Decide leave vs drop `mail_reply_autonomy` column in same migration (document choice).
- [ ] **Step 5:** Strip `mailReplyAutonomy` + `mail.reply.draft_ready` settings from product surface.
- [ ] **Step 6:** New job/career notifications continue to use **`/dashboard/mail/all`** (or valid category slug) only.
- [ ] **Step 7:** Grep zero hits for `review_item`, `/dashboard/review`, `createReplyDraftFromMail` outside historical docs.
- [ ] **Step 8:** Commit: `feat!: remove career Review queue; notify opens mail`

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
- **Every subagent/task prompt must include:** logging mandate (add loggers when gaps found; follow `.agents/logging.md` + plan section); do not finish a task that soft-fails silently in AI/mail/workflow code.
- If plan is too large for one session: stop after a completed phase boundary (P0–P6). Hang fix (P0–P1) ships value even if later phases wait.
- Infinite scroll page size default: start **24–40** items (tune per list density).
- Detect job dialog host: must live outside ProjectForm unmount tree (projects page or dashboard shell).
