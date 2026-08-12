# Dashboard detect, lists, multi-select, and Review removal

**Status:** Approved (brainstorm 2026-08-13)  
**Branch:** `main` (no feature branch required)  
**Delivery:** Approach 1 — pattern-first verticals in order below

## Goals

1. **Detect stacks** runs like **Organize stacks**: detached job, step toast + cancel, no results dialog until finished; form stays editable; sheet close / navigation does not cancel.
2. **Menu “Detect stacks”** on projects: repos dialog → save repos → start detect.
3. **Production hang** on “Categorizing unknown packages” is fixed with Mastra-native batching, abort, progress, and observability.
4. **Organize sort** (and related LLM chunk steps) scale for large catalogs via the same Mastra patterns.
5. **Multi-select actions** float as a **bottom-center card** on all dashboard multi-select pages.
6. **Dashboard lists** use **cursor infinite scroll** (`useInfiniteQuery` + reusable scroll hook), stacks first then other lists.
7. **Remove Review queue**; on-the-fly mail reply with tool-using agent; keep job/career notifications → open email; human confirm before send.
8. **Hub agent** exposes real product capabilities; **remove weather** remnants; Mastra tier **B** (foreach, progress writers, hub background tasks where documented).

## Non-goals

- Rewriting portfolio public APIs for infinite scroll (dashboard only unless a shared list contract is natural).
- Durable multi-region job runners (Inngest/Temporal) unless later measured need.
- Auto-draft or auto-send of career replies.
- Expanding reply agent to full hub tool surface (reply stays focused; hub is broad).

---

## Product decisions (locked)

| ID  | Decision                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Delivery order: hang/Mastra → organize sort → detect UX → floating bar → infinite lists → Review removal → hub audit/background                                |
| D2  | Detect results: open **global** results dialog when ready with reviewable stacks (survives navigation); **empty / no-changes → success toast only, no dialog** |
| D3  | Menu detect: **save repos** on project then start job                                                                                                          |
| D4  | **One global** detect job (single-flight); if `ready`, reopen dialog                                                                                           |
| D5  | New/unsaved project: detect **disabled** until `id` exists                                                                                                     |
| D6  | Hang fix: reliability + progress + observability (abort, timeouts, foreach, logging)                                                                           |
| D7  | Floating multi-select: **viewport-fixed bottom-center card**; replace inline bars                                                                              |
| D8  | Lists: pure infinite scroll via `useInfiniteQuery` + intersection hook                                                                                         |
| D9  | Review: remove queue; notify-only for job mail; generate on demand; send only after human confirm                                                              |
| D10 | Reply agent: **focused career tools** (app, prefs, experiences, projects, stacks); no send tool                                                                |
| D11 | Hub: audit/wire existing product capabilities; **no weather**; reply stays narrow                                                                              |
| D12 | Mastra adoption: **tier B** — foreach/concurrency, progress, retries, structuredOutput fallback, hub background tasks for long workflows, processors on hub    |
| D13 | Organize `sort-stacks` (and rename/enrich chunk loops) enhanced with same Mastra patterns                                                                      |
| D14 | Form detect uses **current form repos** without auto-saving the whole form; menu path saves repos only                                                         |

---

## Architecture principles

### Project structure (must follow)

**Agent (`apps/agent/AGENTS.md`):**

```text
src/mastra/
  agents/           # createXAgent() factories
  workflows/        # <name>-workflow/{index.ts, *.step.ts, schema, utils}
  tools/            # createTool definitions
  scorers/          # only if implemented; register in index
  lib/              # shared workflow helpers (timeout, progress) — DRY
  index.ts          # sole registration surface
skills/             # Agent Skills
```

**Web:** feature slices under `apps/web/src/features/<domain>/`; shared UI under `shared/ui`, shared hooks under `shared/hooks` or `shared/lib`; detached AI jobs under `shared/lib/ai-job` + feature job modules (detect mirrors organize).

**Core:** shared Zod/page contracts in `packages/core` when API + web both consume them.

**API:** list pagination in routers/repos; mail send without review queue.

### DRY

- One **timeout/abort** helper for agent LLM steps (promote organize `withTimeoutSignal` → `apps/agent/src/mastra/lib/with-timeout.ts`; detect + organize import it).
- One **detached AI job** pattern (store + controller + sticky toast); detect reuses organize kit shape.
- One **BatchSelectionBar** presentation mode (floating card).
- One **`useInfiniteScroll`** + shared page query helpers.
- No duplicated chunk-loop + Promise.race per workflow.

### Mastra documentation

- Load **mastra** skill before agent work; verify APIs against **installed** `@mastra/core` embedded docs / Context7 (`/mastra-ai/mastra`).
- Prefer workflows for pipelines; agents inside steps for open-ended LLM; hub as supervisor.
- Prefer `.foreach({ concurrency })` over ad-hoc `mapPool` when graph progress/events matter.
- Pass `abortSignal` into `agent.generate` / streams; check signal between iterations.
- Do not invent APIs; mark verify steps in plan if types differ.

### UI skills (web)

Implement UI with **impeccable**, **coss**, **coss-particles**, **better-ui**, **transitions-dev** (and a11y as needed).

---

## 1. Detect hang + Mastra batch categorize

### Problem

- UI stuck on **Categorizing unknown packages** (`ai-categorize`).
- Axiom: multi-minute streams; at least one **`terminated` TypeError ~310s**.
- Code: sequential chunks, 180s race without always aborting in-flight generate; no per-chunk UI progress; agent categorize logs weak in Axiom.

### Solution

1. **Shared** `withTimeoutSignal` in `apps/agent/src/mastra/lib/`.
2. Refactor categorize to **batch array + Mastra `.foreach(step, { concurrency: 2 })`** (or nested mini-workflow per batch). Post-step merge for display names / scopes if concurrent.
3. Pass **`abortSignal` into `agent.generate`**; per-chunk timeout ~45–60s; soft-fail chunk → low-confidence entries; continue.
4. **Progress:** foreach `workflow-step-progress` and/or step `writer.custom` → web maps to `stepLabel` (`Categorizing packages 26–50 of 120…`).
5. Step **`retries`** for transient failures; **`structuredOutput` errorStrategy fallback** where supported.
6. Soft **wall-clock** for categorize phase so reverse proxies don’t kill silent streams; remaining unknowns get low-confidence fallback.
7. Structured logs: `unknownCount`, `chunkIndex`, `durationMs`, soft-fail reason — same Axiom path as server events.

### Client labels

Extend `STEP_LABELS` / progress payload handling in detect job stream consumer.

---

## 2. Organize large-catalog sort (and LLM chunk steps)

### Problem

`sort-stacks` already uses type bands, ordinal LLM output, custom concurrency, and `withTimeoutSignal`, but large catalogs still error or soft-fail heavily; progress is coarse (“Sorting by importance”); rename/enrich still use manual chunk loops.

### Solution

1. DRY on shared timeout + optional shared “LLM chunk runner” only if it stays thin; prefer **Mastra `.foreach`** for sort work items.
2. Prepare step emits array of band-chunks → **`.foreach(sortChunkStep, { concurrency: 2–3 })`** → reassemble band order.
3. Progress → organize job toast (`Sorting stacks 4/12…`).
4. Keep ordinal indices (no UUIDs in LLM JSON); keep heuristic fallback + notes.
5. Apply same abort/timeout/progress pattern to **find-renames** / **find-enrichments** chunk loops where practical.
6. Tune chunk size / timeout constants; document in workflow utils or core constants if shared.

---

## 3. Detached detect UX

### Modules (web)

| Module                                           | Role                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `features/stacks/lib/detect-stacks-job-store.ts` | Global job state (mirror organize store)                                             |
| `features/stacks/api/detect-stacks-job.tsx`      | `startDetectStacksJob`, cancel, toast, stream consumer                               |
| `DetectStacksDialog`                             | Results only when `ready` (not progress shell)                                       |
| Project form                                     | Button shows step + X while running for this `projectId`; no open dialog until ready |
| Project menu                                     | “Detect stacks” → repos dialog → save `repos` → start job                            |

### Behavior

- **Single-flight** global detect job.
- **Detached** AbortController: cancel only on user action (toast / form X), not unmount.
- Form start: `repos` from form field (no full-form auto-save).
- Menu start: save `repos` via `projects.update`, then start.
- On success with results: **global dialog** (`dialogOpen`); apply → `stacks.upsertFromDetection` + invalidate; if form for same project mounted, merge `stackIds`.
- Empty / no changes: success toast, no dialog (organize-style).
- Sticky toast id e.g. `detect-stacks-job`.

### Reference implementation

Copy structure from `organize-stacks-job.tsx` + `organize-stacks-job-store.ts` + `createDetachedJobController` / `showAiJobRunningToast`.

---

## 4. Floating multi-select bar

### Scope pages

Stacks, projects, experiences, resumes, new jobs, tracked jobs **list**.

### UX

- When `selectedCount > 0` and not sort mode: render **fixed bottom-center card** with existing batch actions (Delete/Dismiss, Restore, Portfolio, Merge, Select all, Deselect).
- Remove **inline** `BatchSelectionBar` placement so actions aren’t duplicated.
- Motion: enter/exit per transitions-dev; coss buttons.
- z-index above list content; safe-area inset; doesn’t cover floating detect/organize toasts awkwardly (toast corner vs bar center).

### Implementation

Extend `BatchSelectionBar` with `variant="floating" | "inline"` (default floating for dashboard pages) or wrap in `FloatingBatchSelectionCard`. Prefer one component API.

---

## 5. Infinite scroll lists

### Server

- Add **cursor + limit** (or offset if cursor is hard) to dashboard list endpoints starting with **`stacks.list`**.
- Return `{ items, nextCursor, totalCount? }`.
- Preserve existing filter/sort behavior server-side where filters currently client-only — **phase carefully**: first page + client tab filter on loaded pages is OK only if total sets stay moderate; prefer server filters when moving applications/mail.

### Client

- `useInfiniteQuery` with oRPC infinite options if available, else manual `getNextPageParam`.
- **`useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin })`** — IntersectionObserver on sentinel.
- Apply to stacks page first; then projects, experiences, resumes, new jobs, tracked jobs, mail as follow-on tasks in same program.
- Do **not** reset multi-select on page append.
- Route preload: **first page only**.

### UX mitigations (research)

- Sticky filters/tabs; show loaded count when total known; sentinel below list (not under floating bar).
- **Select all** selects **loaded pages only** (label makes that clear). No server “select entire catalog” in this program.
- **List API:** migrate dashboard `list` to `{ items, nextCursor, totalCount? }` carefully; pickers that need full catalogs use a dedicated full-list query or high limit — do not break combobox/optimistic cache shapes silently.

---

## 6. Review removal + mail reply

### Remove

- Route `/dashboard/review`, page, sidebar, command palette, breadcrumbs.
- `features/review/*`, `review.router`, durable create/confirm/discard/update for queue.
- `review_item` table (+ FK from `app_notification.review_item_id` via migration).
- Classify auto `createReplyDraftFromMail` / Full auto-send.
- AI settings **mail reply autonomy** Assist/Full if only used for queue.
- Notification kind **`mail.reply.draft_ready`** targeting Review (replace with job/mail deep links as needed).

### Keep / rework

| Keep                          | Change                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `mail-reply-workflow` + agent | Expand **tools**: open apps, get application, job prefs, experiences, projects, stacks |
| `callMailReplyAgent`          | Relocate under `lib/mail/`; ephemeral draft for UI                                     |
| `sendCareerReply`             | New **send reply** path from mail composer (no review_item)                            |
| Job/career **notifications**  | Deep-link to **mail thread**, not Review                                               |
| Hub CRM tools                 | Shared with reply agent where types match                                              |

### Mail UX

1. User opens email (from list or notification).
2. **Generate reply** → agent with tools → fills local composer (no DB draft).
3. User edits → **Send** → human confirmation → RPC send.
4. No Review inbox.

### Reply agent quality

- Instructions: use tools for job + profile context; efficient career reply; never send.
- Mastra: abortSignal; structuredOutput fallback; if BYO fails tools+JSON, **prepareStep** tools-then-structure (verify docs).

---

## 7. Hub capability audit + background tasks (tier B)

1. Inventory hub tools/agents/workflows vs product features; wire missing real ones; **purge weather**.
2. Processors: `TokenLimiter`, `ToolCallFilter` (or equivalent) per docs.
3. `delegation.messageFilter`; keep `requireToolApproval` for mutating/expensive work.
4. **Background tasks** for long workflows triggered from hub (detect/organize/harvest) so chat isn’t blocked — verify storage/manager requirements on installed Mastra version before implement; degrade to current tool-call stream if not viable.
5. Optional: `activeTools` / `toolChoice: 'none'` for pure meta questions.

---

## 8. Error handling summary

| Surface             | Failure       | UX                                                                    |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| Detect LLM chunk    | Timeout/error | Soft-fail chunk; continue; notes if needed                            |
| Detect stream kill  | terminated    | Error toast; job error state; partial results only if already emitted |
| Organize sort chunk | Fail          | Heuristic order for chunk; note in dialog                             |
| Infinite list       | Page error    | Show error on sentinel; retry                                         |
| Reply generate      | Fail          | Toast; composer empty/prior                                           |
| Send reply          | Fail          | Toast; keep draft in composer                                         |

---

## 9. Testing / validation

- **Agent:** unit tests for ordinal sort reassembly, categorize soft-fail; manual large-repo detect completes; cancel mid-categorize.
- **Web:** detect sheet close + navigate keeps toast; results dialog; menu save-repos.
- **Floating bar:** visible while scrolled; all 6 pages.
- **Infinite:** scroll loads pages; selection stable; first paint not full dump.
- **Review:** no route; mail generate+send; notifications open mail; migration clean.
- **Narrow check:** `vp check` / package checks per workflow docs; avoid full monorepo build unless needed.

---

## 10. Implementation phases (plan tasks map 1:1)

| Phase | Deliverable                                                             |
| ----- | ----------------------------------------------------------------------- |
| P0    | Shared agent lib (timeout); detect categorize foreach + progress + logs |
| P1    | Organize sort/rename/enrich Mastra foreach + progress                   |
| P2    | Detached detect job + form + menu repos dialog                          |
| P3    | Floating multi-select card                                              |
| P4    | Infinite scroll: API + hook + stacks → other lists                      |
| P5    | Review removal + mail reply tools + send + notifications                |
| P6    | Hub audit, processors, background tasks, weather purge                  |
| P7    | Spec/plan docs already done; code review loop until solid               |

---

## 11. Risks

| Risk                                         | Mitigation                                               |
| -------------------------------------------- | -------------------------------------------------------- |
| Concurrent foreach breaks display-name reuse | Post-merge pass or concurrency 1 for name-critical steps |
| Background tasks API mismatch                | Verify embedded docs; feature-flag / skip if not ready   |
| Cursor pagination vs client filters          | Document per-list strategy; server filters where needed  |
| Review data loss                             | Migration drops queue intentionally; user approved       |
| Stream proxy timeouts                        | Progress + wall-clock soft complete                      |

---

## 12. References

- Organize job pattern: `apps/web/src/features/stacks/api/organize-stacks-job.tsx`
- Detect mutation (to fold into job): `apps/web/src/features/stacks/api/detect-stacks.mutation.ts`
- Detect workflow: `apps/agent/src/mastra/workflows/detect-stacks-workflow/`
- Organize sort: `.../organize-stacks-workflow/sort-stacks.step.ts`
- Batch bar: `apps/web/src/shared/ui/batch-selection-bar.tsx`
- Agent layout: `apps/agent/AGENTS.md`
- Mastra skill + https://mastra.ai/llms.txt
- UX research: floating bulk bars; infinite scroll caveats for task dashboards (mitigations in §5)
