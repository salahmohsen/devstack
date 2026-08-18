import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  type OrganizeAction,
  type OrganizeStacksOutput,
  normalizeOrganizeActions
} from "@tsu-stack/core";

import {
  advanceIslandMapStep,
  cancelMastraWorkflowRun,
  completeAiJobIsland,
  createDetachedJobController,
  dismissAiJobIsland,
  extractRunId,
  getWorkflowErrorMessage,
  islandStepsFromMap,
  isAbortError,
  patchIslandActiveLabel,
  unwrapWorkflowEvent,
  upsertAiJobIsland,
  workflowFailedMessage,
  workflowStepErrorMessage
} from "@/shared/lib/ai-job";
import { presentAiError } from "@/shared/lib/parse-ai-error";

import {
  getOrganizeJobState,
  resetOrganizeJobState,
  setOrganizeJobState
} from "@/features/stacks/lib/organize-stacks-job-store";

const ORGANIZE_WORKFLOW_ID = "organize-stacks-workflow";
/** Stable island id so step updates + dismiss work across navigations */
const ORGANIZE_TOAST_ID = "organize-stacks-job";

const STEP_LABELS: Record<string, string> = {
  "find-merges": "Finding duplicate stacks…",
  "find-renames": "Checking names…",
  "find-enrichments": "Checking metadata…",
  "fetch-missing-icons": "Fetching icons…",
  "sort-stacks": "Sorting stacks…",
  "pick-profile-stacks": "Picking profile stacks…",
  "format-output": "Preparing results…"
};

const jobController = createDetachedJobController({
  cancelRemoteRun: (runId) => cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId)
});

function openOrganizeReview() {
  queueMicrotask(() => {
    setOrganizeReviewOpen(true);
  });
}

async function runOrganizeWorkflow(signal: AbortSignal): Promise<OrganizeStacksOutput> {
  const result: OrganizeStacksOutput = {
    actions: [],
    sortOrder: [],
    summary: { merges: 0, renames: 0, enrichments: 0, sorted: false },
    notes: [],
    featuredStackIds: []
  };

  let runId: string | null = null;

  const onAbort = () => {
    cancelMastraWorkflowRun(ORGANIZE_WORKFLOW_ID, runId);
  };
  signal.addEventListener("abort", onAbort, { once: true });

  setOrganizeJobState({ stepLabel: "Starting…" });

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
        setOrganizeJobState({ stepLabel });
        if (stepName) advanceIslandMapStep(ORGANIZE_TOAST_ID, stepName, stepLabel ?? stepName);
      }

      // Live chunk progress from agent writer.custom — label only, do not advance map steps
      if (eventType === "data-organize-progress") {
        const data = (event.data ?? payload) as { label?: string } | undefined;
        if (typeof data?.label === "string" && data.label.trim()) {
          setOrganizeJobState({ stepLabel: data.label });
          patchIslandActiveLabel(ORGANIZE_TOAST_ID, data.label);
        }
      }

      if (eventType === "workflow-step-result" && payload?.status === "success") {
        const output = payload.output as Record<string, unknown> | undefined;
        if (output && "actions" in output) {
          result.actions = (output.actions ?? []) as OrganizeAction[];
          result.sortOrder = (output.sortOrder ?? []) as string[];
          result.summary = (output.summary ?? result.summary) as OrganizeStacksOutput["summary"];
          result.notes = Array.isArray(output.notes)
            ? (output.notes as string[]).filter((n) => typeof n === "string" && n.trim())
            : [];
          result.featuredStackIds = Array.isArray(output.featuredStackIds)
            ? (output.featuredStackIds as string[]).filter((id) => typeof id === "string" && id)
            : [];
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
 * Single-flight: no-ops with a toast if already running; reopens review if ready.
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
  if (
    current.status === "ready" &&
    (current.actions.length > 0 ||
      current.sortOrder.length > 0 ||
      current.featuredStackIds.length > 0 ||
      current.notes.length > 0)
  ) {
    setOrganizeJobState({ dialogOpen: true });
    return;
  }

  const { generation, controller, signal } = jobController.begin();

  setOrganizeJobState({
    status: "running",
    stepLabel: "Starting…",
    runId: null,
    actions: [],
    sortOrder: [],
    featuredStackIds: [],
    notes: [],
    error: null,
    dialogOpen: false,
    startedAt: Date.now()
  });

  upsertAiJobIsland({
    id: ORGANIZE_TOAST_ID,
    title: "Organizing stacks…",
    onCancel: cancelOrganizeStacksJob,
    steps: islandStepsFromMap(STEP_LABELS),
    activeStepLabel: "Starting…"
  });

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
      const notes = (raw.notes ?? []).filter((n) => typeof n === "string" && n.trim());
      const featuredStackIds = (raw.featuredStackIds ?? []).filter((id) => {
        if (typeof id !== "string" || !id) return false;
        return stacks.length === 0 || stacks.some((s) => s.id === id);
      });

      if (!jobController.isCurrent(generation)) return;

      // No actions and no reorder — either truly clean, or AI soft-failed with notes
      if (actions.length === 0 && sortOrder.length === 0 && featuredStackIds.length === 0) {
        if (notes.length > 0) {
          setOrganizeJobState({
            status: "ready",
            stepLabel: null,
            actions: [],
            sortOrder: [],
            featuredStackIds,
            notes,
            error: null,
            dialogOpen: true
          });
          const presentation = presentAiError(null, {
            feature: "organize",
            severity: "partial",
            notes
          });
          completeAiJobIsland(ORGANIZE_TOAST_ID, {
            status: presentation.variant === "error" ? "error" : "success",
            resultTitle: presentation.title,
            errorMessage: presentation.description,
            requiresAction: true,
            resultAction: {
              label: "Review",
              onClick: openOrganizeReview
            }
          });
          return;
        }

        completeAiJobIsland(ORGANIZE_TOAST_ID, {
          status: "success",
          resultTitle: "All stacks are already organized",
          requiresAction: false
        });
        resetOrganizeJobState();
        return;
      }

      setOrganizeJobState({
        status: "ready",
        stepLabel: null,
        actions,
        sortOrder,
        featuredStackIds,
        notes,
        error: null,
        dialogOpen: true
      });

      if (notes.length > 0) {
        const presentation = presentAiError(null, {
          feature: "organize",
          severity: "partial",
          notes
        });
        completeAiJobIsland(ORGANIZE_TOAST_ID, {
          status: presentation.variant === "error" ? "error" : "success",
          resultTitle: presentation.title,
          errorMessage: presentation.description,
          requiresAction: true,
          resultAction: {
            label: "Review",
            onClick: openOrganizeReview
          }
        });
        return;
      }

      completeAiJobIsland(ORGANIZE_TOAST_ID, {
        status: "success",
        resultTitle: "Organize ready",
        requiresAction: true,
        resultAction: {
          label: "Review",
          onClick: openOrganizeReview
        }
      });
    } catch (error) {
      if (!jobController.isCurrent(generation)) return;

      if (isAbortError(error) || controller.signal.aborted) {
        dismissAiJobIsland(ORGANIZE_TOAST_ID);
        setOrganizeJobState({
          status: "canceled",
          stepLabel: null,
          runId: null,
          dialogOpen: false
        });
        return;
      }

      const message = getWorkflowErrorMessage(error, "Organize stacks failed.");
      setOrganizeJobState({
        status: "failed",
        stepLabel: null,
        error: message,
        notes: [],
        dialogOpen: false
      });

      const presentation = presentAiError(message, {
        feature: "organize",
        severity: "hard"
      });
      completeAiJobIsland(ORGANIZE_TOAST_ID, {
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
  dismissAiJobIsland(ORGANIZE_TOAST_ID);
  setOrganizeJobState({
    status: "canceled",
    stepLabel: null,
    runId: null,
    dialogOpen: false
  });
}

/** Clear ready results after apply or dismiss. */
export function dismissOrganizeStacksJob() {
  resetOrganizeJobState();
}

/** Toggle review dialog. Closing keeps ready results so Organize can reopen them. */
export function setOrganizeReviewOpen(open: boolean) {
  setOrganizeJobState({ dialogOpen: open });
}
