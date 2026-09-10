"use client";

import { useCallback } from "react";

import {
  useAcceptApplyPackageMutation,
  useGenerateApplyPackageMutation
} from "@/features/applications";
import { useGetJobPreferenceQuery } from "@/features/job-preference";

import {
  useApplicationStore,
  type ApplyPackageBusyPhase
} from "@/pages/dashboard/tracked-jobs/_lib/application.slice";

export type { ApplyPackageBusyPhase };

/** Dashboard generate/review: skip the sheet when Review apply kit is off. */
export function useDashboardApplyPackage() {
  const prefs = useGetJobPreferenceQuery();
  const reviewApplyKit = prefs.data?.reviewApplyKit ?? true;
  const generateMutation = useGenerateApplyPackageMutation();
  const acceptMutation = useAcceptApplyPackageMutation();
  const {
    openPackageDialog,
    applyPackageInFlightIds,
    applyPackageBusyPhaseById,
    markApplyPackageInFlight,
    setApplyPackageBusyPhase
  } = useApplicationStore();

  const isPendingFor = useCallback(
    (applicationId: string) => Boolean(applyPackageInFlightIds[applicationId]),
    [applyPackageInFlightIds]
  );

  const busyPhaseFor = useCallback(
    (applicationId: string): ApplyPackageBusyPhase | null =>
      applyPackageBusyPhaseById[applicationId] ?? null,
    [applyPackageBusyPhaseById]
  );

  const busyLabelFor = useCallback(
    (applicationId: string): string | null => {
      const phase = applyPackageBusyPhaseById[applicationId];
      if (phase === "drafting") return "Drafting…";
      if (phase === "building-pdfs") return "Building PDFs…";
      if (applyPackageInFlightIds[applicationId]) return "Preparing…";
      return null;
    },
    [applyPackageBusyPhaseById, applyPackageInFlightIds]
  );

  const runGenerate = useCallback(
    (applicationId: string, onGenerated?: () => void) => {
      markApplyPackageInFlight(applicationId, true);
      setApplyPackageBusyPhase(applicationId, "drafting");
      generateMutation.mutate(
        { applicationId },
        {
          onSuccess: (data) => {
            onGenerated?.();
            if (reviewApplyKit) {
              setApplyPackageBusyPhase(applicationId, null);
              markApplyPackageInFlight(applicationId, false);
              openPackageDialog(data.id, "resume");
              return;
            }
            setApplyPackageBusyPhase(applicationId, "building-pdfs");
            acceptMutation.mutate(
              { applicationId: data.id },
              {
                onSettled: () => {
                  setApplyPackageBusyPhase(applicationId, null);
                  markApplyPackageInFlight(applicationId, false);
                }
              }
            );
          },
          onError: () => {
            setApplyPackageBusyPhase(applicationId, null);
            markApplyPackageInFlight(applicationId, false);
          }
        }
      );
    },
    [
      acceptMutation,
      generateMutation,
      markApplyPackageInFlight,
      openPackageDialog,
      reviewApplyKit,
      setApplyPackageBusyPhase
    ]
  );

  const runReview = useCallback(
    (applicationId: string) => {
      if (reviewApplyKit) {
        openPackageDialog(applicationId, "resume");
        return;
      }
      markApplyPackageInFlight(applicationId, true);
      setApplyPackageBusyPhase(applicationId, "building-pdfs");
      acceptMutation.mutate(
        { applicationId },
        {
          onSettled: () => {
            setApplyPackageBusyPhase(applicationId, null);
            markApplyPackageInFlight(applicationId, false);
          }
        }
      );
    },
    [
      acceptMutation,
      markApplyPackageInFlight,
      openPackageDialog,
      reviewApplyKit,
      setApplyPackageBusyPhase
    ]
  );

  return {
    reviewApplyKit,
    runGenerate,
    runReview,
    generateMutation,
    acceptMutation,
    isPendingFor,
    busyPhaseFor,
    busyLabelFor
  };
}
