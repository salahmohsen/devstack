import { useRef, useSyncExternalStore } from "react";

import { createExternalStore } from "@/shared/lib/ai-job";

export type EntityFormKind = "experience" | "project" | "stack";

export type EntityFormHostRequest = {
  requestId: string;
  kind: EntityFormKind;
  id: string | null;
  toolCallId: string;
  toolName: string;
};

type EntityFormHostState = {
  request: EntityFormHostRequest | null;
};

const store = createExternalStore<EntityFormHostState>({ request: null });

export function getEntityFormHostState() {
  return store.getState();
}

export function requestEntityForm(request: EntityFormHostRequest) {
  store.setState({ request });
}

export function clearEntityFormRequest(requestId?: string) {
  const current = store.getState().request;
  if (!current) return;
  if (requestId && current.requestId !== requestId) return;
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
