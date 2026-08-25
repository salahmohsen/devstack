"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  consumePreparePackageHandoffId,
  getPreparePackageHandoffId,
  subscribePreparePackageHandoff
} from "@/shared/lib/prepare-package-handoff";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { useDashboardApplyPackage } from "@/pages/dashboard/tracked-jobs/_lib/use-dashboard-apply-package";

/**
 * Consumes Track & package / hub Continue-with-package handoffs on any
 * dashboard route (agent inspect or Tracked jobs). Must live in layout so
 * Prepare still starts when we stay on /dashboard/agent.
 */
export function PendingPreparePackageHost() {
  const handoffId = useSyncExternalStore(
    subscribePreparePackageHandoff,
    getPreparePackageHandoffId,
    getPreparePackageHandoffId
  );
  const { pendingPreparePackageId, clearPendingPreparePackage } = useApplicationStore();
  const { runGenerate } = useDashboardApplyPackage();

  useEffect(() => {
    if (handoffId) {
      const applicationId = consumePreparePackageHandoffId();
      if (applicationId) runGenerate(applicationId);
      return;
    }
    if (!pendingPreparePackageId) return;
    const applicationId = pendingPreparePackageId;
    clearPendingPreparePackage();
    runGenerate(applicationId);
  }, [handoffId, pendingPreparePackageId, clearPendingPreparePackage, runGenerate]);

  return null;
}
