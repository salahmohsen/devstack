import { useRef, useSyncExternalStore } from "react";

import { createExternalStore } from "@/shared/lib/ai-job";
import { subscribeSidePanelClose } from "@/shared/lib/side-panel-control";

export type DailyBriefHostRequest = {
  requestId: string;
  markdown: string;
  inboxCount: number;
  trackedCount: number;
  mailCount: number;
};

type DailyBriefHostState = {
  request: DailyBriefHostRequest | null;
};

const store = createExternalStore<DailyBriefHostState>({ request: null });

subscribeSidePanelClose(() => {
  if (store.getState().request) store.setState({ request: null });
});

export function getDailyBriefHostState() {
  return store.getState();
}

export function requestDailyBrief(request: DailyBriefHostRequest) {
  store.setState({ request });
}

export function clearDailyBriefRequest(requestId?: string) {
  const current = store.getState().request;
  if (!current) return;
  if (requestId && current.requestId !== requestId) return;
  store.setState({ request: null });
}

export function resetDailyBriefHostForTests() {
  store.setState({ request: null });
}

export function useDailyBriefHostSelector<S>(selector: (state: DailyBriefHostState) => S): S {
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

export function useDailyBriefHostActive(): boolean {
  return useDailyBriefHostSelector((state) => state.request != null);
}
