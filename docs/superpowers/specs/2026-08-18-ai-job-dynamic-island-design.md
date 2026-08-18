# AI job Dynamic Island

**Date:** 2026-08-18  
**Status:** Approved for implementation  
**Branch:** `main` (implement on main; no worktree)

Replace the persistent AI-job Sonner toast (`showAiJobRunningToast` / `AiJobRunningToastBody`) with a bottom-left live-activity island. The morphing shell comes from [beUI Dynamic Island](https://beui.dev/components/blocks/dynamic-island). The island exists only while an AI job run is in flight (or briefly on finish; longer only when an action is required).

## Goals

- One shared live surface for all dashboard AI jobs that today use `showAiJobRunningToast`.
- Compact pill while running; hover (pointer-fine) reveals every active run; click expands a **step timeline** for that run.
- Finish: morph to success/error. Stay until dismissed/acted **only if** the result requires a user action. Otherwise show done/error briefly and remove.
- Keep `WorkflowSolvingOrb` as the live glyph.
- Ordinary (non-AI) Sonner toasts stay on Sonner.

## Non-goals

- Always-visible notch / idle compact pill in the chrome.
- Replacing Sonner or Base UI toast systems for non-AI messages.
- Hub chat / assistant-ui in-thread streaming indicators.
- Multi-job “tray” as the default expanded view (expand is always one job’s timeline).
- Building a custom spring shell from scratch (use beUI).
- Unit tests unless requested later.

## Placement

- `AiJobIslandHost` mounted once next to `<Toaster />` in `apps/web/src/routes/__root.tsx`.
- `position: fixed; bottom: …; left: …` — same corner as today’s Sonner (`bottom-left`).
- z-index above dashboard content, **below** dialogs/sheets/modals.
- Host renders nothing when the island store has no runs.
- beUI’s shell unfurls **down** (`transformOrigin: top`). For bottom-left, patch the primitive so the shell unfurls **up** (origin bottom, expand upward). That is a local origin/anchor change, not a custom spring system.

## Architecture

```text
job caller (detect / organize / find-jobs / …)
  → upsert / patch / complete / dismiss  (island store)
  → AiJobIslandHost
       ├─ hover stack (custom; compact pills)
       └─ beUI <DynamicIsland view={…}>
            ├─ compact: orb + foreground title + count
            ├─ DynamicIslandView "timeline"
            └─ DynamicIslandView "result" (success | error)
```

- **beUI** owns width/height spring morph for the **foreground** shell only (`view` is `null` | `"timeline"` | `"result"`).
- **Custom host** owns: store subscription, concurrency, hover stack, touch fallback, finish timer, cancel/result actions.
- Install via existing registry: `pnpm dlx shadcn add @beui/dynamic-island` (or project equivalent). Place the primitive under the web UI aliases (`@/shared/ui/…` or `packages/ui` if it is theme-agnostic enough). Do not pull beUI button / number-ticker / magnetic extras unless a later view needs them.
- `motion` is already a dependency.

## State

Shared store (`createExternalStore`, same pattern as existing AI job stores):

```ts
type AiIslandStepState = "done" | "active" | "pending";

type AiIslandStep = {
  id: string;
  label: string;
  state: AiIslandStepState;
};

type AiIslandRunStatus = "running" | "success" | "error";

type AiIslandResultAction = {
  label: string;
  onClick: () => void;
};

type AiIslandRun = {
  id: string;
  title: string;
  /** Result headline; falls back to `title` if omitted. */
  resultTitle?: string;
  status: AiIslandRunStatus;
  steps: AiIslandStep[];
  activeStepLabel: string | null;
  cancelLabel?: string;
  onCancel: () => void;
  requiresAction: boolean;
  resultAction?: AiIslandResultAction;
  errorMessage?: string;
  updatedAt: number;
};
```

### APIs

| Function                          | Role                                                                                                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upsertAiJobIsland(run)`          | Mount/refresh a run. Sets `status: "running"` unless specified. Updates `updatedAt`. Re-upsert of an **already running** id (find-jobs / scan “already running” re-show) must **not** reset `steps` or rewind the timeline. |
| `patchAiJobIsland(id, patch)`     | Step advances, title tweaks. Does **not** remount the shell. Does **not** bump `updatedAt` (progress must not steal foreground from another running job).                                                                   |
| `completeAiJobIsland(id, result)` | `status` success/error, `requiresAction`, optional `resultTitle` / `resultAction` / `errorMessage`.                                                                                                                         |
| `dismissAiJobIsland(id)`          | Remove run (cancel, timeout, user dismiss, action taken).                                                                                                                                                                   |

Replace `showAiJobRunningToast` / `AiJobRunningToastBody` with these APIs. First landing may keep a thin shim so callers migrate without a flag day.

Per-job domain stores (detect, organize, find-jobs, …) stay the source of truth for dialogs, results, and cancel. They **push** island updates; the island store does not own workflow execution.

### Foreground

Default compact/expanded shell follows:

1. Newest `updatedAt` among `status === "running"`.
2. Else newest durable (`requiresAction && status !== "running"`) complete run.

`completeAiJobIsland` may **temporarily steal** the shell — see Finish policy. After a result is dismissed (timer, X, action, or quiet background complete), restore the default rule (newest remaining running, else newest durable) and set `view` from that run: `null` if it is running, `"result"` if it is a durable complete. Never leave `view="result"` on a restored running job.

## Timeline

Expanded view is a vertical step list (done / active / pending).

**Workflow-backed jobs** (detect, organize, extract, and any caller with a known step map): seed `steps` from that map when the run starts. Advance a step to `active` (previous → `done`) **only** on workflow `step-start` or when the event key matches a map id. Intra-step progress (`write*Progress`, `Processing 3/10…`, chunk labels) **must not** add or advance steps — patch `activeStepLabel` (and the active step’s `label` in place) so the plan stays a plan, not a log. Maps live next to the job (e.g. `STEP_LABELS` in `detect-stacks-job.tsx`, `RESUME_EXTRACT_STEP_LABELS` in `extract-resume.mutation.ts`).

**Scheduled-label / poll jobs** (`scheduleStepLabels`, find-jobs poll copy): no full map up front. Start with one `active` step; when a new scheduled/poll label fires, mark the previous `done` and append the new `active`. Pending future labels are omitted (they are timed guesses, not a real plan).

Shimmer stays on the **active** step label only (same `shimmer` utility as today). Do not remount the island on each step.

## Interaction

| Input                                        | Behavior                                                                                                                                                                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No runs                                      | Host empty.                                                                                                                                                                                                                                        |
| One running                                  | Compact: orb + title.                                                                                                                                                                                                                              |
| Multiple running                             | Compact: orb + foreground title + count badge.                                                                                                                                                                                                     |
| Hover (`(hover: hover) and (pointer: fine)`) | Reveal **all** runs as compact pills, newest first. Leave hover → back to single compact unless a run is expanded.                                                                                                                                 |
| Click a compact pill                         | That run becomes foreground. `view="timeline"` if `status === "running"`, else `view="result"`.                                                                                                                                                    |
| Click outside / Escape                       | If foreground is **running**: collapse to compact (`view=null`); do **not** cancel. If foreground is a **durable result**: `dismissAiJobIsland` (do **not** run `resultAction`). If a brief non-durable result is showing: dismiss it immediately. |
| Result dismiss (X)                           | Same as Escape on a complete run: dismiss without running `resultAction`. Required on durable result view.                                                                                                                                         |
| Cancel in expanded (running only)            | Existing `onCancel` (same as today’s toast action). Hidden on result view.                                                                                                                                                                         |
| Touch / no hover                             | No hover stack. Tap compact → expand foreground (timeline vs result per status). In expanded header, a switcher picks another run.                                                                                                                 |

Reduced motion: use beUI’s existing `useReducedMotion` path (no springs / no blur).

## Finish policy

On `completeAiJobIsland` for run `id`:

1. Collapse any hover stack.
2. Result chrome: orb + `resultTitle` (fallback `title`) + optional `errorMessage` + optional `resultAction` + dismiss (X) when durable.
3. **Steal vs keep running foreground:**
   - If `id` is already foreground, or `requiresAction === true`: steal — that run becomes foreground and `view="result"`.
   - If `id` is background and `requiresAction === false`: do **not** steal. Dismiss that run quietly (no result morph). Foreground keeps the running job.
4. **`requiresAction === true`:** stay until `resultAction` click, X, or Escape/outside. Action click performs today’s toast navigation/dialog, then dismisses. After dismiss, restore default foreground (newest remaining running, else newest remaining durable).
5. **`requiresAction === false` and this run stole the shell:** arm a ~2.5s auto-dismiss at `complete` (reduced motion: still dismiss, no morph flourish). The timer fires even if another run later steals the shell — do not leave a leftover success row. If this run never stole (background informational), it was already dismissed in step 3. After dismiss, restore default foreground + `view` as above.
6. User cancel / abort: `dismissAiJobIsland` immediately; do **not** play a result. Prefer silent dismiss; do not add a new cancel toast. If the canceled run was foreground, restore default foreground.

Preflight that already mounted a running island (e.g. find-jobs title/inbox checks after upsert): dismiss the island and keep the error on Sonner.

### Mapping from today’s post-job Sonner

The island **owns the run lifecycle**, including the completion that used to be a follow-up Sonner after `toast.dismiss(RUNNING_ID)`.

`requiresAction: true` when today’s completion kept a deep-link action the user must take to continue (Review, View, Open onboarding, Settings → AI as the **primary** next step for that run). Examples:

- Detect / organize ready → Review (opens existing review dialog).
- Extract resume ready → review onboarding step.
- Find/scan completions whose only useful next step is opening New jobs **and** new jobs were found.
- Find/scan “still scoring in the background” and “No new inbox jobs yet” (`ingestTriggered && newJobsFound === 0`) when they keep a New jobs / View action.
- Post-start hard failures that today keep a next-step action (extract “Open onboarding”, `AI_NOT_CONFIGURED` → Settings → AI).

`requiresAction: false` for informational completions:

- “All stacks are already organized”
- “No new stacks detected”
- Final “No new inbox jobs” / “No job-alert digests yet” **without** a required next-step action
- Pure “Job details updated” / “Agent take updated” with no required follow-up
- Refresh “URL saved — description still thin” when no required next step

**Keep on Sonner (not the island):** preflight errors **before** a run is upserted (no resume uploaded, no repos selected, inbox full, missing job title). If a running island was already shown, dismiss it first.

`toastAiError` for **partial** results that still need Review: prefer completing the island with `status: "error"` or `"success"` + `requiresAction` + Review action rather than a second Sonner. Do not show island result **and** a duplicate Sonner for the same run.

## Callers (must migrate)

| Caller                          | Seed timeline from                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `detect-stacks-job.tsx`         | `STEP_LABELS`                                                                            |
| `organize-stacks-job.tsx`       | existing step labels                                                                     |
| `find-jobs-now-job.tsx`         | accumulate poll/step labels                                                              |
| `extract-resume-job.tsx`        | `RESUME_EXTRACT_STEP_LABELS` (`extract-resume.mutation.ts`); id `onboarding-extract-job` |
| `refresh-from-listing-job.tsx`  | schedule / workflow steps                                                                |
| `regenerate-agent-take-job.tsx` | schedule / workflow steps                                                                |
| `scan-job-alerts-job.tsx`       | accumulate / workflow steps                                                              |

Stable run `id`s stay the current toast ids (`detect-stacks-job`, `find-jobs-now-job`, `onboarding-extract-job`, …) so dismiss/update still work across navigations.

## UI composition

- Compact / stack pills: dark-or-inverted pill consistent with beUI (`bg-foreground text-background`) plus `WorkflowSolvingOrb` `size="toast"` (or a new `size="island"` if toast sizing is wrong).
- Expanded timeline: beUI `DynamicIslandView` with `px/py` tuned so the list is readable; Cancel uses existing outline/xs button language.
- Count badge only when `runs.length > 1`.
- `role="status"` + `aria-live="polite"` on the compact shell (beUI already sets this). Expanded panel: labelled disclosure; Escape collapses.

## Phasing

1. **Foundation** — install beUI island (bottom unfurl patch); store + host; shim `showAiJobRunningToast` → island upsert (single compact + expand timeline; one job).
2. **Callers + finish** — migrate each job file to patch steps and `completeAiJobIsland`. Result view, `requiresAction`, auto-dismiss timer, and `resultTitle` ship in this phase so no caller still needs a post-run Sonner for the same lifecycle.
3. **Concurrency polish** — hover stack + touch switcher. Steal/restore rules from Finish policy must already work for two sequential jobs; this phase only adds the multi-pill hover UI.

Ship is not done until all callers in the table are off the running Sonner toast **and** their completion is on the island (or explicitly listed as Sonner-only preflight).

## Verification

- After implementation, follow [ai-feature-harness](../../../.agents/skills/ai-feature-harness/SKILL.md) (detect/organize and any other migrated AI entry points).
- Browser-check: start a job, confirm compact bottom-left; hover with two jobs; expand timeline; cancel; success with and without required action; route change does not remount/lose the run.
- Desktop + mobile viewports (touch path).
- Confirm a non-AI Sonner toast still appears in the same corner without colliding destructively (island and Sonner may stack; prefer island sitting **above** the Sonner viewport offset, or temporarily suppress Sonner’s bottom-left collision by adding offset when the island is visible — pick one in implementation, do not overlap hit targets).

## Open implementation choices (not product questions)

- Whether the beUI primitive lives in `packages/ui` or `apps/web/src/shared/ui`. Prefer `packages/ui` only if the shell stays product-agnostic; host + store stay in `apps/web`.
- Exact hover-stack motion (stagger vs instant). Keep short; do not block the spec.
- Sonner collision offset pixels — measure in the host.
