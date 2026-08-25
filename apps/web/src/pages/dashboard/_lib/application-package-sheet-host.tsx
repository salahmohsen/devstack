"use client";

import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

const ApplyPackageSheet = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-sheet").then((m) => {
    return { default: m.ApplyPackageSheet };
  })
);

/**
 * Layout host for Review apply package sheet.
 * Prepare/Review CTAs live in ApplicationInfoPanel (agent inspect + Tracked jobs);
 * the sheet must not depend on Tracked jobs page mount.
 */
export function ApplicationPackageSheetHost() {
  const { packageSheetAppId, closePackageSheet } = useApplicationStore();

  const applicationQuery = useQuery({
    ...orpcQueryClient.applications.get.queryOptions({
      input: { id: packageSheetAppId ?? "" }
    }),
    enabled: packageSheetAppId != null
  });

  if (!packageSheetAppId) return null;

  return (
    <Suspense fallback={null}>
      <ApplyPackageSheet
        open
        application={applicationQuery.data ?? null}
        onOpenChange={(open) => {
          if (!open) closePackageSheet();
        }}
      />
    </Suspense>
  );
}
