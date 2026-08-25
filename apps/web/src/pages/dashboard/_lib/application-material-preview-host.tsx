"use client";

import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

const ApplicationMaterialPreviewDialog = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-entry-actions").then((m) => {
    return { default: m.ApplicationMaterialPreviewDialog };
  })
);

/**
 * Layout host for resume / cover / outreach preview dialogs.
 * Kit material buttons live in ApplicationInfoPanel (agent inspect + Tracked jobs);
 * the dialog must not depend on Tracked jobs page mount.
 */
export function ApplicationMaterialPreviewHost() {
  const { materialPreview, closeMaterialPreview } = useApplicationStore();
  const applicationId = materialPreview?.applicationId ?? null;
  const kind = materialPreview?.kind ?? null;

  const applicationQuery = useQuery({
    ...orpcQueryClient.applications.get.queryOptions({
      input: { id: applicationId ?? "" }
    }),
    enabled: applicationId != null
  });

  if (!materialPreview || !kind || !applicationId) return null;
  if (!applicationQuery.data) return null;

  return (
    <Suspense fallback={null}>
      <ApplicationMaterialPreviewDialog
        app={applicationQuery.data}
        kind={kind}
        open
        onOpenChange={(open) => {
          if (!open) closeMaterialPreview();
        }}
      />
    </Suspense>
  );
}
