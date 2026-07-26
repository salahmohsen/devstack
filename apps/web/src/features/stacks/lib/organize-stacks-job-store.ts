import { type OrganizeAction } from "@tsu-stack/core";

import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type OrganizeJobStatus = AiJobStatus;

export type OrganizeJobState = {
  status: OrganizeJobStatus;
  /** Human-readable step while running */
  stepLabel: string | null;
  /** Mastra run id (for explicit cancel) */
  runId: string | null;
  /** Proposed actions awaiting review */
  actions: OrganizeAction[];
  sortOrder: string[];
  error: string | null;
  /** Open review dialog (survives navigation) */
  dialogOpen: boolean;
  startedAt: number | null;
};

const initialState: OrganizeJobState = {
  status: "idle",
  stepLabel: null,
  runId: null,
  actions: [],
  sortOrder: [],
  error: null,
  dialogOpen: false,
  startedAt: null
};

const store = createExternalStore(initialState);

export function getOrganizeJobState() {
  return store.getState();
}

export function setOrganizeJobState(partial: Partial<OrganizeJobState>) {
  store.setState(partial);
}

export function resetOrganizeJobState() {
  store.resetState();
}

/**
 * Global organize-stacks job UI state.
 * Survives stacks page unmount so navigation does not drop a running/ready job.
 */
export function useOrganizeStacksJob() {
  return store.useStore();
}
