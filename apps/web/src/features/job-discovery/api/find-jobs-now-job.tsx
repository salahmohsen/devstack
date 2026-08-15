import { type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ApplicationOutput, type FindJobsNowInput, MAX_OPEN_INBOX } from "@tsu-stack/core";

import {
  AiJobRunningToastBody,
  createDetachedJobController,
  isAbortError,
  showAiJobRunningToast
} from "@/shared/lib/ai-job";

import {
  getFindJobsNowState,
  setFindJobsNowState,
  useFindJobsNowJob
} from "@/features/job-discovery/lib/find-jobs-now-store";

const inboxListQueryKey = orpcQueryClient.applications.list.queryKey({
  input: { trackingStatus: "inbox" }
});
const inboxCountQueryKey = orpcQueryClient.applications.count.queryKey({
  input: { trackingStatus: "inbox" }
});

/** Stable sonner id so step updates + dismiss work across navigations. */
const FIND_TOAST_ID = "find-jobs-now-job";

/**
 * Absolute poll times from enqueue (ms). Ingest + land are async BullMQ work —
 * matches land under New jobs as workers finish, not only at the end.
 */
const POLL_AT_MS = [4_000, 12_000, 25_000, 45_000, 70_000, 100_000] as const;

const jobController = createDetachedJobController({
  // Ingest/land run on the server queue; UI “Dismiss” only stops client tracking.
  cancelRemoteRun: () => undefined
});

function FindRunningToastBody() {
  const { stepLabel } = useFindJobsNowJob();
  return <AiJobRunningToastBody title="Finding jobs…" stepLabel={stepLabel} />;
}

function showRunningToast() {
  showAiJobRunningToast({
    id: FIND_TOAST_ID,
    cancelLabel: "Dismiss",
    onCancel: dismissFindJobsNowTracking,
    body: <FindRunningToastBody />
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Find tracking dismissed.", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(new DOMException("Find tracking dismissed.", "AbortError"));
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function inboxCountFromCache(queryClient: QueryClient): number {
  const list = queryClient.getQueryData<ApplicationOutput[]>(inboxListQueryKey);
  if (Array.isArray(list)) return list.length;
  const count = queryClient.getQueryData<{ count: number }>(inboxCountQueryKey);
  return typeof count?.count === "number" ? count.count : 0;
}

async function invalidateInbox(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: inboxListQueryKey }),
    queryClient.invalidateQueries({ queryKey: inboxCountQueryKey })
  ]);
}

function cachedHasAiKey(queryClient: QueryClient): boolean | null {
  const settings = queryClient.getQueryData<{ providers: Array<{ hasApiKey: boolean }> }>(
    orpcQueryClient.aiSettings.get.key()
  );
  if (!settings) return null;
  return settings.providers.some((provider) => provider.hasApiKey);
}

function toastMissingAiKey() {
  toast.message("Landed without AI scoring. Add a key in Settings → AI.", {
    action: (
      <Link to="/dashboard/settings/ai" data-button>
        Settings → AI
      </Link>
    ),
    duration: 12_000
  });
}

function stepForPoll(index: number, ingestTriggered: boolean, newJobsFound: number): string {
  if (newJobsFound > 0) {
    return newJobsFound === 1
      ? "1 new match under New jobs so far…"
      : `${newJobsFound} new matches under New jobs so far…`;
  }
  if (index <= 0) {
    return ingestTriggered
      ? "Refreshing public boards, then landing matches…"
      : "Landing matches from the catalog…";
  }
  if (index === 1) {
    return ingestTriggered
      ? "Fetching board listings & scoring against your title…"
      : "Scoring catalog listings against your title…";
  }
  if (index === 2) {
    return "Still working — only new matches appear under New jobs…";
  }
  if (index === 3) {
    return "Duplicates are skipped; waiting for remaining listings…";
  }
  return "Finishing remaining listings…";
}

/**
 * Stop tracking UI only. Server ingest/land jobs already enqueued keep running.
 */
export function dismissFindJobsNowTracking() {
  const state = getFindJobsNowState();
  if (state.status !== "running") {
    toast.dismiss(FIND_TOAST_ID);
    return;
  }
  jobController.cancel(null);
  toast.dismiss(FIND_TOAST_ID);
  setFindJobsNowState({
    status: "canceled",
    stepLabel: null,
    error: null
  });
}

/**
 * Enqueue catalog ingest (if the shelf is thin) + land, and show a sticky
 * progress toast that survives route changes while workers run in the background.
 */
export async function startFindJobsNow(
  queryClient: QueryClient,
  input?: FindJobsNowInput
): Promise<void> {
  const existing = getFindJobsNowState();
  if (existing.status === "running") {
    toast.info("Find jobs now already running", {
      description: existing.stepLabel ?? "Search continues in the background.",
      action: (
        <Link to="/dashboard/new-jobs" data-button>
          New jobs
        </Link>
      )
    });
    showRunningToast();
    return;
  }

  const { generation, controller, signal } = jobController.begin();
  const baselineInbox = inboxCountFromCache(queryClient);

  setFindJobsNowState({
    status: "running",
    stepLabel: "Checking your title and inbox…",
    ingestTriggered: false,
    seats: 0,
    newJobsFound: 0,
    error: null,
    startedAt: Date.now()
  });
  showRunningToast();

  try {
    const data = await orpcClient.jobDiscovery.findNow(input ?? {}, { signal });

    if (!jobController.isCurrent(generation)) return;

    if (data.reason === "title_required") {
      toast.dismiss(FIND_TOAST_ID);
      setFindJobsNowState({
        status: "ready",
        stepLabel: null,
        ingestTriggered: false,
        seats: data.seats
      });
      toast.message("Set a job title first", {
        description:
          "Choose a title pack or a custom title with at least two role keywords, then try again.",
        action: (
          <Link to="/dashboard/settings/jobs" data-button>
            Settings → Jobs
          </Link>
        )
      });
      return;
    }

    if (data.reason === "inbox_full") {
      toast.dismiss(FIND_TOAST_ID);
      setFindJobsNowState({
        status: "ready",
        stepLabel: null,
        ingestTriggered: false,
        seats: data.seats
      });
      toast.message(`Inbox is full (${MAX_OPEN_INBOX}). Dismiss or track some jobs first.`);
      return;
    }

    if (data.reason === "queue_unavailable" || !data.enqueued) {
      toast.dismiss(FIND_TOAST_ID);
      setFindJobsNowState({
        status: "failed",
        stepLabel: null,
        ingestTriggered: data.ingestTriggered,
        seats: data.seats,
        error: "Discovery queue unavailable"
      });
      toast.error("Discovery queue is unavailable", {
        description: "Start the server with Redis so jobs can be found."
      });
      return;
    }

    if (cachedHasAiKey(queryClient) === false) {
      toastMissingAiKey();
    }

    setFindJobsNowState({
      ingestTriggered: data.ingestTriggered,
      seats: data.seats,
      stepLabel: data.ingestTriggered
        ? "Queued a board refresh — landing runs after ingest…"
        : "Queued landing from the catalog…"
    });

    await invalidateInbox(queryClient);

    let newJobsFound = Math.max(0, inboxCountFromCache(queryClient) - baselineInbox);
    setFindJobsNowState({
      newJobsFound,
      stepLabel: stepForPoll(0, data.ingestTriggered, newJobsFound)
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
      setFindJobsNowState({
        newJobsFound,
        stepLabel: stepForPoll(i + 1, data.ingestTriggered, newJobsFound)
      });
    }

    if (!jobController.isCurrent(generation)) return;

    toast.dismiss(FIND_TOAST_ID);
    setFindJobsNowState({
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
      toast.message("Search finished — no new inbox jobs", {
        description:
          "Listings were scored, but every URL is already on a tracked job (or did not match your title). Deleting New jobs does not free URLs still on Tracked jobs.",
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
      return;
    }

    toast.dismiss(FIND_TOAST_ID);
    const message = error instanceof Error ? error.message : "Could not find jobs.";
    setFindJobsNowState({
      status: "failed",
      stepLabel: null,
      error: message
    });
    toast.error(message);
  } finally {
    jobController.clearIf(controller);
  }
}
