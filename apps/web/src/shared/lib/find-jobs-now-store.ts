import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type FindJobsNowStatus = AiJobStatus;

export type FindJobsNowState = {
  status: FindJobsNowStatus;
  /** Live step shown in the sticky running toast (survives route changes). */
  stepLabel: string | null;
  ingestTriggered: boolean;
  seats: number;
  newJobsFound: number;
  error: string | null;
  startedAt: number | null;
};

const initialState: FindJobsNowState = {
  status: "idle",
  stepLabel: null,
  ingestTriggered: false,
  seats: 0,
  newJobsFound: 0,
  error: null,
  startedAt: null
};

const store = createExternalStore(initialState);

export function getFindJobsNowState() {
  return store.getState();
}

export function setFindJobsNowState(partial: Partial<FindJobsNowState>) {
  store.setState(partial);
}

export function resetFindJobsNowState() {
  store.resetState();
}

/**
 * Global “Find jobs now” UI state.
 * Survives New jobs unmount so navigation does not hide background land progress.
 */
export function useFindJobsNowJob() {
  return store.useStore();
}
