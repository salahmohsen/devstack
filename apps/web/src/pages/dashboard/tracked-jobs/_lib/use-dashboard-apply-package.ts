"use client";

import {
  useAcceptApplyPackageMutation,
  useGenerateApplyPackageMutation
} from "@/features/applications";
import { useGetJobPreferenceQuery } from "@/features/job-preference";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

/** Dashboard generate/review: skip the sheet when Review apply kit is off. */
export function useDashboardApplyPackage() {
  const prefs = useGetJobPreferenceQuery();
  const reviewApplyKit = prefs.data?.reviewApplyKit ?? true;
  const generateMutation = useGenerateApplyPackageMutation();
  const acceptMutation = useAcceptApplyPackageMutation();
  const { openPackageSheet, applyPackageInFlightIds, markApplyPackageInFlight } =
    useApplicationStore();

  function isPendingFor(applicationId: string): boolean {
    return Boolean(applyPackageInFlightIds[applicationId]);
  }

  function runGenerate(applicationId: string, onGenerated?: () => void) {
    markApplyPackageInFlight(applicationId, true);
    generateMutation.mutate(
      { applicationId },
      {
        onSuccess: (data) => {
          onGenerated?.();
          if (reviewApplyKit) {
            markApplyPackageInFlight(applicationId, false);
            openPackageSheet(data.id);
            return;
          }
          acceptMutation.mutate(
            { applicationId: data.id },
            {
              onSettled: () => markApplyPackageInFlight(applicationId, false)
            }
          );
        },
        onError: () => markApplyPackageInFlight(applicationId, false)
      }
    );
  }

  function runReview(applicationId: string) {
    if (reviewApplyKit) {
      openPackageSheet(applicationId);
      return;
    }
    markApplyPackageInFlight(applicationId, true);
    acceptMutation.mutate(
      { applicationId },
      {
        onSettled: () => markApplyPackageInFlight(applicationId, false)
      }
    );
  }

  return {
    reviewApplyKit,
    runGenerate,
    runReview,
    generateMutation,
    acceptMutation,
    isPendingFor
  };
}
