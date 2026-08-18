# AI Job Dynamic Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the persistent AI-job Sonner toast with a bottom-left beUI Dynamic Island that shows compact live status, a step timeline on expand, and a result morph that stays only when an action is required.

**Architecture:** Product-agnostic beUI shell lives next to the other app beUI ports (`apps/web/src/shared/ui/motion/`). A module-level island store (`createExternalStore`) is the single write API for every AI job. `AiJobIslandHost` mounts at the root beside `<Toaster />` and owns hover-stack, steal/restore, and finish timers. Job callers keep their domain stores and only swap toast show/dismiss/complete for island upsert/patch/complete.

**Tech Stack:** React, `motion/react`, beUI `@beui/dynamic-island`, existing `createExternalStore`, `WorkflowSolvingOrb`, Sonner (non-AI only).

**Spec:** `docs/superpowers/specs/2026-08-18-ai-job-dynamic-island-design.md`

**Branch:** Implement on **`main`** (do not create a worktree).

**Skills:** @.agents/ui.md (keep host/store in `apps/web`; do not extract to `packages/ui` — other beUI ports are already app-local). @.agents/skills/ai-feature-harness/SKILL.md after implementation (detect/organize + at least one other migrated job). @.agents/workflow.md (`vp check` in `apps/web`). Do **not** add unit tests unless the user asks ([Testing](../../../.agents/testing.md)).

---

## File map

| Path                                                                   | Role                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web/src/shared/ui/motion/dynamic-island.tsx`                     | **Create** — beUI shell, patched to unfurl **up**                                      |
| `apps/web/src/shared/lib/ai-job/island-store.ts`                       | **Create** — runs, upsert/patch/complete/dismiss, step helpers                         |
| `apps/web/src/shared/ui/ai-job-island-host.tsx`                        | **Create** — fixed bottom-left host, views, hover stack                                |
| `apps/web/src/shared/lib/ai-job/running-toast.tsx`                     | **Modify** — shim `showAiJobRunningToast` → upsert (then delete once callers migrated) |
| `apps/web/src/shared/lib/ai-job/index.ts`                              | **Modify** — export island APIs                                                        |
| `apps/web/src/routes/__root.tsx`                                       | **Modify** — mount `<AiJobIslandHost />`                                               |
| `apps/web/src/shared/ui/ai-flow-trigger.tsx`                           | **Modify** — optional `size="island"` if toast orb is too large                        |
| `apps/web/src/features/stacks/api/detect-stacks-job.tsx`               | **Modify** — first full caller                                                         |
| `apps/web/src/features/stacks/api/organize-stacks-job.tsx`             | **Modify**                                                                             |
| `apps/web/src/features/onboarding/api/extract-resume-job.tsx`          | **Modify**                                                                             |
| `apps/web/src/shared/lib/find-jobs-now-job.tsx`                        | **Modify**                                                                             |
| `apps/web/src/features/applications/api/scan-job-alerts-job.tsx`       | **Modify**                                                                             |
| `apps/web/src/features/applications/api/refresh-from-listing-job.tsx`  | **Modify**                                                                             |
| `apps/web/src/features/applications/api/regenerate-agent-take-job.tsx` | **Modify**                                                                             |

No `packages/ui` change. No new Sonner replacement. No hub-chat work.

---

### Task 1: Install beUI Dynamic Island (bottom unfurl)

**Files:**

- Create: `apps/web/src/shared/ui/motion/dynamic-island.tsx`

- [ ] **Step 1: Add the registry component from `apps/web`**

```bash
cd apps/web && pnpm dlx shadcn@latest add @beui/dynamic-island --yes
```

Expected: a `dynamic-island` file under the web `components` alias (`src/shared/ui/…`). If shadcn writes extras (button, number-ticker, magnetic, a new `lib/ease.ts` under `packages/ui` or web), **delete those extras** — do not commit `packages/ui/lib/ease.ts`. Keep only the island primitive at `apps/web/src/shared/ui/motion/dynamic-island.tsx`. Point `EASE_OUT` at `@/shared/lib/ease`. `cn` from `@tsu-stack/ui/lib/utils`.

If the CLI writes to a path you do not want, move the file to `apps/web/src/shared/ui/motion/dynamic-island.tsx` and fix imports.

- [ ] **Step 2: Patch unfurl for bottom-left**

In the copied primitive:

1. `Slot` `style.transformOrigin`: `"bottom center"` (was `"top center"`).
2. `Slot` enter/exit `y`: flip signs so content rises out of the pill (`initial.y: 8`, `exit.y: 6`).
3. Shell class: `items-end` instead of `items-start`.
4. Compact slot: drop `min-w-[126px] min-h-[37px]` (or raise them) so orb + title + count fit.
5. Comment at top: `// beui.dev/components/blocks/dynamic-island — origin flipped for bottom-left host`.

Do not change spring tokens. Keep `useReducedMotion`. Keep `role="status"` / `aria-live="polite"`.

- [ ] **Step 3: Typecheck the new file**

```bash
cd apps/web && vp check
```

Expected: pass (or only pre-existing errors unrelated to this file).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/ui/motion/dynamic-island.tsx apps/web/src/shared/lib/ease.ts
git commit -m "feat(web): add beUI Dynamic Island with bottom unfurl"
```

---

### Task 2: Island store + write APIs

**Files:**

- Create: `apps/web/src/shared/lib/ai-job/island-store.ts`
- Modify: `apps/web/src/shared/lib/ai-job/index.ts`

- [ ] **Step 1: Implement the store**

Create `island-store.ts` with this contract (keep types in this file):

```ts
import { createExternalStore } from "@/shared/lib/ai-job/create-external-store";

export type AiIslandStepState = "done" | "active" | "pending";

export type AiIslandStep = {
  id: string;
  label: string;
  state: AiIslandStepState;
};

export type AiIslandRunStatus = "running" | "success" | "error";

export type AiIslandResultAction = {
  label: string;
  /** Host runs `useNavigate()({ to })` — job modules must not call `getRouter()`. */
  to?: string;
  onClick?: () => void;
};

export type AiIslandRun = {
  id: string;
  title: string;
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

type IslandState = {
  runs: Record<string, AiIslandRun>;
  /** Temporary steal target (`complete` / click). Null = use default foreground. */
  stealId: string | null;
};

const store = createExternalStore<IslandState>({ runs: {}, stealId: null });

const dismissTimers = new Map<string, number>();

function clearDismissTimer(id: string) {
  const t = dismissTimers.get(id);
  if (t !== undefined) {
    window.clearTimeout(t);
    dismissTimers.delete(id);
  }
}

export function listIslandRuns(): AiIslandRun[] {
  return Object.values(store.getState().runs).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getIslandRun(id: string): AiIslandRun | undefined {
  return store.getState().runs[id];
}

/** Default foreground: newest running, else newest durable complete. */
export function defaultForegroundId(runs: AiIslandRun[]): string | null {
  const running = runs.filter((r) => r.status === "running");
  if (running[0]) return running[0].id;
  const durable = runs.filter((r) => r.status !== "running" && r.requiresAction);
  return durable[0]?.id ?? null;
}

export function getForegroundRun(): AiIslandRun | undefined {
  const { runs, stealId } = store.getState();
  if (stealId && runs[stealId]) return runs[stealId];
  const list = listIslandRuns();
  const id = defaultForegroundId(list);
  return id ? runs[id] : undefined;
}

export function upsertAiJobIsland(
  input: Omit<AiIslandRun, "updatedAt" | "status" | "requiresAction" | "steps"> & {
    status?: AiIslandRunStatus;
    requiresAction?: boolean;
    steps?: AiIslandStep[];
  }
): void {
  const existing = store.getState().runs[input.id];
  const alreadyRunning = existing?.status === "running";
  const next: AiIslandRun = alreadyRunning
    ? {
        ...existing,
        title: input.title ?? existing.title,
        onCancel: input.onCancel,
        cancelLabel: input.cancelLabel ?? existing.cancelLabel,
        updatedAt: Date.now()
        // keep existing.steps + activeStepLabel — do not take input.steps / input.activeStepLabel
      }
    : {
        cancelLabel: "Cancel",
        requiresAction: false,
        ...existing,
        ...input,
        steps: input.steps ?? existing?.steps ?? [],
        status: input.status ?? "running",
        updatedAt: Date.now()
      };
  store.setState((prev) => ({
    runs: { ...prev.runs, [next.id]: next }
  }));
}

export function patchAiJobIsland(
  id: string,
  patch: Partial<Omit<AiIslandRun, "id" | "updatedAt">>
): void {
  const current = store.getState().runs[id];
  if (!current) return;
  store.setState((prev) => ({
    runs: { ...prev.runs, [id]: { ...current, ...patch } }
  }));
}

export function dismissAiJobIsland(id: string): void {
  clearDismissTimer(id);
  store.setState((prev) => {
    const { [id]: _, ...rest } = prev.runs;
    return {
      runs: rest,
      stealId: prev.stealId === id ? null : prev.stealId
    };
  });
}

export function focusIslandRun(id: string): void {
  const current = store.getState().runs[id];
  if (!current) return;
  store.setState((prev) => ({
    stealId: id,
    runs: { ...prev.runs, [id]: { ...current, updatedAt: Date.now() } }
  }));
}

export function completeAiJobIsland(
  id: string,
  result: {
    status: Exclude<AiIslandRunStatus, "running">;
    resultTitle?: string;
    requiresAction: boolean;
    resultAction?: AiIslandResultAction;
    errorMessage?: string;
  }
): void {
  const current = store.getState().runs[id];
  if (!current) return;

  const foreground = getForegroundRun();
  const steal = foreground?.id === id || result.requiresAction;

  if (!steal && !result.requiresAction) {
    dismissAiJobIsland(id);
    return;
  }

  clearDismissTimer(id);
  store.setState((prev) => ({
    stealId: steal ? id : prev.stealId,
    runs: {
      ...prev.runs,
      [id]: {
        ...current,
        status: result.status,
        resultTitle: result.resultTitle,
        requiresAction: result.requiresAction,
        resultAction: result.resultAction,
        errorMessage: result.errorMessage,
        updatedAt: Date.now()
      }
    }
  }));

  if (!result.requiresAction) {
    dismissTimers.set(
      id,
      window.setTimeout(() => {
        dismissAiJobIsland(id);
      }, 2500)
    );
  }
}

export function islandStepsFromMap(map: Record<string, string>): AiIslandStep[] {
  return Object.entries(map).map(([stepId, label], index) => ({
    id: stepId,
    label,
    state: index === 0 ? "active" : "pending"
  }));
}

export function advanceIslandMapStep(runId: string, stepId: string, label: string): void {
  const run = store.getState().runs[runId];
  if (!run) return;
  const idx = run.steps.findIndex((s) => s.id === stepId);
  if (idx < 0) {
    patchAiJobIsland(runId, { activeStepLabel: label });
    return;
  }
  const steps = run.steps.map((s, i) => {
    if (i < idx) return { ...s, state: "done" as const };
    if (i === idx) return { ...s, state: "active" as const, label };
    return { ...s, state: "pending" as const };
  });
  patchAiJobIsland(runId, { steps, activeStepLabel: label });
}

/** Intra-step progress — do not add/advance steps. */
export function patchIslandActiveLabel(runId: string, label: string): void {
  const run = store.getState().runs[runId];
  if (!run) return;
  const steps = run.steps.map((s) => (s.state === "active" ? { ...s, label } : s));
  patchAiJobIsland(runId, { steps, activeStepLabel: label });
}

/** Poll/schedule jobs: append a new active step, mark previous done. */
export function appendIslandStep(runId: string, label: string): void {
  const run = store.getState().runs[runId];
  if (!run) return;
  if (label === run.activeStepLabel) return;
  const steps = run.steps.map((s) => (s.state === "active" ? { ...s, state: "done" as const } : s));
  steps.push({
    id: `step-${steps.length}`,
    label,
    state: "active"
  });
  patchAiJobIsland(runId, { steps, activeStepLabel: label });
}

export function useAiJobIsland() {
  return store.useStore();
}

export function getAiJobIslandState() {
  return store.getState();
}
```

Do not bump `updatedAt` in `patchAiJobIsland`. Export `focusIslandRun(id)` now (sets `stealId`, bumps `updatedAt`) so Task 3 can use it; Task 11 only adds the stack UI.

- [ ] **Step 2: Export from `index.ts`**

Add named exports for the public functions/types. Keep existing job-controller exports.

- [ ] **Step 3: `vp check` in `apps/web`**

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/lib/ai-job/island-store.ts apps/web/src/shared/lib/ai-job/index.ts
git commit -m "feat(web): add AI job island store"
```

---

### Task 3: Host (compact + timeline + result)

**Files:**

- Create: `apps/web/src/shared/ui/ai-job-island-host.tsx`
- Modify: `apps/web/src/routes/__root.tsx`

- [ ] **Step 1: Implement the host**

Fixed `bottom-4 left-4` (match Sonner inset). Host `z-40` (same band as `packages/ui` `Portal`) so a durable Review island cannot cover the review dialog. Sonner collision is spatial offset in Task 12, not a higher z-index. Pointer-events only on the pill.

Host owns `useNavigate`. Result buttons: if `resultAction.to`, navigate there; always run optional `onClick` (Review dialogs). Job files must not call `getRouter()`.

Structure:

```tsx
<DynamicIsland view={view} compact={compactNode} className="…">
  <DynamicIslandView id="timeline">…steps… Cancel</DynamicIslandView>
  <DynamicIslandView id="result">…resultTitle… error… action… X</DynamicIslandView>
</DynamicIsland>
```

Host local state:

- `view: null | "timeline" | "result"`
- `hovered: boolean` (pointer-fine only; use existing `useHoverCapable`)
- After store subscribe: if steal run is complete → `view = "result"`; if default foreground is running and view was result for a dismissed id → `view = null`.
- **Click/tap the compact pill (required in this task, not Task 11):** if foreground is running → `view = "timeline"`; if complete → `view = "result"`. Without this, a single job can never open the timeline on desktop.

Compact: `WorkflowSolvingOrb size="toast"` + foreground `title` (strip trailing dots like today’s toast) + count badge if `listIslandRuns().length > 1`.

Timeline: map `foreground.steps`; shimmer the `active` row (`shimmer` class). Cancel button calls `foreground.onCancel`.

Result: `resultTitle ?? title`, `errorMessage`, `resultAction` button (then `dismissAiJobIsland`), X button → `dismissAiJobIsland` without running the action.

Keyboard: `Escape` → if running, `view = null`; if complete, `dismissAiJobIsland`. Click outside the host (document pointerdown) same as Escape.

Empty store → render `null`.

Do **not** implement hover stack yet (Task 11). Count badge can still show.

- [ ] **Step 2: Mount in root**

In `apps/web/src/routes/__root.tsx`, next to `<Toaster />`:

```tsx
<Toaster />
<AiJobIslandHost />
```

- [ ] **Step 3: `vp check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): mount AI job island host"
```

---

### Task 4: Shim `showAiJobRunningToast`

**Files:**

- Modify: `apps/web/src/shared/lib/ai-job/running-toast.tsx`

- [ ] **Step 1: Route the shim to the island**

Replace the Sonner `toast(...)` body with:

```ts
export function showAiJobRunningToast(options: {
  id: string;
  onCancel: () => void;
  cancelLabel?: string;
  body: ReactNode;
}) {
  upsertAiJobIsland({
    id: options.id,
    title: "Working…",
    activeStepLabel: null,
    onCancel: options.onCancel,
    cancelLabel: options.cancelLabel,
    steps: [{ id: "working", label: "Working…", state: "active" }]
  });
}
```

Keep `AiJobRunningToastBody` exported until every caller stops importing it, then delete it.

Add `dismissAiJobRunningToast(id)` → `dismissAiJobIsland(id)`.

**Same commit:** in every AI job file, replace `toast.dismiss(*_TOAST_ID)` with `dismissAiJobIsland(id)` (or the shim). Do **not** change completion Sonner copy yet — that stays per later tasks — but cancel/preflight/complete must tear down the island or Task 4 leaves a permanent “Working…” pill for unmigrated jobs. After this step, cancel already dismisses the island everywhere.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(web): shim AI running toast to island store"
```

At this point every existing job lights the island (generic “Working…”) and **tears it down** on cancel/complete/preflight via `dismissAiJobIsland`. Completion copy still uses Sonner until later tasks. Do not ship this as done.

---

### Task 5: Migrate detect-stacks (template caller)

**Files:**

- Modify: `apps/web/src/features/stacks/api/detect-stacks-job.tsx`

This is the template every later caller copies.

- [ ] **Step 1: Start run**

Replace `showRunningToast` / `DetectRunningToastBody` with:

```ts
upsertAiJobIsland({
  id: DETECT_TOAST_ID,
  title: "Detecting stacks…",
  onCancel: cancelDetectStacksJob,
  steps: islandStepsFromMap(STEP_LABELS),
  activeStepLabel: "Starting…"
});
```

- [ ] **Step 2: Step vs progress**

On `workflow-step-start`:

```ts
setDetectJobState({ stepLabel });
if (stepName) advanceIslandMapStep(DETECT_TOAST_ID, stepName, stepLabel ?? stepName);
```

On `data-detect-progress` / `workflow-step-progress`:

```ts
setDetectJobState({ stepLabel: label });
patchIslandActiveLabel(DETECT_TOAST_ID, label);
```

- [ ] **Step 3: Complete / cancel**

Replace `toast.dismiss(DETECT_TOAST_ID)` + follow-up Sonner:

| Outcome               | Island complete                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No reviewable results | `completeAiJobIsland(id, { status: "success", resultTitle: "No new stacks detected", requiresAction: false })`                                                                                                                                                                                                                            |
| Reviewable            | `requiresAction: true`, `resultTitle: "Detection ready"`, `resultAction: { label: "Review", onClick: () => queueMicrotask(() => setDetectReviewOpen(true)) }`                                                                                                                                                                             |
| Hard error            | Use `presentAiError` from `apps/web/src/shared/lib/parse-ai-error.ts` (same branch `toastAiError` uses). If that presentation includes Settings → AI (`AI_NOT_CONFIGURED` / `showAiSettings`) or another recovery CTA, `requiresAction: true` + that action. Otherwise brief error. **Do not** also fire `toastAiError` for the same run. |
| Cancel / abort        | `dismissAiJobIsland(id)` only — drop `toast.info("Stack detection cancelled.")`                                                                                                                                                                                                                                                           |

Preflight “Select at least one repository” stays on Sonner (no upsert yet).

- [ ] **Step 4: Browser-check detect only**

Start detect from stacks page. Confirm compact bottom-left, expand shows seeded steps advancing, cancel dismisses, success with Review stays, Review opens the existing dialog.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): run detect-stacks on the AI island"
```

---

### Task 6: Migrate organize-stacks

**Files:**

- Modify: `apps/web/src/features/stacks/api/organize-stacks-job.tsx`

Same pattern as detect.

- Seed `islandStepsFromMap(STEP_LABELS)`.
- `workflow-step-start` → `advanceIslandMapStep`.
- `data-organize-progress` → `patchIslandActiveLabel` only.
- Completions:

| Outcome                                | Island                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Already organized                      | success, no action, brief                                                                               |
| Ready + notes (`toastAiError` partial) | success or error + `requiresAction: true` + Review (open organize dialog) — **no second Sonner**        |
| Ready, no notes                        | success + Review action                                                                                 |
| Hard error                             | same as detect: island result from `presentAiError` (Settings CTA when applicable); no duplicate Sonner |
| Cancel                                 | dismiss, drop cancel info toast                                                                         |

- [ ] Commit: `feat(web): run organize-stacks on the AI island`

---

### Task 7: Migrate extract-resume

**Files:**

- Modify: `apps/web/src/features/onboarding/api/extract-resume-job.tsx`

- Id: `onboarding-extract-job` (keep `EXTRACT_TOAST_ID` if that is already this string; otherwise align to spec).
- Seed `islandStepsFromMap(RESUME_EXTRACT_STEP_LABELS)` from `extract-resume.mutation.ts`.
- Do **not** invert `RESUME_EXTRACT_STEP_LABELS` (`pdf-text` and `prepare` share copy). Extend `runExtractResume` / `onStepChange` so the job receives **`stepName`** and calls `advanceIslandMapStep(EXTRACT_TOAST_ID, stepName, label)`.
- Completions:

| Outcome   | Island                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| Ready     | `resultTitle: "Resume ready to review"`, Review → `/dashboard/onboarding`, `requiresAction: true`            |
| Hard fail | error + Open onboarding action, `requiresAction: true` (today’s `toastAiError` action) — no duplicate Sonner |
| Cancel    | dismiss, drop cancel info toast                                                                              |

Preflight “Upload a resume…” stays Sonner.

- [ ] Commit: `feat(web): run resume extract on the AI island`

---

### Task 8: Migrate find-jobs-now

**Files:**

- Modify: `apps/web/src/shared/lib/find-jobs-now-job.tsx`

Poll/schedule job: **no** full map. Start with one active step; `appendIslandStep` when `stepLabel` changes.

`upsert` on start (`title: "Finding jobs…"`). Re-upsert while already running must not rewind steps (store already preserves steps).

`enqueueFindJobsNow({ showToast: false })` (hub tool UI) must **not** upsert the island.

Preflight after upsert (title/inbox/budget): `dismissAiJobIsland` + existing Sonner message. Mid-run `toastMissingAiKey` stays on Sonner.

Completions (all of these **keep their action** → `requiresAction: true` except silent abort):

| Today’s toast                                                   | Island                                        |
| --------------------------------------------------------------- | --------------------------------------------- |
| Still scoring in the background                                 | durable + New jobs                            |
| N new jobs added                                                | durable + Open New jobs                       |
| No new inbox jobs yet (`ingestTriggered && newJobsFound === 0`) | durable + New jobs                            |
| No new inbox jobs (final, Tracked jobs link only)               | brief informational (`requiresAction: false`) |
| Hard error                                                      | error, brief unless it has an action          |

- [ ] Commit: `feat(web): run find-jobs-now on the AI island`

---

### Task 9: Migrate scan-job-alerts

**Files:**

- Modify: `apps/web/src/features/applications/api/scan-job-alerts-job.tsx`

Same accumulate-step pattern as find-jobs.

| Outcome                                                    | Island                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| No job-alert digests yet                                   | success, **no** action → brief (`requiresAction: false`) |
| Queue unavailable                                          | error, brief                                             |
| N new jobs                                                 | durable + Open New jobs                                  |
| Scan finished — no new inbox jobs (Tracked jobs link only) | brief informational (`requiresAction: false`)            |
| Hard error                                                 | error, brief                                             |
| Cancel / dismiss tracking                                  | `dismissAiJobIsland`                                     |

- [ ] Commit: `feat(web): run scan-job-alerts on the AI island`

---

### Task 10: Migrate refresh-from-listing + regenerate-agent-take

**Files:**

- Modify: `apps/web/src/features/applications/api/refresh-from-listing-job.tsx`
- Modify: `apps/web/src/features/applications/api/regenerate-agent-take-job.tsx`

Both use `scheduleStepLabels` (`STEP_SCHEDULE_MS`) — **timed guesses, not a real plan**. Do **not** seed pending future labels. Start with one active step; wrap `setStepLabel` so when the **label string changes**, `appendIslandStep` (skip if the new label equals the current active label).

Completions (spec: informational unless a **required** recovery CTA):

| Outcome                                                                   | Island                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Job details updated / Agent take updated                                  | brief success (`requiresAction: false`). Ignore today’s View job / Tracked jobs link — that is not a required next step. |
| URL saved — description still thin                                        | brief, same rule                                                                                                         |
| `AI_NOT_CONFIGURED` / `AGENT_FAILED` / Settings CTA from `presentAiError` | durable + Settings                                                                                                       |
| Other hard error                                                          | brief error from `presentAiError` unless it has a recovery CTA                                                           |
| Cancel                                                                    | dismiss only                                                                                                             |

Drop the duplicate post-run Sonner for the same lifecycle.

- [ ] Commit: `feat(web): run listing refresh and agent-take on the AI island`

---

### Task 11: Hover stack + touch switcher

**Files:**

- Modify: `apps/web/src/shared/ui/ai-job-island-host.tsx`

- [ ] **Step 1: Hover stack (pointer-fine only)**

When `hovered && listIslandRuns().length > 1 && view === null`:

- On `completeAiJobIsland` (host subscribe), set `hovered = false`.
- Render **other** runs as compact pills **above** the beUI shell (newest first). Do not duplicate the foreground pill.
- Click a pill: `focusIslandRun(id)` (already in the store), then `view = run.status === "running" ? "timeline" : "result"`.
- Mouse leave: hide stack; if not expanded, stay compact.

- [ ] **Step 2: Touch / no-hover**

No stack. Tap compact → expand foreground (timeline vs result). In expanded header, if `runs.length > 1`, render small pills / a count switcher that calls `focusIslandRun`.

- [ ] **Step 3: Desktop + mobile browser-check**

Two jobs (detect + find, or detect + organize if safe). Hover reveals both. Click expands the chosen timeline. Touch viewport: no hover, tap + switcher.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): stack concurrent AI island jobs on hover"
```

---

### Task 12: Remove dead toast shim + collision offset

**Files:**

- Modify: `apps/web/src/shared/lib/ai-job/running-toast.tsx` (delete if unused)
- Modify: `apps/web/src/shared/lib/ai-job/index.ts`
- Modify: `apps/web/src/shared/ui/ai-job-island-host.tsx` and/or `packages/ui/components/sonner.tsx` only if offset must live on Toaster

- [ ] **Step 1: Grep**

```bash
rg -n "showAiJobRunningToast|AiJobRunningToastBody|toast.dismiss\\((DETECT|ORGANIZE|FIND|EXTRACT|SCAN|REFRESH|TAKE)_TOAST" apps/web
```

Expected: no running-toast helpers left; no `toast.dismiss` of those AI ids.

Delete `running-toast.tsx` if empty of callers. Keep `WorkflowSolvingOrb` comment in `ai-flow-trigger.tsx` in lockstep with island compact, not the deleted toast body.

- [ ] **Step 2: Collision**

If a non-AI Sonner toast appears while the island is visible, they must not overlap. Prefer raising the island (`bottom` += toast stack) **or** passing Sonner `offset` when `listIslandRuns().length > 0`. Pick one; measure in the browser.

- [ ] **Step 3: `cd apps/web && vp check`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(web): drop AI running-toast shim"
```

---

### Task 13: Verify with ai-feature-harness

**Files:** none planned (fixes only if the loop finds bugs). Lessons: `.agents/skills/ai-feature-harness/LESSONS.md`

- [ ] **Step 1: Load @.agents/skills/ai-feature-harness/SKILL.md** and `LESSONS.md`.

- [ ] **Step 2: Contract**

| Item                 | Content                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| User-visible success | Compact island while a job runs; expand = real step plan; Review/action durable; informational complete vanishes; Sonner still works for non-AI |
| Entry paths          | Stacks detect, stacks organize, find-jobs (or scan), extract if onboarding reachable                                                            |
| Shared state         | Per-job stores + island store; review dialogs                                                                                                   |
| Non-goals            | Hub chat streaming, Base UI toast rewrite                                                                                                       |

- [ ] **Step 3: Browser matrix**

- Detect happy + cancel + no-results + reviewable Review
- Organize review dialog from island action
- Second job while first runs (hover / touch)
- Route change mid-job (island persists)
- Non-AI toast (e.g. copy success) does not cover the island
- Desktop + a narrow/mobile viewport

- [ ] **Step 4: Append LESSONS.md** and produce the hardening report in the session.

- [ ] **Step 5: Commit only if harness forced code/lesson edits**

```bash
git commit -m "docs: record AI island harness lessons"
```

Ship is not done until Task 13’s report exists and every caller in the spec table is off the running Sonner toast.

---

## Out of scope (do not do)

- Always-visible chrome notch
- Replacing Sonner globally
- Hub chat turn indicators
- Custom spring physics (beyond origin flip)
- Unit test files
