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
  const { openPackageSheet } = useApplicationStore();
  const pending = generateMutation.isPending || acceptMutation.isPending;

  function runGenerate(applicationId: string, onGenerated?: () => void) {
    generateMutation.mutate(
      { applicationId },
      {
        onSuccess: (data) => {
          onGenerated?.();
          if (reviewApplyKit) {
            openPackageSheet(data.id);
            return;
          }
          acceptMutation.mutate({ applicationId: data.id });
        }
      }
    );
  }

  function runReview(applicationId: string) {
    if (reviewApplyKit) {
      openPackageSheet(applicationId);
      return;
    }
    acceptMutation.mutate({ applicationId });
  }

  return {
    reviewApplyKit,
    runGenerate,
    runReview,
    generateMutation,
    acceptMutation,
    pending
  };
}
