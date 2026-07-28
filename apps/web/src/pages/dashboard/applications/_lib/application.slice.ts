import { useMemo, useSyncExternalStore } from "react";

import { type ApplicationOutput } from "@tsu-stack/core";

type SheetMode = "create" | "edit";
type ListFilter = "open" | "closed" | "all";

type ApplicationUIState = {
  sheetOpen: boolean;
  sheetMode: SheetMode;
  openedItem: ApplicationOutput | null;
  selectedIds: string[];
  listFilter: ListFilter;
  stageInFlightIds: Record<string, true>;
};

type ApplicationUIActions = {
  openCreate: () => void;
  openEdit: (item: ApplicationOutput) => void;
  closeSheet: () => void;
  setListFilter: (filter: ListFilter) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  markStageInFlight: (id: string, inFlight: boolean) => void;
};

let state: ApplicationUIState = {
  sheetOpen: false,
  sheetMode: "create",
  openedItem: null,
  selectedIds: [],
  listFilter: "open",
  stageInFlightIds: {}
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<ApplicationUIState>) {
  state = { ...state, ...patch };
  emit();
}

const actions: ApplicationUIActions = {
  openCreate: () => setState({ sheetOpen: true, sheetMode: "create", openedItem: null }),
  openEdit: (item) => setState({ sheetOpen: true, sheetMode: "edit", openedItem: item }),
  closeSheet: () => setState({ sheetOpen: false, openedItem: null }),
  setListFilter: (listFilter) => setState({ listFilter }),
  toggleSelect: (id) =>
    setState({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id]
    }),
  selectAll: (ids) => setState({ selectedIds: ids }),
  clearSelection: () => setState({ selectedIds: [] }),
  markStageInFlight: (id, inFlight) => {
    const next = { ...state.stageInFlightIds };
    if (inFlight) next[id] = true;
    else delete next[id];
    setState({ stageInFlightIds: next });
  }
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

/**
 * Applications page UI store (sheet, selection, list filter, drag in-flight).
 * Same external-store pattern as items-page — no zustand dependency.
 */
export function useApplicationStore(): ApplicationUIState & ApplicationUIActions {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => {
    return { ...snap, ...actions };
  }, [snap]);
}
