import { type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationOutput, type ApplicationTrackingStatus } from "@tsu-stack/core";

import {
  AiJobRunningToastBody,
  clearStepTimers,
  createDetachedJobController,
  isAbortError,
  scheduleStepLabels,
  showAiJobRunningToast,
  type AiJobStepSchedule
} from "@/shared/lib/ai-job";
import { toastAiError } from "@/shared/lib/toast-ai-error";

import {
  getAgentTakeJobState,
  requestOpenApplicationPanelFromTake,
  setAgentTakeJobState,
  useAgentTakeJob
} from "@/features/applications/lib/agent-take-store";
import { patchApplicationInLists } from "@/features/applications/lib/application-list-cache";
import { requestOpenApplicationPanel } from "@/features/applications/lib/refresh-from-listing-store";

/** Stable sonner id so step updates + dismiss work across navigations. */
const TAKE_TOAST_ID = "regenerate-agent-take-job";

const STEP_SCHEDULE_MS: AiJobStepSchedule = [
  { at: 0, label: "Gathering job context…" },
  { at: 800, label: "Writing agent take…" },
  { at: 6_000, label: "Polishing fit narrative…" }
];

const jobController = createDetachedJobController({
  cancelRemoteRun: () => undefined
});

function TakeRunningToastBody() {
  const { stepLabel, title, companyName } = useAgentTakeJob();
  const subtitle =
    title && companyName ? `${title} · ${companyName}` : (title ?? companyName ?? null);
  return (
    <AiJobRunningToastBody
      title={subtitle ? `Agent take — ${subtitle}` : "Generating agent take…"}
      stepLabel={stepLabel}
    />
  );
}

function showRunningToast() {
  showAiJobRunningToast({
    id: TAKE_TOAST_ID,
    cancelLabel: "Dismiss",
    onCancel: dismissAgentTakeTracking,
    body: <TakeRunningToastBody />
  });
}

function writeApplicationCache(queryClient: QueryClient, data: ApplicationOutput) {
  patchApplicationInLists(queryClient, data);
}

/**
 * Stop tracking UI only. In-flight RPC may still complete; results ignored when
 * generation no longer matches.
 */
export function dismissAgentTakeTracking() {
  const state = getAgentTakeJobState();
  if (state.status !== "running") {
    toast.dismiss(TAKE_TOAST_ID);
    return;
  }
  jobController.cancel(null);
  toast.dismiss(TAKE_TOAST_ID);
  setAgentTakeJobState({
    status: "canceled",
    stepLabel: null,
    error: null
  });
}

export type StartRegenerateAgentTakeInput = {
  id: string;
  title: string;
  companyName: string;
  /** Prefer New jobs panel open when the row lives in inbox. */
  trackingStatus?: ApplicationTrackingStatus | null;
};

/**
 * Generate/regenerate agent take as a detached job with sticky progress toast.
 * Survives route changes (same pattern as Fix posting URL / Scan job alerts).
 */
export async function startRegenerateAgentTake(
  queryClient: QueryClient,
  input: StartRegenerateAgentTakeInput
): Promise<void> {
  const existing = getAgentTakeJobState();
  if (existing.status === "running") {
    const viewTo =
      existing.trackingStatus === "tracked" ? "/dashboard/tracked-jobs" : "/dashboard/new-jobs";
    toast.info("Agent take already running", {
      description: existing.stepLabel ?? "Working in the background…",
      action: (
        <Link
          to={viewTo}
          data-button
          onClick={() => {
            if (existing.applicationId) {
              requestOpenApplicationPanelFromTake(existing.applicationId);
              requestOpenApplicationPanel(existing.applicationId);
            }
          }}
        >
          View job
        </Link>
      )
    });
    showRunningToast();
    return;
  }

  const { generation, controller, signal } = jobController.begin();
  const stepTimers: number[] = [];

  setAgentTakeJobState({
    status: "running",
    stepLabel: STEP_SCHEDULE_MS[0]!.label,
    applicationId: input.id,
    title: input.title,
    companyName: input.companyName,
    trackingStatus: input.trackingStatus ?? null,
    error: null,
    startedAt: Date.now()
  });
  scheduleStepLabels({
    generation,
    controller: jobController,
    schedule: STEP_SCHEDULE_MS,
    timers: stepTimers,
    setStepLabel: (label) => setAgentTakeJobState({ stepLabel: label })
  });
  showRunningToast();

  try {
    const data = await orpcClient.applications.regenerateAgentTake({ id: input.id }, { signal });

    if (!jobController.isCurrent(generation)) return;

    clearStepTimers(stepTimers);
    writeApplicationCache(queryClient, data);

    if (!jobController.isCurrent(generation)) return;

    toast.dismiss(TAKE_TOAST_ID);
    setAgentTakeJobState({
      status: "ready",
      stepLabel: null,
      applicationId: data.id,
      title: data.title,
      companyName: data.companyName,
      error: null
    });

    const isInbox = (input.trackingStatus ?? data.trackingStatus) === "inbox";
    toast.success("Agent take updated", {
      description: `${data.title} · ${data.companyName}`,
      action: isInbox ? (
        <Link
          to="/dashboard/new-jobs"
          data-button
          onClick={() => {
            requestOpenApplicationPanelFromTake(data.id);
            requestOpenApplicationPanel(data.id);
          }}
        >
          View job
        </Link>
      ) : (
        <Link to="/dashboard/tracked-jobs" data-button>
          Tracked jobs
        </Link>
      ),
      duration: 12_000
    });
  } catch (error) {
    if (!jobController.isCurrent(generation)) return;

    clearStepTimers(stepTimers);

    if (isAbortError(error) || controller.signal.aborted) {
      return;
    }

    toast.dismiss(TAKE_TOAST_ID);
    const orpcError = error as { code?: string; message?: string } | null;
    const code = orpcError && typeof orpcError === "object" ? orpcError.code : undefined;
    const message =
      (orpcError && typeof orpcError === "object" ? orpcError.message : undefined) ??
      (error instanceof Error ? error.message : undefined) ??
      "Could not generate agent take.";

    setAgentTakeJobState({
      status: "failed",
      stepLabel: null,
      error: message
    });

    if (code === "AI_NOT_CONFIGURED" || code === "AGENT_FAILED") {
      toastAiError(message ?? "Could not generate agent take", {
        feature: "generic",
        severity: "hard",
        action: { label: "AI settings", to: "/dashboard/settings/ai" }
      });
      return;
    }

    toast.error(message);
  } finally {
    clearStepTimers(stepTimers);
    jobController.clearIf(controller);
  }
}
