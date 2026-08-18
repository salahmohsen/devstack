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
  return Object.values(store.getState().runs).toSorted((a, b) => b.updatedAt - a.updatedAt);
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
  const next: AiIslandRun =
    alreadyRunning && existing
      ? {
          ...existing,
          title: input.title ?? existing.title,
          onCancel: input.onCancel,
          cancelLabel: input.cancelLabel ?? existing.cancelLabel,
          updatedAt: Date.now()
          // keep existing.steps + activeStepLabel — do not take input.steps / input.activeStepLabel
        }
      : {
          ...existing,
          ...input,
          cancelLabel: input.cancelLabel ?? existing?.cancelLabel ?? "Cancel",
          requiresAction: input.requiresAction ?? existing?.requiresAction ?? false,
          steps: input.steps ?? existing?.steps ?? [],
          status: input.status ?? "running",
          updatedAt: Date.now()
        };
  store.setState((prev) => {
    return {
      runs: { ...prev.runs, [next.id]: next }
    };
  });
}

export function patchAiJobIsland(
  id: string,
  patch: Partial<Omit<AiIslandRun, "id" | "updatedAt">>
): void {
  const current = store.getState().runs[id];
  if (!current) return;
  store.setState((prev) => {
    return {
      runs: { ...prev.runs, [id]: { ...current, ...patch } }
    };
  });
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
  store.setState((prev) => {
    return {
      stealId: id,
      runs: { ...prev.runs, [id]: { ...current, updatedAt: Date.now() } }
    };
  });
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
  store.setState((prev) => {
    return {
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
    };
  });

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
  return Object.entries(map).map(([stepId, label], index) => {
    return {
      id: stepId,
      label,
      state: index === 0 ? "active" : "pending"
    };
  });
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
