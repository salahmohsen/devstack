import { useMemo, useSyncExternalStore } from "react";

import { type ApplicationOutput } from "@tsu-stack/core";

type SheetMode = "create" | "edit";
type ListFilter = "open" | "closed" | "all";

type ApplicationUIState = {
  sheetOpen: boolean;
  sheetMode: SheetMode;
  /** Item being edited in the form sheet (null when creating). */
  editItem: ApplicationOutput | null;
  /** Item shown in the list side panel (view only). */
  viewItem: ApplicationOutput | null;
  selectedIds: string[];
  listFilter: ListFilter;
  stageInFlightIds: Record<string, true>;
};

type ApplicationUIActions = {
  openCreate: () => void;
  openEdit: (item: ApplicationOutput) => void;
  closeSheet: () => void;
  openView: (item: ApplicationOutput) => void;
  closeView: () => void;
  setListFilter: (filter: ListFilter) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  markStageInFlight: (id: string, inFlight: boolean) => void;
};

let state: ApplicationUIState = {
  sheetOpen: false,
  sheetMode: "create",
  editItem: null,
  viewItem: null,
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
  openCreate: () => setState({ sheetOpen: true, sheetMode: "create", editItem: null }),
  openEdit: (item) => setState({ sheetOpen: true, sheetMode: "edit", editItem: item }),
  closeSheet: () => setState({ sheetOpen: false, editItem: null }),
  openView: (item) => setState({ viewItem: item }),
  closeView: () => setState({ viewItem: null }),
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

export function useApplicationStore(): ApplicationUIState & ApplicationUIActions {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => {
    return { ...snap, ...actions };
  }, [snap]);
}
