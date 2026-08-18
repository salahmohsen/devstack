import { type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationOutput, type ScanJobAlertsInput } from "@tsu-stack/core";

import {
  appendIslandStep,
  completeAiJobIsland,
  createDetachedJobController,
  dismissAiJobIsland,
  isAbortError,
  upsertAiJobIsland
} from "@/shared/lib/ai-job";
import { presentAiError } from "@/shared/lib/parse-ai-error";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import {
  getScanJobAlertsState,
  setScanJobAlertsState
} from "@/features/applications/lib/scan-job-alerts-store";

/** Stable island id so step updates + dismiss work across navigations. */
const SCAN_TOAST_ID = "scan-job-alerts-job";

/**
 * Absolute poll times from enqueue (ms). Harvest is async BullMQ/Mastra work —
 * matches land under New jobs as digests finish, not only at the end.
 */
const POLL_AT_MS = [4_000, 12_000, 25_000, 45_000, 70_000, 100_000] as const;

const jobController = createDetachedJobController({
  // Harvest runs on the server queue; UI “Dismiss” only stops client tracking.
  cancelRemoteRun: () => undefined
});

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Scan tracking dismissed.", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(new DOMException("Scan tracking dismissed.", "AbortError"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function inboxCountFromCache(queryClient: QueryClient): number {
  const list = queryClient.getQueryData<ApplicationOutput[]>(applicationsQueryKeys.list("inbox"));
  if (Array.isArray(list)) return list.length;
  const count = queryClient.getQueryData<{ count: number }>(
    applicationCountQueryKeys.byStatus("inbox")
  );
  return typeof count?.count === "number" ? count.count : 0;
}

async function invalidateInbox(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.list("inbox") }),
    queryClient.invalidateQueries({
      queryKey: applicationCountQueryKeys.byStatus("inbox")
    })
  ]);
}

function stepForPoll(index: number, enqueued: number, newJobsFound: number): string {
  if (newJobsFound > 0) {
    return newJobsFound === 1 ? "1 new job so far…" : `${newJobsFound} new jobs so far…`;
  }
  if (index <= 0) {
    return enqueued === 1 ? "Harvesting 1 digest…" : `Harvesting ${enqueued} digests…`;
  }
  if (index === 1) {
    return "Scoring listings…";
  }
  if (index === 2) {
    return "Still scoring…";
  }
  if (index === 3) {
    return "Skipping duplicates…";
  }
  return "Finishing up…";
}

function setScanStepLabel(label: string) {
  setScanJobAlertsState({ stepLabel: label });
  appendIslandStep(SCAN_TOAST_ID, label);
}

function showRunningIsland() {
  upsertAiJobIsland({
    id: SCAN_TOAST_ID,
    title: "Scanning job alerts…",
    cancelLabel: "Dismiss",
    onCancel: dismissScanJobAlertsTracking,
    steps: [{ id: "step-0", label: "Looking up digests…", state: "active" }],
    activeStepLabel: "Looking up digests…"
  });
}

/**
 * Stop tracking UI only. Server harvest jobs already enqueued keep running.
 */
export function dismissScanJobAlertsTracking() {
  const state = getScanJobAlertsState();
  if (state.status !== "running") {
    dismissAiJobIsland(SCAN_TOAST_ID);
    return;
  }
  jobController.cancel(null);
  dismissAiJobIsland(SCAN_TOAST_ID);
  setScanJobAlertsState({
    status: "canceled",
    stepLabel: null,
    error: null
  });
}

/**
 * Enqueue harvest for recent job-alert digests and show sticky island progress
 * that survives route changes while workers process in the background.
 */
export async function startScanJobAlerts(
  queryClient: QueryClient,
  input?: ScanJobAlertsInput
): Promise<void> {
  const existing = getScanJobAlertsState();
  if (existing.status === "running") {
    toast.info("Scan already running", {
      description: existing.stepLabel ?? "Harvest continues in the background.",
      action: (
        <Link to="/dashboard/new-jobs" data-button>
          New jobs
        </Link>
      )
    });
    // Ensure island is visible if user dismissed it earlier in the same run.
    upsertAiJobIsland({
      id: SCAN_TOAST_ID,
      title: "Scanning job alerts…",
      cancelLabel: "Dismiss",
      onCancel: dismissScanJobAlertsTracking,
      activeStepLabel: existing.stepLabel
    });
    return;
  }

  const { generation, controller, signal } = jobController.begin();
  const baselineInbox = inboxCountFromCache(queryClient);

  setScanJobAlertsState({
    status: "running",
    stepLabel: "Looking up digests…",
    digestsFound: 0,
    enqueued: 0,
    newJobsFound: 0,
    error: null,
    startedAt: Date.now()
  });
  showRunningIsland();

  try {
    const data = await orpcClient.applications.scanJobAlerts(input ?? {}, { signal });

    if (!jobController.isCurrent(generation)) return;

    if (data.digestsFound === 0) {
      setScanJobAlertsState({
        status: "ready",
        stepLabel: null,
        digestsFound: 0,
        enqueued: 0
      });
      completeAiJobIsland(SCAN_TOAST_ID, {
        status: "success",
        resultTitle: "No job-alert digests yet",
        errorMessage: "Sync mail or wait for the next job-alert email, then try again.",
        requiresAction: false
      });
      return;
    }

    if (data.queueUnavailable) {
      setScanJobAlertsState({
        status: "failed",
        stepLabel: null,
        digestsFound: data.digestsFound,
        enqueued: 0,
        error: "Harvest queue unavailable"
      });
      completeAiJobIsland(SCAN_TOAST_ID, {
        status: "error",
        resultTitle: "Harvest queue is unavailable",
        errorMessage: "Start the server with Redis so job alerts can be processed.",
        requiresAction: false
      });
      return;
    }

    setScanJobAlertsState({
      digestsFound: data.digestsFound,
      enqueued: data.enqueued
    });
    setScanStepLabel(data.enqueued === 1 ? "Queued 1 digest…" : `Queued ${data.enqueued} digests…`);

    await invalidateInbox(queryClient);

    let newJobsFound = Math.max(0, inboxCountFromCache(queryClient) - baselineInbox);
    setScanJobAlertsState({ newJobsFound });
    setScanStepLabel(stepForPoll(0, data.enqueued, newJobsFound));

    const pollStartedAt = Date.now();
    for (let i = 0; i < POLL_AT_MS.length; i += 1) {
      const waitMs = Math.max(0, pollStartedAt + POLL_AT_MS[i]! - Date.now());
      await sleep(waitMs, signal);
      if (!jobController.isCurrent(generation)) return;

      await invalidateInbox(queryClient);
      newJobsFound = Math.max(
        newJobsFound,
        Math.max(0, inboxCountFromCache(queryClient) - baselineInbox)
      );
      setScanJobAlertsState({ newJobsFound });
      setScanStepLabel(stepForPoll(i + 1, data.enqueued, newJobsFound));
    }

    if (!jobController.isCurrent(generation)) return;

    setScanJobAlertsState({
      status: "ready",
      stepLabel: null,
      newJobsFound
    });

    if (newJobsFound > 0) {
      completeAiJobIsland(SCAN_TOAST_ID, {
        status: "success",
        resultTitle: newJobsFound === 1 ? "1 new job added" : `${newJobsFound} new jobs added`,
        errorMessage: "Matches that passed your Job preferences are under New jobs.",
        requiresAction: true,
        resultAction: { label: "Open New jobs", to: "/dashboard/new-jobs" }
      });
    } else {
      completeAiJobIsland(SCAN_TOAST_ID, {
        status: "success",
        resultTitle: "Scan finished — no new inbox jobs",
        errorMessage:
          "Digests were re-processed, but every listing URL is already on a tracked job (or below min match score). Deleting New jobs does not free URLs still on Tracked jobs — harvest never creates a second row for the same listing.",
        requiresAction: false
      });
    }
  } catch (error) {
    if (!jobController.isCurrent(generation)) return;

    if (isAbortError(error) || controller.signal.aborted) {
      // dismissScanJobAlertsTracking already updated state + dismissed island
      return;
    }

    const message = error instanceof Error ? error.message : "Could not scan job alerts.";
    setScanJobAlertsState({
      status: "failed",
      stepLabel: null,
      error: message
    });

    const presentation = presentAiError(message, {
      feature: "generic",
      severity: "hard"
    });
    completeAiJobIsland(SCAN_TOAST_ID, {
      status: "error",
      resultTitle: presentation.title,
      errorMessage: presentation.description,
      requiresAction: presentation.showAiSettings,
      resultAction: presentation.showAiSettings
        ? { label: "Settings → AI", to: "/dashboard/settings/ai" }
        : undefined
    });
  } finally {
    jobController.clearIf(controller);
  }
}
