import { type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationOutput, isThinJobDescription } from "@tsu-stack/core";

import {
  appendIslandStep,
  clearStepTimers,
  completeAiJobIsland,
  createDetachedJobController,
  dismissAiJobIsland,
  isAbortError,
  scheduleStepLabels,
  upsertAiJobIsland,
  type AiJobStepSchedule
} from "@/shared/lib/ai-job";
import { presentAiError } from "@/shared/lib/parse-ai-error";

import { patchApplicationInLists } from "@/features/applications/lib/application-list-cache";
import {
  getRefreshFromListingState,
  requestOpenApplicationPanel,
  setRefreshFromListingState
} from "@/features/applications/lib/refresh-from-listing-store";

/** Stable island id so step updates + dismiss work across navigations. */
const REFRESH_TOAST_ID = "refresh-from-listing-job";

/** Client-side step labels while the single RPC runs (server has no stream yet). */
const STEP_SCHEDULE_MS: AiJobStepSchedule = [
  { at: 0, label: "Checking listing URL…" },
  { at: 500, label: "Fetching listing…" },
  { at: 2_200, label: "Reading listing…" },
  { at: 7_500, label: "Rescoring match…" },
  { at: 14_000, label: "Rewriting agent take…" },
  { at: 22_000, label: "Saving details…" }
];

const jobController = createDetachedJobController({
  cancelRemoteRun: () => undefined
});

function writeApplicationCache(queryClient: QueryClient, data: ApplicationOutput) {
  patchApplicationInLists(queryClient, data);
}

function showRunningIsland(activeStepLabel: string) {
  upsertAiJobIsland({
    id: REFRESH_TOAST_ID,
    title: "Updating job details…",
    cancelLabel: "Dismiss",
    onCancel: dismissRefreshFromListingTracking,
    steps: [{ id: "step-0", label: activeStepLabel, state: "active" }],
    activeStepLabel
  });
}

/**
 * Stop tracking UI only. In-flight RPC may still complete; results are ignored
 * when generation no longer matches.
 */
export function dismissRefreshFromListingTracking() {
  const state = getRefreshFromListingState();
  if (state.status !== "running") {
    dismissAiJobIsland(REFRESH_TOAST_ID);
    return;
  }
  jobController.cancel(null);
  dismissAiJobIsland(REFRESH_TOAST_ID);
  setRefreshFromListingState({
    status: "canceled",
    stepLabel: null,
    error: null
  });
}

export type StartRefreshFromListingInput = {
  id: string;
  url: string;
  title: string;
  companyName: string;
};

/**
 * Re-fetch + AI extract job details as a detached job with sticky island progress.
 * Survives route changes (same pattern as Scan job alerts / resume extract).
 */
export async function startRefreshFromListingUrl(
  queryClient: QueryClient,
  input: StartRefreshFromListingInput
): Promise<void> {
  const existing = getRefreshFromListingState();
  if (existing.status === "running") {
    toast.info("Job details update already running", {
      description: existing.stepLabel ?? "Working in the background…",
      action: (
        <Link
          to="/dashboard/new-jobs"
          data-button
          onClick={() => {
            if (existing.applicationId) {
              requestOpenApplicationPanel(existing.applicationId);
            }
          }}
        >
          View job
        </Link>
      )
    });
    upsertAiJobIsland({
      id: REFRESH_TOAST_ID,
      title: "Updating job details…",
      cancelLabel: "Dismiss",
      onCancel: dismissRefreshFromListingTracking,
      activeStepLabel: existing.stepLabel
    });
    return;
  }

  const { generation, controller, signal } = jobController.begin();
  const stepTimers: number[] = [];
  const initialLabel = STEP_SCHEDULE_MS[0]!.label;

  setRefreshFromListingState({
    status: "running",
    stepLabel: initialLabel,
    applicationId: input.id,
    title: input.title,
    companyName: input.companyName,
    error: null,
    startedAt: Date.now()
  });
  showRunningIsland(initialLabel);
  scheduleStepLabels({
    generation,
    controller: jobController,
    schedule: STEP_SCHEDULE_MS,
    timers: stepTimers,
    setStepLabel: (label) => {
      setRefreshFromListingState({ stepLabel: label });
      appendIslandStep(REFRESH_TOAST_ID, label);
    }
  });

  try {
    const data = await orpcClient.applications.refreshFromListingUrl(
      { id: input.id, url: input.url },
      { signal }
    );

    if (!jobController.isCurrent(generation)) return;

    clearStepTimers(stepTimers);
    writeApplicationCache(queryClient, data);

    if (!jobController.isCurrent(generation)) return;

    setRefreshFromListingState({
      status: "ready",
      stepLabel: null,
      applicationId: data.id,
      title: data.title,
      companyName: data.companyName,
      error: null
    });

    const usable = !isThinJobDescription(data.description);
    const matchNote =
      data.matchScore != null ? `${data.matchScore}% match` : "match score unchanged";
    const takeNote = data.agentTake?.trim() ? "agent take refreshed" : "agent take not updated";

    if (usable) {
      completeAiJobIsland(REFRESH_TOAST_ID, {
        status: "success",
        resultTitle: "Job details updated",
        errorMessage: `${data.title} · ${data.companyName} · ${matchNote}; ${takeNote}.`,
        requiresAction: false
      });
    } else {
      completeAiJobIsland(REFRESH_TOAST_ID, {
        status: "success",
        resultTitle: "URL saved — description still thin",
        errorMessage:
          "We saved the posting URL, but the page still looks incomplete. Try another link or add the description manually.",
        requiresAction: false
      });
    }
  } catch (error) {
    if (!jobController.isCurrent(generation)) return;

    clearStepTimers(stepTimers);

    if (isAbortError(error) || controller.signal.aborted) {
      return;
    }

    const orpcError = error as { code?: string; message?: string } | null;
    const code = orpcError && typeof orpcError === "object" ? orpcError.code : undefined;
    const message =
      (orpcError && typeof orpcError === "object" ? orpcError.message : undefined) ??
      (error instanceof Error ? error.message : undefined) ??
      "Could not refresh listing.";

    setRefreshFromListingState({
      status: "failed",
      stepLabel: null,
      error: message
    });

    const presentation = presentAiError(message ?? "Configure a BYO API key under Settings → AI", {
      feature: "generic",
      severity: "hard"
    });
    const needsSettings = code === "AI_NOT_CONFIGURED" || presentation.showAiSettings;

    completeAiJobIsland(REFRESH_TOAST_ID, {
      status: "error",
      resultTitle: presentation.title,
      errorMessage: presentation.description,
      requiresAction: needsSettings,
      resultAction: needsSettings
        ? { label: "Settings → AI", to: "/dashboard/settings/ai" }
        : undefined
    });
  } finally {
    clearStepTimers(stepTimers);
    jobController.clearIf(controller);
  }
}
