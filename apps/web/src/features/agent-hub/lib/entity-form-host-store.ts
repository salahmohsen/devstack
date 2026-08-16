import { useRef, useSyncExternalStore } from "react";

import { createExternalStore } from "@/shared/lib/ai-job";

export type EntityFormKind = "experience" | "project" | "stack";

export type EntityFormHostRequest = {
  requestId: string;
  kind: EntityFormKind;
  id: string | null;
  toolCallId: string;
  toolName: string;
  /** False when the user opened Edit from inspect — no hub tool to complete. */
  completeOnClose?: boolean;
};

type EntityFormHostState = {
  request: EntityFormHostRequest | null;
};

const store = createExternalStore<EntityFormHostState>({ request: null });
const dismissedToolCallIds = new Set<string>();
const approvedToolCallIds = new Set<string>();

export function getEntityFormHostState() {
  return store.getState();
}

export function isEntityFormCallDismissed(toolCallId: string): boolean {
  return toolCallId.length > 0 && dismissedToolCallIds.has(toolCallId);
}

export function isEntityFormCallApproved(toolCallId: string): boolean {
  return toolCallId.length > 0 && approvedToolCallIds.has(toolCallId);
}

export function approveEntityFormCall(toolCallId: string) {
  if (toolCallId) approvedToolCallIds.add(toolCallId);
}

export function dismissEntityFormCalls(toolCallIds: readonly string[]) {
  for (const id of toolCallIds) {
    if (id) dismissedToolCallIds.add(id);
  }
  const current = store.getState().request;
  if (current && dismissedToolCallIds.has(current.toolCallId)) {
    store.setState({ request: null });
  }
}

export function requestEntityForm(request: EntityFormHostRequest) {
  if (isEntityFormCallDismissed(request.toolCallId)) return;
  store.setState({ request });
}

export function clearEntityFormRequest(requestId?: string) {
  const current = store.getState().request;
  if (!current) return;
  if (requestId && current.requestId !== requestId) return;
  store.setState({ request: null });
}

export function resetEntityFormHostForTests() {
  dismissedToolCallIds.clear();
  approvedToolCallIds.clear();
  store.setState({ request: null });
}

/**
 * Subscribe to a slice of the dashboard entity-form host.
 * Survives route unmount so chat can open a form on the current dashboard page.
 */
export function useEntityFormHostSelector<S>(selector: (state: EntityFormHostState) => S): S {
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

/** True when chat owns the side panel — any page-local EntityFormSheet must close. */
export function useEntityFormHostActive(): boolean {
  return useEntityFormHostSelector((state) => state.request != null);
}
