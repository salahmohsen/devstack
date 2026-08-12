import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type ScanJobAlertsStatus = AiJobStatus;

export type ScanJobAlertsState = {
  status: ScanJobAlertsStatus;
  /** Live step shown in the sticky running toast (survives route changes). */
  stepLabel: string | null;
  digestsFound: number;
  enqueued: number;
  /** Inbox count delta since scan started (best-effort as workers finish). */
  newJobsFound: number;
  error: string | null;
  startedAt: number | null;
};

const initialState: ScanJobAlertsState = {
  status: "idle",
  stepLabel: null,
  digestsFound: 0,
  enqueued: 0,
  newJobsFound: 0,
  error: null,
  startedAt: null
};

const store = createExternalStore(initialState);

export function getScanJobAlertsState() {
  return store.getState();
}

export function setScanJobAlertsState(partial: Partial<ScanJobAlertsState>) {
  store.setState(partial);
}

export function resetScanJobAlertsState() {
  store.resetState();
}

/**
 * Global “Scan job alerts” UI state.
 * Survives New jobs unmount so navigation does not hide background harvest progress.
 */
export function useScanJobAlertsJob() {
  return store.useStore();
}
