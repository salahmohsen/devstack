"use client";

import { lazy, Suspense } from "react";

import { dismissDashboardSidePanel } from "@/shared/lib/side-panel-control";

import { clearEntityInspectRequest, getEntityInspectHostState } from "@/features/agent-hub";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

const DeleteApplicationDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/delete-application-dialog").then((m) => {
    return { default: m.DeleteApplicationDialog };
  })
);

function closeInspectForDeletedApplication(applicationId: string) {
  const inspect = getEntityInspectHostState().request;
  if (inspect?.kind !== "application" || inspect.id !== applicationId) return;
  clearEntityInspectRequest();
  // Force: skip dirty-form guards. Listeners zero inspectOpen/hasContent so the
  // agent chat shell collapses even if portal unmount lags one frame.
  dismissDashboardSidePanel({ force: true });
}

/**
 * Layout host for delete confirm. Menu/panel actions call openDeleteConfirm;
 * the dialog must survive Menu unmount (agent inspect + Tracked jobs).
 * On success: clear hub inspect + dismiss the side panel shell.
 */
export function ApplicationDeleteConfirmHost() {
  const { deleteConfirmApp, closeDeleteConfirm, viewItem, closeView } = useApplicationStore();

  if (!deleteConfirmApp) return null;

  return (
    <Suspense fallback={null}>
      <DeleteApplicationDialog
        open
        application={deleteConfirmApp}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirm();
        }}
        onDeleted={(applicationId) => {
          if (viewItem?.id === applicationId) closeView();
          closeInspectForDeletedApplication(applicationId);
        }}
      />
    </Suspense>
  );
}
