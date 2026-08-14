import { useRef, useSyncExternalStore } from "react";

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
  /** Recommended public-profile featured stack ids (resume Skills row). */
  featuredStackIds: string[];
  /**
   * Soft-failure notes from the workflow (LLM skip/fail).
   * Shown in the review dialog so partial results are never silent.
   */
  notes: string[];
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
  featuredStackIds: [],
  notes: [],
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

/**
 * Subscribe to a slice of the organize job. Avoids re-rendering the stacks
 * grid on every stepLabel tick while the job runs.
 */
export function useOrganizeStacksJobSelector<S>(selector: (state: OrganizeJobState) => S): S {
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
