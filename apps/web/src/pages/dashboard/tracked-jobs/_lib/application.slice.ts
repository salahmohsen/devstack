import { useMemo, useSyncExternalStore } from "react";

import { type ApplicationOutput } from "@tsu-stack/core";

import { expandDashboardSidePanel, subscribeSidePanelClose } from "@/shared/lib/side-panel-control";

import { releaseEntityPanelHosts } from "@/features/agent-hub";
import { type ApplicationMaterialKind } from "@/features/applications";

import { peekSidePanelFrame } from "@/pages/dashboard/_lib/side-panel-stack";

export type { ApplicationMaterialKind };

type SheetMode = "create" | "edit";

type ApplicationUIState = {
  sheetOpen: boolean;
  sheetMode: SheetMode;
  /** Item being edited in the form sheet (null when creating). */
  editItem: ApplicationOutput | null;
  /** Item shown in the list side panel (view only). */
  viewItem: ApplicationOutput | null;
  selectedIds: string[];
  stageInFlightIds: Record<string, true>;
  /** Prepare / accept apply-package in flight (keyed by application id). */
  applyPackageInFlightIds: Record<string, true>;
  /** Apply package draft review sheet (application id). */
  packageSheetAppId: string | null;
  /** Send outreach confirm dialog (application id). */
  sendOutreachAppId: string | null;
  /**
   * Delete confirm dialog (application id).
   * Page-level host — Menu/ContextMenu unmount on item click and would
   * dismiss an in-menu AlertDialog immediately.
   */
  deleteConfirmAppId: string | null;
  /** Import JD via shared hub chat sheet. */
  importJdSheetOpen: boolean;
  /**
   * Material preview dialog (page-level host).
   * Must not live inside Menu/ContextMenu — those unmount on item click and
   * would close the dialog immediately.
   */
  materialPreview: { applicationId: string; kind: ApplicationMaterialKind } | null;
};

type ApplicationUIActions = {
  openCreate: () => void;
  openEdit: (item: ApplicationOutput) => void;
  closeSheet: () => void;
  /** Toggle side panel: same item closes, different item switches. */
  openView: (item: ApplicationOutput) => void;
  /** Always open the info panel for this item (no toggle). */
  showView: (item: ApplicationOutput) => void;
  closeView: () => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  markStageInFlight: (id: string, inFlight: boolean) => void;
  markApplyPackageInFlight: (id: string, inFlight: boolean) => void;
  openPackageSheet: (applicationId: string) => void;
  closePackageSheet: () => void;
  openSendOutreach: (applicationId: string) => void;
  closeSendOutreach: () => void;
  openDeleteConfirm: (applicationId: string) => void;
  closeDeleteConfirm: () => void;
  openImportJdSheet: () => void;
  closeImportJdSheet: () => void;
  openMaterialPreview: (applicationId: string, kind: ApplicationMaterialKind) => void;
  closeMaterialPreview: () => void;
};

let state: ApplicationUIState = {
  sheetOpen: false,
  sheetMode: "create",
  editItem: null,
  viewItem: null,
  selectedIds: [],
  stageInFlightIds: {},
  applyPackageInFlightIds: {},
  packageSheetAppId: null,
  sendOutreachAppId: null,
  deleteConfirmAppId: null,
  importJdSheetOpen: false,
  materialPreview: null
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
  /** Toggle side panel: same item closes, different item switches. */
  openView: (item) => {
    if (state.viewItem?.id === item.id) {
      setState({ viewItem: null });
      return;
    }
    releaseEntityPanelHosts();
    expandDashboardSidePanel();
    setState({ viewItem: item });
  },
  showView: (item) => {
    releaseEntityPanelHosts();
    expandDashboardSidePanel();
    setState({ viewItem: item });
  },
  closeView: () => setState({ viewItem: null }),
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
  },
  markApplyPackageInFlight: (id, inFlight) => {
    const next = { ...state.applyPackageInFlightIds };
    if (inFlight) next[id] = true;
    else delete next[id];
    setState({ applyPackageInFlightIds: next });
  },
  openPackageSheet: (applicationId) => setState({ packageSheetAppId: applicationId }),
  closePackageSheet: () => setState({ packageSheetAppId: null }),
  openSendOutreach: (applicationId) => setState({ sendOutreachAppId: applicationId }),
  closeSendOutreach: () => setState({ sendOutreachAppId: null }),
  openDeleteConfirm: (applicationId) => setState({ deleteConfirmAppId: applicationId }),
  closeDeleteConfirm: () => setState({ deleteConfirmAppId: null }),
  openImportJdSheet: () => setState({ importJdSheetOpen: true }),
  closeImportJdSheet: () => setState({ importJdSheetOpen: false }),
  openMaterialPreview: (applicationId, kind) =>
    setState({ materialPreview: { applicationId, kind } }),
  closeMaterialPreview: () => setState({ materialPreview: null })
};

subscribeSidePanelClose(() => {
  // Create-skill form is popped by dismiss guard; keep the job inspect open.
  if (peekSidePanelFrame()?.type === "stack-create") return;
  if (state.viewItem != null) setState({ viewItem: null });
});

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
