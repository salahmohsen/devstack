import { type QueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type FindJobsNowInput,
  type FindJobsNowOutput,
  discoveryRunLabel,
  DISCOVERY_AI_FALLBACK_NOTE,
  isDiscoveryRunTerminal,
  MAX_OPEN_INBOX
} from "@tsu-stack/core";

import {
  appendIslandStep,
  completeAiJobIsland,
  createDetachedJobController,
  dismissAiJobIsland,
  isAbortError,
  upsertAiJobIsland
} from "@/shared/lib/ai-job";
import { getFindJobsNowState, setFindJobsNowState } from "@/shared/lib/find-jobs-now-store";
import { invalidateApplicationsListQueries } from "@/shared/lib/invalidate-applications-list";
import { presentAiError } from "@/shared/lib/parse-ai-error";

const inboxCountQueryKey = orpcQueryClient.applications.count.queryKey({
  input: { trackingStatus: "inbox" }
});

/** Stable island id so step updates + dismiss work across navigations. */
const FIND_TOAST_ID = "find-jobs-now-job";

const jobController = createDetachedJobController({
  // Ingest/land run on the server queue; UI “Dismiss” only stops client tracking.
  cancelRemoteRun: () => undefined
});

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

async function invalidateInbox(queryClient: QueryClient) {
  await Promise.all([
    invalidateApplicationsListQueries(queryClient),
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

function setFindStepLabel(label: string) {
  setFindJobsNowState({ stepLabel: label });
  appendIslandStep(FIND_TOAST_ID, label);
}

function showRunningIsland() {
  upsertAiJobIsland({
    id: FIND_TOAST_ID,
    title: "Finding jobs…",
    cancelLabel: "Dismiss",
    onCancel: dismissFindJobsNowTracking,
    steps: [{ id: "step-0", label: "Checking title and inbox…", state: "active" }],
    activeStepLabel: "Checking title and inbox…"
  });
}

/**
 * Stop tracking UI only. Server ingest/land jobs already enqueued keep running.
 */
export function dismissFindJobsNowTracking() {
  const state = getFindJobsNowState();
  if (state.status !== "running") {
    dismissAiJobIsland(FIND_TOAST_ID);
    return;
  }
  jobController.cancel(null);
  dismissAiJobIsland(FIND_TOAST_ID);
  setFindJobsNowState({
    status: "canceled",
    stepLabel: null,
    error: null
  });
}

const ALREADY_RUNNING: FindJobsNowOutput = {
  enqueued: true,
  ingestTriggered: false,
  seats: 0,
  reason: "ok"
};

/**
 * Enqueue Find jobs now and start the toast tracker without awaiting the poll.
 * Same enqueue/caps as the header button.
 */
export async function enqueueFindJobsNow(
  queryClient: QueryClient,
  input?: FindJobsNowInput
): Promise<FindJobsNowOutput> {
  return runFindJobsNow(queryClient, input, { awaitPoll: false, showToast: false });
}

/**
 * Enqueue catalog ingest (if the shelf is thin) + land, and show a sticky
 * progress toast that survives route changes while workers run in the background.
 */
export async function startFindJobsNow(
  queryClient: QueryClient,
  input?: FindJobsNowInput
): Promise<void> {
  await runFindJobsNow(queryClient, input, { awaitPoll: true, showToast: true });
}

async function runFindJobsNow(
  queryClient: QueryClient,
  input: FindJobsNowInput | undefined,
  options: { awaitPoll: boolean; showToast: boolean }
): Promise<FindJobsNowOutput> {
  const { awaitPoll, showToast } = options;
  const existing = getFindJobsNowState();
  if (existing.status === "running") {
    if (showToast) {
      toast.info("Find jobs now already running", {
        description: existing.stepLabel ?? "Search continues in the background.",
        action: (
          <Link to="/dashboard/new-jobs" data-button>
            New jobs
          </Link>
        )
      });
      // Re-upsert while running must not rewind steps (store preserves them).
      upsertAiJobIsland({
        id: FIND_TOAST_ID,
        title: "Finding jobs…",
        cancelLabel: "Dismiss",
        onCancel: dismissFindJobsNowTracking,
        activeStepLabel: existing.stepLabel
      });
    }
    return {
      ...ALREADY_RUNNING,
      ingestTriggered: existing.ingestTriggered,
      seats: existing.seats
    };
  }

  const { generation, controller, signal } = jobController.begin();

  setFindJobsNowState({
    status: "running",
    stepLabel: "Checking title and inbox…",
    ingestTriggered: false,
    seats: 0,
    newJobsFound: 0,
    error: null,
    startedAt: Date.now()
  });
  if (showToast) showRunningIsland();

  let handedOffPoll = false;
  try {
    const data = await orpcClient.jobDiscovery.findNow(input ?? {}, { signal });

    if (!jobController.isCurrent(generation)) return data;

    if (data.reason === "title_required") {
      if (showToast) dismissAiJobIsland(FIND_TOAST_ID);
      setFindJobsNowState({
        status: "ready",
        stepLabel: null,
        ingestTriggered: false,
        seats: data.seats
      });
      toast.message("Choose a role or category first", {
        description: "Choose at least one role keyword or job category, then try again.",
        action: (
          <Link to="/dashboard/settings/jobs" data-button>
            Settings → Jobs
          </Link>
        )
      });
      return data;
    }

    if (data.reason === "inbox_full") {
      if (showToast) dismissAiJobIsland(FIND_TOAST_ID);
      setFindJobsNowState({
        status: "ready",
        stepLabel: null,
        ingestTriggered: false,
        seats: data.seats
      });
      toast.message(`Inbox is full (${MAX_OPEN_INBOX}). Dismiss or track some jobs first.`);
      return data;
    }

    if (data.reason === "ai_budget") {
      if (showToast) dismissAiJobIsland(FIND_TOAST_ID);
      setFindJobsNowState({
        status: "ready",
        stepLabel: null,
        ingestTriggered: false,
        seats: data.seats
      });
      toast.message("Board search scoring is used up for today", {
        description:
          "Find jobs now can run again tomorrow. Job-alert emails are not part of this limit."
      });
      return data;
    }

    if (data.reason === "queue_unavailable" || !data.enqueued) {
      if (showToast) dismissAiJobIsland(FIND_TOAST_ID);
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
      return data;
    }

    if (cachedHasAiKey(queryClient) === false) {
      toastMissingAiKey();
    }

    setFindJobsNowState({
      ingestTriggered: data.ingestTriggered,
      seats: data.seats
    });
    setFindStepLabel("Search queued");
    void queryClient.invalidateQueries({ queryKey: orpcQueryClient.jobDiscovery.status.key() });

    const poll = () =>
      pollFindJobsNow({
        queryClient,
        data,
        generation,
        signal,
        showToast
      });

    if (!awaitPoll) {
      handedOffPoll = true;
      void poll()
        .catch((error: unknown) => {
          if (!jobController.isCurrent(generation) || isAbortError(error) || signal.aborted) return;
          const message = error instanceof Error ? error.message : "Could not read search status.";
          setFindJobsNowState({ status: "failed", stepLabel: null, error: message });
          if (showToast) {
            completeAiJobIsland(FIND_TOAST_ID, {
              status: "error",
              resultTitle: "Search status unavailable",
              errorMessage: message,
              requiresAction: false
            });
          } else toast.error("Search status unavailable", { description: message });
        })
        .finally(() => {
          jobController.clearIf(controller);
        });
      return data;
    }

    await poll();
    return data;
  } catch (error) {
    if (!jobController.isCurrent(generation)) {
      return {
        enqueued: false,
        ingestTriggered: false,
        seats: 0,
        reason: "queue_unavailable"
      };
    }

    if (isAbortError(error) || controller.signal.aborted) {
      return {
        enqueued: false,
        ingestTriggered: false,
        seats: 0,
        reason: "queue_unavailable"
      };
    }

    const message = error instanceof Error ? error.message : "Could not find jobs.";
    setFindJobsNowState({
      status: "failed",
      stepLabel: null,
      error: message
    });

    if (showToast) {
      const presentation = presentAiError(message, {
        feature: "generic",
        severity: "hard"
      });
      completeAiJobIsland(FIND_TOAST_ID, {
        status: "error",
        resultTitle: presentation.title,
        errorMessage: presentation.description,
        requiresAction: presentation.showAiSettings,
        resultAction: presentation.showAiSettings
          ? { label: "Settings → AI", to: "/dashboard/settings/ai" }
          : undefined
      });
    } else {
      toast.error(message);
    }

    return {
      enqueued: false,
      ingestTriggered: false,
      seats: 0,
      reason: "queue_unavailable"
    };
  } finally {
    if (!handedOffPoll) jobController.clearIf(controller);
  }
}

async function pollFindJobsNow(input: {
  queryClient: QueryClient;
  data: FindJobsNowOutput;
  generation: number;
  signal: AbortSignal;
  showToast: boolean;
}): Promise<void> {
  const { queryClient, data, generation, signal, showToast } = input;
  if (!data.runId) throw new Error("Search did not return a tracking ID. Refresh and try again.");
  const started = Date.now();
  let lastAdded = -1;
  while (jobController.isCurrent(generation)) {
    const { run } = await orpcClient.jobDiscovery.status({ runId: data.runId }, { signal });
    if (!jobController.isCurrent(generation)) return;
    if (!run) throw new Error("Search status is unavailable. Refresh to check the latest run.");
    setFindJobsNowState({ newJobsFound: run.added });
    const label = discoveryRunLabel(run);
    if (getFindJobsNowState().stepLabel !== label) setFindStepLabel(label);
    if (run.added !== lastAdded) {
      await invalidateInbox(queryClient);
      lastAdded = run.added;
    }
    if (isDiscoveryRunTerminal(run.stage)) {
      await queryClient.invalidateQueries({ queryKey: orpcQueryClient.jobDiscovery.status.key() });
      const failed = run.stage === "failed";
      const outcomeMessage = failed
        ? (run.reason ?? "Search failed. Try again shortly.")
        : run.added > 0
          ? "Matches are available under New jobs."
          : (run.reason ??
            (run.fetched === 0
              ? "The job source returned no listings for your saved filters. Review Job preferences."
              : `${run.fetched} listings checked. No new jobs passed screening; existing jobs and duplicates were skipped.`));
      const message = run.warnings.includes(DISCOVERY_AI_FALLBACK_NOTE)
        ? `${outcomeMessage} ${DISCOVERY_AI_FALLBACK_NOTE}`
        : outcomeMessage;
      setFindJobsNowState({
        status: failed ? "failed" : "ready",
        stepLabel: null,
        newJobsFound: run.added,
        error: failed ? message : null
      });
      if (showToast) {
        completeAiJobIsland(FIND_TOAST_ID, {
          status: failed ? "error" : "success",
          resultTitle: label,
          errorMessage: message,
          requiresAction: run.added > 0,
          resultAction: run.added > 0 ? { label: "New jobs", to: "/dashboard/new-jobs" } : undefined
        });
      } else if (failed) toast.error("Search failed", { description: message });
      else toast.message(label, { description: message });
      return;
    }
    if (Date.now() - started > 20 * 60_000) {
      throw new Error("Search is still running. You can check its live status under New jobs.");
    }
    await sleep(3_000, signal);
  }
}
