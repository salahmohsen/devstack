import { type ApplicationTrackingStatus } from "@tsu-stack/core";

import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type AgentTakeJobStatus = AiJobStatus;

export type AgentTakeJobState = {
  status: AgentTakeJobStatus;
  /** Live step shown in the sticky running toast (survives route changes). */
  stepLabel: string | null;
  applicationId: string | null;
  title: string | null;
  companyName: string | null;
  trackingStatus: ApplicationTrackingStatus | null;
  error: string | null;
  startedAt: number | null;
  /**
   * When set, New jobs should open this application in the info panel once.
   */
  pendingOpenApplicationId: string | null;
};

const initialState: AgentTakeJobState = {
  status: "idle",
  stepLabel: null,
  applicationId: null,
  title: null,
  companyName: null,
  trackingStatus: null,
  error: null,
  startedAt: null,
  pendingOpenApplicationId: null
};

const store = createExternalStore(initialState);

export function getAgentTakeJobState() {
  return store.getState();
}

export function setAgentTakeJobState(partial: Partial<AgentTakeJobState>) {
  store.setState(partial);
}

export function resetAgentTakeJobState() {
  store.resetState();
}

export function requestOpenApplicationPanelFromTake(applicationId: string) {
  store.setState({ pendingOpenApplicationId: applicationId });
}

export function clearAgentTakePendingOpen() {
  if (store.getState().pendingOpenApplicationId != null) {
    store.setState({ pendingOpenApplicationId: null });
  }
}

/**
 * Global “Regenerate agent take” UI state.
 * Survives route unmounts so the sticky toast stays accurate while navigating.
 */
export function useAgentTakeJob() {
  return store.useStore();
}
