import { type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationOutput, type ScanJobAlertsInput } from "@tsu-stack/core";

import {
  AiJobRunningToastBody,
  createDetachedJobController,
  isAbortError,
  showAiJobRunningToast
} from "@/shared/lib/ai-job";

import { applicationCountQueryKeys } from "@/features/applications/api/count-applications.query";
import { applicationsQueryKeys } from "@/features/applications/api/list-applications.query";
import {
  getScanJobAlertsState,
  setScanJobAlertsState,
  useScanJobAlertsJob
} from "@/features/applications/lib/scan-job-alerts-store";

/** Stable sonner id so step updates + dismiss work across navigations. */
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

function ScanRunningToastBody() {
  const { stepLabel } = useScanJobAlertsJob();
  return <AiJobRunningToastBody title="Scanning job alerts…" stepLabel={stepLabel} />;
}

function showRunningToast() {
  showAiJobRunningToast({
    id: SCAN_TOAST_ID,
    cancelLabel: "Dismiss",
    onCancel: dismissScanJobAlertsTracking,
    body: <ScanRunningToastBody />
  });
}

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
    return newJobsFound === 1
      ? "1 new match under New jobs so far…"
      : `${newJobsFound} new matches under New jobs so far…`;
  }
  if (index <= 0) {
    return enqueued === 1
      ? "Harvesting 1 digest (extract listings, score, write matches)…"
      : `Harvesting ${enqueued} digests (extract listings, score, write matches)…`;
  }
  if (index === 1) {
    return "Fetching listing pages & scoring against Job preferences…";
  }
  if (index === 2) {
    return "Still working — only listings above your min match score appear…";
  }
  if (index === 3) {
    return "Duplicates are skipped; waiting for remaining digests…";
  }
  return "Finishing remaining digests…";
}

/**
 * Stop tracking UI only. Server harvest jobs already enqueued keep running.
 */
export function dismissScanJobAlertsTracking() {
  const state = getScanJobAlertsState();
  if (state.status !== "running") {
    toast.dismiss(SCAN_TOAST_ID);
    return;
  }
  jobController.cancel(null);
  toast.dismiss(SCAN_TOAST_ID);
  setScanJobAlertsState({
    status: "canceled",
    stepLabel: null,
    error: null
  });
}

/**
 * Enqueue harvest for recent job-alert digests and show a sticky progress toast
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
    // Ensure toast is visible if user dismissed it earlier in the same run.
    showRunningToast();
    return;
  }

  const { generation, controller, signal } = jobController.begin();
  const baselineInbox = inboxCountFromCache(queryClient);

  setScanJobAlertsState({
    status: "running",
    stepLabel: "Looking up recent job-alert digests…",
    digestsFound: 0,
    enqueued: 0,
    newJobsFound: 0,
    error: null,
    startedAt: Date.now()
  });
  showRunningToast();

  try {
    const data = await orpcClient.applications.scanJobAlerts(input ?? {}, { signal });

    if (!jobController.isCurrent(generation)) return;

    if (data.digestsFound === 0) {
      toast.dismiss(SCAN_TOAST_ID);
      setScanJobAlertsState({
        status: "ready",
        stepLabel: null,
        digestsFound: 0,
        enqueued: 0
      });
      toast.message("No job-alert digests yet", {
        description: "Sync mail or wait for the next job-alert email, then try again."
      });
      return;
    }

    if (data.queueUnavailable) {
      toast.dismiss(SCAN_TOAST_ID);
      setScanJobAlertsState({
        status: "failed",
        stepLabel: null,
        digestsFound: data.digestsFound,
        enqueued: 0,
        error: "Harvest queue unavailable"
      });
      toast.error("Harvest queue is unavailable", {
        description: "Start the server with Redis so job alerts can be processed."
      });
      return;
    }

    setScanJobAlertsState({
      digestsFound: data.digestsFound,
      enqueued: data.enqueued,
      stepLabel:
        data.enqueued === 1
          ? "Queued 1 digest — harvest runs in the background…"
          : `Queued ${data.enqueued} digests — harvest runs in the background…`
    });

    await invalidateInbox(queryClient);

    let newJobsFound = Math.max(0, inboxCountFromCache(queryClient) - baselineInbox);
    setScanJobAlertsState({
      newJobsFound,
      stepLabel: stepForPoll(0, data.enqueued, newJobsFound)
    });

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
      setScanJobAlertsState({
        newJobsFound,
        stepLabel: stepForPoll(i + 1, data.enqueued, newJobsFound)
      });
    }

    if (!jobController.isCurrent(generation)) return;

    toast.dismiss(SCAN_TOAST_ID);
    setScanJobAlertsState({
      status: "ready",
      stepLabel: null,
      newJobsFound
    });

    if (newJobsFound > 0) {
      toast.success(newJobsFound === 1 ? "1 new job added" : `${newJobsFound} new jobs added`, {
        description: "Matches that passed your Job preferences are under New jobs.",
        action: (
          <Link to="/dashboard/new-jobs" data-button>
            Open New jobs
          </Link>
        ),
        duration: 12_000
      });
    } else {
      toast.message("Scan finished — no new inbox jobs", {
        description:
          "Digests were re-processed, but every listing URL is already on a tracked job (or below min match score). Deleting New jobs does not free URLs still on Tracked jobs — harvest never creates a second row for the same listing.",
        action: (
          <Link to="/dashboard/tracked-jobs" data-button>
            Tracked jobs
          </Link>
        ),
        duration: 14_000
      });
    }
  } catch (error) {
    if (!jobController.isCurrent(generation)) return;

    if (isAbortError(error) || controller.signal.aborted) {
      // dismissScanJobAlertsTracking already updated state + dismissed toast
      return;
    }

    toast.dismiss(SCAN_TOAST_ID);
    const message = error instanceof Error ? error.message : "Could not scan job alerts.";
    setScanJobAlertsState({
      status: "failed",
      stepLabel: null,
      error: message
    });
    toast.error(message);
  } finally {
    jobController.clearIf(controller);
  }
}
