import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type RefreshFromListingStatus = AiJobStatus;

export type RefreshFromListingState = {
  status: RefreshFromListingStatus;
  /** Live step shown in the sticky running toast (survives route changes). */
  stepLabel: string | null;
  applicationId: string | null;
  title: string | null;
  companyName: string | null;
  error: string | null;
  startedAt: number | null;
  /**
   * When set, New jobs (or the page that owns the job list) should open the
   * side panel for this application id once, then clear.
   */
  pendingOpenApplicationId: string | null;
};

const initialState: RefreshFromListingState = {
  status: "idle",
  stepLabel: null,
  applicationId: null,
  title: null,
  companyName: null,
  error: null,
  startedAt: null,
  pendingOpenApplicationId: null
};

const store = createExternalStore(initialState);

export function getRefreshFromListingState() {
  return store.getState();
}

export function setRefreshFromListingState(partial: Partial<RefreshFromListingState>) {
  store.setState(partial);
}

export function resetRefreshFromListingState() {
  store.resetState();
}

/** Request that New jobs open this application in the info panel (once). */
export function requestOpenApplicationPanel(applicationId: string) {
  store.setState({ pendingOpenApplicationId: applicationId });
}

/** Clear a pending panel open request after the page handled it. */
export function clearPendingOpenApplicationId() {
  if (store.getState().pendingOpenApplicationId != null) {
    store.setState({ pendingOpenApplicationId: null });
  }
}

/**
 * Global “Fix posting URL” UI state.
 * Survives New jobs unmount so navigation does not hide background refresh progress.
 */
export function useRefreshFromListingJob() {
  return store.useStore();
}
