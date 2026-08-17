import { useRef, useSyncExternalStore } from "react";

import { createExternalStore } from "@/shared/lib/ai-job";
import { subscribeSidePanelClose } from "@/shared/lib/side-panel-control";

import { useDailyBriefHostActive } from "./daily-brief-host-store";
import { type EntityFormKind, useEntityFormHostActive } from "./entity-form-host-store";

export type EntityInspectHostRequest = {
  requestId: string;
  kind: EntityFormKind;
  id: string;
  toolCallId: string;
  toolName: string;
};

type EntityInspectHostState = {
  request: EntityInspectHostRequest | null;
};

const store = createExternalStore<EntityInspectHostState>({ request: null });

subscribeSidePanelClose(() => {
  if (store.getState().request) store.setState({ request: null });
});

export function getEntityInspectHostState() {
  return store.getState();
}

export function requestEntityInspect(request: EntityInspectHostRequest) {
  store.setState({ request });
}

export function clearEntityInspectRequest(requestId?: string) {
  const current = store.getState().request;
  if (!current) return;
  if (requestId && current.requestId !== requestId) return;
  store.setState({ request: null });
}

export function resetEntityInspectHostForTests() {
  store.setState({ request: null });
}

export function useEntityInspectHostSelector<S>(selector: (state: EntityInspectHostState) => S): S {
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

export function useEntityInspectHostActive(): boolean {
  return useEntityInspectHostSelector((state) => state.request != null);
}

/** Form or inspect host owns the dashboard side panel. */
export function useEntityPanelHostActive(): boolean {
  const form = useEntityFormHostActive();
  const inspect = useEntityInspectHostActive();
  const brief = useDailyBriefHostActive();
  return form || inspect || brief;
}
