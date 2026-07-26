import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type OrganizeAction,
  type OrganizeStacksOutput,
  normalizeOrganizeActions
} from "@tsu-stack/core";

import {
  AiJobRunningToastBody,
  cancelMastraWorkflowRun,
  createDetachedJobController,
  extractRunId,
  getWorkflowErrorMessage,
  isAbortError,
  showAiJobRunningToast,
  unwrapWorkflowEvent,
  workflowFailedMessage,
  workflowStepErrorMessage
} from "@/shared/lib/ai-job";

import {
  getOrganizeJobState,
  resetOrganizeJobState,
  setOrganizeJobState,
  useOrganizeStacksJob
} from "@/features/stacks/lib/organize-stacks-job-store";

const ORGANIZE_WORKFLOW_ID = "organize-stacks-workflow";
/** Stable sonner id so step updates + dismiss work across navigations */
const ORGANIZE_TOAST_ID = "organize-stacks-job";

const STEP_LABELS: Record<string, string> = {
  "find-merges": "Finding duplicate stacks",
  "find-renames": "Checking naming conventions",
  "find-enrichments": "Analyzing metadata",
  "fetch-missing-icons": "Fetching icons",
  "sort-stacks": "Sorting by importance",
  "format-output": "Preparing results"
};

const jobController = createDetachedJobController({
  cancelRemoteRun: (runId) => cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId)
});

/** Live toast body — step text from store so shimmer is not remounted each step */
function OrganizeRunningToastBody() {
  const { stepLabel } = useOrganizeStacksJob();
  return <AiJobRunningToastBody title="Organizing stacks…" stepLabel={stepLabel} />;
}

function showRunningToast() {
  showAiJobRunningToast({
    id: ORGANIZE_TOAST_ID,
    onCancel: cancelOrganizeStacksJob,
    body: <OrganizeRunningToastBody />
  });
}

async function runOrganizeWorkflow(signal: AbortSignal): Promise<OrganizeStacksOutput> {
  const result: OrganizeStacksOutput = {
    actions: [],
    sortOrder: [],
    summary: { merges: 0, renames: 0, enrichments: 0, sorted: false }
  };

  let runId: string | null = null;

  const onAbort = () => {
    cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId);
  };
  signal.addEventListener("abort", onAbort, { once: true });

  setOrganizeJobState({ stepLabel: "Initializing" });

  try {
    if (signal.aborted) {
      throw new DOMException("Organize cancelled.", "AbortError");
    }

    const iterator = await orpcClient.agent.organizeStacks({}, { signal });

    for await (const raw of iterator) {
      if (signal.aborted) {
        cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId);
        throw new DOMException("Organize cancelled.", "AbortError");
      }

      const event = unwrapWorkflowEvent(raw);
      const eventType = event.type as string | undefined;
      const payload = event.payload as Record<string, unknown> | undefined;

      const maybeRunId = extractRunId(event, payload);
      if (maybeRunId) {
        runId = maybeRunId;
        setOrganizeJobState({ runId });
      }

      if (eventType === "workflow-run-created") {
        continue;
      }

      if (eventType === "workflow-step-start") {
        const stepName = (payload?.stepName as string) ?? null;
        const stepLabel = stepName ? (STEP_LABELS[stepName] ?? stepName) : null;
        // Store only — toast body is store-subscribed; re-showing would remount shimmer
        setOrganizeJobState({ stepLabel });
      }

      if (eventType === "workflow-step-result" && payload?.status === "success") {
        const output = payload.output as Record<string, unknown> | undefined;
        if (output && "actions" in output) {
          result.actions = (output.actions ?? []) as OrganizeAction[];
          result.sortOrder = (output.sortOrder ?? []) as string[];
          result.summary = (output.summary ?? result.summary) as OrganizeStacksOutput["summary"];
          setOrganizeJobState({ stepLabel: null });
        }
      }

      if (eventType === "workflow-step-error") {
        throw new Error(workflowStepErrorMessage(payload, "An organize step failed."));
      }

      if (eventType === "workflow-failed" || eventType === "error") {
        throw new Error(workflowFailedMessage(event, payload, "Organize stacks failed."));
      }
    }
  } catch (error) {
    if (isAbortError(error) || signal.aborted) {
      cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId);
      throw new DOMException("Organize cancelled.", "AbortError");
    }
    throw new Error(getWorkflowErrorMessage(error, "Organize stacks failed."));
  } finally {
    signal.removeEventListener("abort", onAbort);
  }

  if (signal.aborted) {
    cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId);
    throw new DOMException("Organize cancelled.", "AbortError");
  }

  return result;
}

/**
 * Start organize-stacks as a detached job (survives route changes).
 * Single-flight: no-ops with a toast if already running.
 */
export function startOrganizeStacksJob() {
  const current = getOrganizeJobState();

  if (current.status === "running") {
    toast.info("Organize is already running.", {
      description: current.stepLabel ?? "Working in the background…"
    });
    return;
  }

  // Ready results waiting for review — open dialog instead of re-running
  if (current.status === "ready" && (current.actions.length > 0 || current.sortOrder.length > 0)) {
    setOrganizeJobState({ dialogOpen: true });
    return;
  }

  const { generation, controller, signal } = jobController.begin();

  setOrganizeJobState({
    status: "running",
    stepLabel: "Initializing",
    runId: null,
    actions: [],
    sortOrder: [],
    error: null,
    dialogOpen: false,
    startedAt: Date.now()
  });

  showRunningToast();

  void (async () => {
    try {
      const raw = await runOrganizeWorkflow(signal);
      if (!jobController.isCurrent(generation)) return;

      // Normalize against current stack list
      let stacks: Array<{ id: string; name: string; projectCount: number }> = [];
      try {
        const list = await orpcClient.stacks.list();
        stacks = list.map((s) => {
          return { id: s.id, name: s.name, projectCount: s.projectCount };
        });
      } catch {
        // Fall back to un-normalized actions
      }

      const { actions, sortOrder } = normalizeOrganizeActions(raw.actions, stacks, raw.sortOrder);

      if (!jobController.isCurrent(generation)) return;

      toast.dismiss(ORGANIZE_TOAST_ID);

      if (actions.length === 0 && sortOrder.length === 0) {
        resetOrganizeJobState();
        toast.success("All stacks are already organized!");
        return;
      }

      setOrganizeJobState({
        status: "ready",
        stepLabel: null,
        actions,
        sortOrder,
        error: null,
        dialogOpen: true
      });

      const changeCount = actions.length + (sortOrder.length > 0 ? 1 : 0);
      toast.success("Stack organize ready", {
        description: `${changeCount} suggested change${changeCount === 1 ? "" : "s"} to review.`,
        action: (
          <Link
            to="/dashboard/stacks"
            data-button
            onClick={() => {
              setOrganizeJobState({ dialogOpen: true });
            }}
          >
            Review
          </Link>
        ),
        duration: 12_000
      });
    } catch (error) {
      if (!jobController.isCurrent(generation)) return;

      toast.dismiss(ORGANIZE_TOAST_ID);

      if (isAbortError(error) || controller.signal.aborted) {
        setOrganizeJobState({
          status: "canceled",
          stepLabel: null,
          runId: null,
          dialogOpen: false
        });
        // Explicit cancel already toasts from cancelOrganizeStacksJob
        return;
      }

      const message = getWorkflowErrorMessage(error, "Organize stacks failed.");
      setOrganizeJobState({
        status: "failed",
        stepLabel: null,
        error: message,
        dialogOpen: false
      });
      toast.error("Failed to organize stacks.", { description: message });
    } finally {
      jobController.clearIf(controller);
    }
  })();
}

/**
 * Explicit cancel — does not run on route change.
 */
export function cancelOrganizeStacksJob() {
  const current = getOrganizeJobState();
  if (current.status !== "running") {
    setOrganizeJobState({ stepLabel: null });
    return;
  }

  jobController.cancel(current.runId);
  toast.dismiss(ORGANIZE_TOAST_ID);
  setOrganizeJobState({
    status: "canceled",
    stepLabel: null,
    runId: null,
    dialogOpen: false
  });
  toast.info("Organize cancelled.");
}

/** Clear ready results after apply or dismiss. */
export function dismissOrganizeStacksJob() {
  resetOrganizeJobState();
}

/** Toggle review dialog. Closing keeps ready results so Organize can reopen them. */
export function setOrganizeReviewOpen(open: boolean) {
  setOrganizeJobState({ dialogOpen: open });
}
