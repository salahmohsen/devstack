import { useRef, useSyncExternalStore } from "react";

import { type DetectStacksResult } from "@tsu-stack/core";

import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type DetectJobStatus = AiJobStatus;

export type DetectJobState = {
  status: DetectJobStatus;
  /** Human-readable step while running */
  stepLabel: string | null;
  /** Mastra run id (for explicit cancel) */
  runId: string | null;
  /** Detection results awaiting review */
  results: DetectStacksResult | null;
  error: string | null;
  /** Open review dialog (survives navigation) */
  dialogOpen: boolean;
  /** Project the job was started for */
  projectId: string | null;
  startedAt: number | null;
};

const initialState: DetectJobState = {
  status: "idle",
  stepLabel: null,
  runId: null,
  results: null,
  error: null,
  dialogOpen: false,
  projectId: null,
  startedAt: null
};

const store = createExternalStore(initialState);

export function getDetectJobState() {
  return store.getState();
}

export function setDetectJobState(partial: Partial<DetectJobState>) {
  store.setState(partial);
}

export function resetDetectJobState() {
  store.resetState();
}

/**
 * Global detect-stacks job UI state.
 * Survives route unmount so navigation does not drop a running/ready job.
 */
export function useDetectStacksJob() {
  return store.useStore();
}

/**
 * Subscribe to a slice of the detect job. Avoids re-rendering consumers
 * on every stepLabel tick while the job runs.
 */
export function useDetectStacksJobSelector<S>(selector: (state: DetectJobState) => S): S {
  const selectedRef = useRef<S>(selector(store.getState()));

  return useSyncExternalStore(
    store.subscribe,
    () => {
      const next = selector(store.getState());
      if (Object.is(next, selectedRef.current)) return selectedRef.current;
      selectedRef.current = next;
      return next;
    },
    () => selector(store.getState())
  );
}
