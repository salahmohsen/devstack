"use client";

import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { Dialog, DialogPopup } from "@tsu-stack/ui/components/dialog";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

const ApplyPackageDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-dialog").then((m) => {
    return { default: m.ApplyPackageDialog };
  })
);

/**
 * Layout host for the Review apply package dialog (Paper Studio).
 * Prepare/Review/Send CTAs live in ApplicationInfoPanel + entry actions;
 * the dialog must not depend on Tracked jobs page mount.
 */
export function ApplicationPackageDialogHost() {
  const { packageDialogAppId, closePackageDialog, applyPackageInFlightIds } = useApplicationStore();

  const applicationQuery = useQuery({
    ...orpcQueryClient.applications.get.queryOptions({
      input: { id: packageDialogAppId ?? "" }
    }),
    enabled: packageDialogAppId != null
  });

  if (!packageDialogAppId) return null;

  const application = applicationQuery.data ?? null;
  // Ported busy gate: block Escape / close button / outside dismiss while a
  // package mutation is in flight for this application (marked by the dialog).
  const busy = applyPackageInFlightIds[packageDialogAppId] === true;

  return (
    <Suspense fallback={null}>
      {application ? (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) {
              if (busy) return;
              closePackageDialog();
            }
          }}
        >
          <DialogPopup
            className="flex h-[min(88vh,900px)] w-[min(94vw,1200px)] max-w-none flex-col gap-0 overflow-hidden p-0"
            bottomStickOnMobile={false}
            showCloseButton
          >
            <ApplyPackageDialog key={application.id} application={application} />
          </DialogPopup>
        </Dialog>
      ) : null}
    </Suspense>
  );
}
