"use client";

import { useQuery } from "@tanstack/react-query";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";

import {
  APPLICATION_PRIMARY_ACTION_LABELS,
  getApplyPackageEntryState
} from "@/features/applications";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { useDashboardApplyPackage } from "@/pages/dashboard/tracked-jobs/_lib/use-dashboard-apply-package";

/**
 * Layout host for Prepare again / Regenerate confirm.
 * Must not live inside Menu (closes on item click) or race the opening click.
 */
export function ApplicationRegenerateConfirmHost() {
  const { regenerateConfirmAppId, closeRegenerateConfirm } = useApplicationStore();
  const { reviewApplyKit, runGenerate, isPendingFor } = useDashboardApplyPackage();

  const applicationQuery = useQuery({
    ...orpcQueryClient.applications.get.queryOptions({
      input: { id: regenerateConfirmAppId ?? "" }
    }),
    enabled: regenerateConfirmAppId != null
  });

  if (!regenerateConfirmAppId) return null;

  const app = applicationQuery.data ?? null;
  const entryState = app ? getApplyPackageEntryState(app, { reviewApplyKit }) : "none";
  const acceptedTone = entryState === "accepted";
  const generating = isPendingFor(regenerateConfirmAppId);

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) closeRegenerateConfirm();
      }}
      title={acceptedTone ? "Prepare a new package?" : "Regenerate apply package?"}
      description={
        acceptedTone
          ? "AI will draft a new package. Your current resume and cover letter stay until you Accept the new package."
          : "This runs AI again and overwrites the current draft. Uses your BYO model quota."
      }
      confirmLabel={acceptedTone ? APPLICATION_PRIMARY_ACTION_LABELS.prepareAgain : "Regenerate"}
      confirmLoading={generating}
      confirmDisabled={!app}
      onConfirm={() => {
        if (!app) return;
        runGenerate(app.id, () => closeRegenerateConfirm());
      }}
    />
  );
}
