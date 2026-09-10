import { useMemo, useSyncExternalStore } from "react";

import { type ApplicationOutput } from "@tsu-stack/core";

import { expandDashboardSidePanel, subscribeSidePanelClose } from "@/shared/lib/side-panel-control";

import { releaseEntityPanelHosts } from "@/features/agent-hub";
import { type ApplicationMaterialKind } from "@/features/applications";

import { peekSidePanelFrame } from "@/pages/dashboard/_lib/side-panel-stack";

export type { ApplicationMaterialKind };

type SheetMode = "create" | "edit";

/** What Prepare is waiting on when Review-off chains generate → accept. */
export type ApplyPackageBusyPhase = "drafting" | "building-pdfs";

/** Active section inside the apply package review dialog. */
export type ApplyPackageSection = "resume" | "cover" | "email";

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
  /** Spinner copy phase while apply-package is in flight. */
  applyPackageBusyPhaseById: Record<string, ApplyPackageBusyPhase>;
  /** Apply package review dialog (application id). */
  packageDialogAppId: string | null;
  /** Active section inside the review dialog. */
  packageDialogSection: ApplyPackageSection;
  /**
   * `draft.generatedAt` of the last accepted draft, per application.
   * Kit currency = live draft's generatedAt matches this marker; module
   * state so the marker survives dialog remounts.
   */
  acceptedDraftGeneratedAtById: Record<string, string | undefined>;
  /**
   * New jobs "Track & package" handoff: prepare after Tracked jobs mounts.
   * Kept in module state so navigate does not drop the intent with the page.
   */
  pendingPreparePackageId: string | null;
  /**
   * Delete confirm dialog (full row snapshot).
   * Layout host — Menu/ContextMenu unmount on item click and would
   * dismiss an in-menu AlertDialog immediately. Snapshot keeps Confirm
   * enabled after list/get invalidate.
   */
  deleteConfirmApp: ApplicationOutput | null;
  /**
   * Prepare again / Regenerate confirm (application id).
   * Layout host — must not live inside Menu (unmount closes it) or race the
   * opening click as a dialog outside dismiss.
   */
  regenerateConfirmAppId: string | null;
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
  setApplyPackageBusyPhase: (id: string, phase: ApplyPackageBusyPhase | null) => void;
  openPackageDialog: (applicationId: string, section?: ApplyPackageSection) => void;
  setPackageDialogSection: (section: ApplyPackageSection) => void;
  closePackageDialog: () => void;
  /** Record / clear the accepted-draft generatedAt marker (null clears). */
  setAcceptedDraftGeneratedAt: (id: string, generatedAt: string | null) => void;
  /** Queue Prepare for after Tracked jobs opens (Track & package). */
  requestPreparePackage: (applicationId: string) => void;
  clearPendingPreparePackage: () => void;
  openDeleteConfirm: (app: ApplicationOutput) => void;
  closeDeleteConfirm: () => void;
  openRegenerateConfirm: (applicationId: string) => void;
  closeRegenerateConfirm: () => void;
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
  applyPackageBusyPhaseById: {},
  packageDialogAppId: null,
  packageDialogSection: "resume",
  acceptedDraftGeneratedAtById: {},
  pendingPreparePackageId: null,
  deleteConfirmApp: null,
  regenerateConfirmAppId: null,
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
  setApplyPackageBusyPhase: (id, phase) => {
    const next = { ...state.applyPackageBusyPhaseById };
    if (phase == null) delete next[id];
    else next[id] = phase;
    setState({ applyPackageBusyPhaseById: next });
  },
  // Defer overlay opens past the triggering pointerup so Base UI does not
  // treat that same gesture as an outside dismiss (flash-then-close).
  openPackageDialog: (applicationId, section) => {
    window.setTimeout(() => {
      setState({
        packageDialogAppId: applicationId,
        packageDialogSection: section ?? "resume"
      });
    }, 50);
  },
  setPackageDialogSection: (section) => setState({ packageDialogSection: section }),
  closePackageDialog: () => setState({ packageDialogAppId: null }),
  setAcceptedDraftGeneratedAt: (id, generatedAt) => {
    const next = { ...state.acceptedDraftGeneratedAtById };
    if (generatedAt == null) delete next[id];
    else next[id] = generatedAt;
    setState({ acceptedDraftGeneratedAtById: next });
  },
  requestPreparePackage: (applicationId) => {
    const nextInFlight = { ...state.applyPackageInFlightIds, [applicationId]: true as const };
    const nextPhase = {
      ...state.applyPackageBusyPhaseById,
      [applicationId]: "drafting" as const
    };
    setState({
      pendingPreparePackageId: applicationId,
      applyPackageInFlightIds: nextInFlight,
      applyPackageBusyPhaseById: nextPhase
    });
  },
  clearPendingPreparePackage: () => setState({ pendingPreparePackageId: null }),
  openDeleteConfirm: (app) => {
    window.setTimeout(() => setState({ deleteConfirmApp: app }), 50);
  },
  closeDeleteConfirm: () => setState({ deleteConfirmApp: null }),
  openRegenerateConfirm: (applicationId) => {
    window.setTimeout(() => setState({ regenerateConfirmAppId: applicationId }), 50);
  },
  closeRegenerateConfirm: () => setState({ regenerateConfirmAppId: null }),
  openImportJdSheet: () => setState({ importJdSheetOpen: true }),
  closeImportJdSheet: () => setState({ importJdSheetOpen: false }),
  openMaterialPreview: (applicationId, kind) => {
    window.setTimeout(() => setState({ materialPreview: { applicationId, kind } }), 50);
  },
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
