import { toast } from "sonner";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type DetectedStack, type DetectStacksResult } from "@tsu-stack/core";

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
  getDetectJobState,
  resetDetectJobState,
  setDetectJobState
} from "@/features/stacks/lib/detect-stacks-job-store";

const DETECT_WORKFLOW_ID = "detect-stacks-workflow";
/** Stable island id so step updates + dismiss work across navigations */
const DETECT_TOAST_ID = "detect-stacks-job";

const STEP_LABELS: Record<string, string> = {
  "fetch-repo-package-jsons": "Fetching repo files…",
  "extract-dependencies": "Extracting dependencies…",
  "programmatic-match": "Matching known stacks…",
  "ai-categorize": "Categorizing packages…",
  "deduplicate-groups": "Deduplicating stacks…",
  "merge-families": "Merging packages…",
  "canonicalize-names": "Standardizing names…",
  "enrich-npm": "Loading npm info…",
  "resolve-icons": "Resolving icons…",
  format: "Processing results…"
};

const jobController = createDetachedJobController({
  cancelRemoteRun: (runId) => cancelMastraWorkflowRun(DETECT_WORKFLOW_ID, runId)
});

function hasReviewableResults(result: DetectStacksResult): boolean {
  return result.detectedStacks.length > 0 || result.hasChanges;
}

/**
 * Progress payload from `writeDetectProgress` may land as:
 * - top-level `{ type: "data-detect-progress", data: { label, … } }`
 * - nested under payload after oRPC unwrap
 */
function extractDetectProgressLabel(
  event: Record<string, unknown>,
  payload: Record<string, unknown> | undefined
): string | null {
  const candidates: unknown[] = [
    event.data,
    payload,
    (payload as { data?: unknown } | undefined)?.data
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const label = (candidate as { label?: unknown }).label;
    if (typeof label === "string" && label.trim()) return label;
  }
  return null;
}

async function runDetectWorkflow(
  input: { projectId: string; repos: string[] },
  signal: AbortSignal
): Promise<DetectStacksResult> {
  const result: DetectStacksResult = {
    detectedStacks: [],
    groupedByRepo: [],
    hasChanges: false,
    diff: null,
    currentStep: null
  };

  let runId: string | null = null;

  const onAbort = () => {
    cancelMastraWorkflowRun(DETECT_WORKFLOW_ID, runId);
  };
  signal.addEventListener("abort", onAbort, { once: true });

  setDetectJobState({ stepLabel: "Starting…" });

  try {
    if (signal.aborted) {
      throw new DOMException("Stack detection cancelled.", "AbortError");
    }

    const iterator = await orpcClient.agent.detectStacks(input, { signal });

    for await (const raw of iterator) {
      if (signal.aborted) {
        cancelMastraWorkflowRun(DETECT_WORKFLOW_ID, runId);
        throw new DOMException("Stack detection cancelled.", "AbortError");
      }

      const event = unwrapWorkflowEvent(raw);
      const eventType = event.type as string | undefined;
      const payload = event.payload as Record<string, unknown> | undefined;

      const maybeRunId = extractRunId(event, payload);
      if (maybeRunId) {
        runId = maybeRunId;
        setDetectJobState({ runId });
      }

      if (eventType === "workflow-run-created") {
        continue;
      }

      if (eventType === "workflow-step-start") {
        const stepName = (payload?.stepName as string) ?? null;
        const stepLabel = stepName ? (STEP_LABELS[stepName] ?? stepName) : null;
        setDetectJobState({ stepLabel });
        if (stepName) advanceIslandMapStep(DETECT_TOAST_ID, stepName, stepLabel ?? stepName);
        result.currentStep = stepName;
      }

      // Live chunk progress from agent writer.custom (writeDetectProgress)
      if (eventType === "data-detect-progress") {
        const label = extractDetectProgressLabel(event, payload);
        if (label) {
          setDetectJobState({ stepLabel: label });
          patchIslandActiveLabel(DETECT_TOAST_ID, label);
        }
      }

      // Mastra foreach-style progress when present
      if (eventType === "workflow-step-progress") {
        const label = extractDetectProgressLabel(event, payload);
        if (label) {
          setDetectJobState({ stepLabel: label });
          patchIslandActiveLabel(DETECT_TOAST_ID, label);
        } else {
          const completed = payload?.completedCount ?? event.completedCount;
          const total = payload?.totalCount ?? event.totalCount;
          if (typeof completed === "number" && typeof total === "number" && total > 0) {
            const progressLabel = `Processing ${completed}/${total}…`;
            setDetectJobState({ stepLabel: progressLabel });
            patchIslandActiveLabel(DETECT_TOAST_ID, progressLabel);
          }
        }
      }

      if (eventType === "workflow-step-result" && payload?.status === "success") {
        const output = payload.output as Record<string, unknown> | undefined;

        if (output && "detectedStacks" in output) {
          result.detectedStacks = (output.detectedStacks ?? []) as DetectedStack[];
          result.groupedByRepo = (output.groupedByRepo ??
            []) as DetectStacksResult["groupedByRepo"];
          result.hasChanges = (output.hasChanges ?? false) as boolean;
          result.diff = (output.diff ?? null) as DetectStacksResult["diff"];
          result.currentStep = null;
          setDetectJobState({
            stepLabel: null,
            results: { ...result }
          });
        }
      }

      if (eventType === "workflow-step-error") {
        result.currentStep = null;
        throw new Error(workflowStepErrorMessage(payload, "A detection step failed."));
      }

      if (eventType === "workflow-failed" || eventType === "error") {
        throw new Error(workflowFailedMessage(event, payload, "Stack detection failed."));
      }
    }
  } catch (error) {
    if (isAbortError(error) || signal.aborted) {
      cancelMastraWorkflowRun(DETECT_WORKFLOW_ID, runId);
      throw new DOMException("Stack detection cancelled.", "AbortError");
    }
    throw new Error(getWorkflowErrorMessage(error, "Stack detection failed."));
  } finally {
    signal.removeEventListener("abort", onAbort);
  }

  if (signal.aborted) {
    cancelMastraWorkflowRun(DETECT_WORKFLOW_ID, runId);
    throw new DOMException("Stack detection cancelled.", "AbortError");
  }

  result.currentStep = null;
  return result;
}

export type StartDetectStacksJobInput = {
  projectId: string;
  repos: string[];
};

/**
 * Start detect-stacks as a detached job (survives route changes).
 * Single-flight: no-ops with a toast if already running; reopens review if ready.
 */
export function startDetectStacksJob(input: StartDetectStacksJobInput) {
  const current = getDetectJobState();

  if (current.status === "running") {
    toast.info("Detection already running", {
      description: current.stepLabel ?? "Working in the background…"
    });
    return;
  }

  // Ready results waiting for review — open dialog instead of re-running
  if (current.status === "ready" && current.results && hasReviewableResults(current.results)) {
    setDetectJobState({ dialogOpen: true });
    return;
  }

  const { projectId, repos } = input;
  if (!projectId || repos.length === 0) {
    toast.error("Select at least one repository first.");
    return;
  }

  const { generation, controller, signal } = jobController.begin();

  setDetectJobState({
    status: "running",
    stepLabel: "Starting…",
    runId: null,
    results: null,
    error: null,
    dialogOpen: false,
    projectId,
    startedAt: Date.now()
  });

  upsertAiJobIsland({
    id: DETECT_TOAST_ID,
    title: "Detecting stacks…",
    onCancel: cancelDetectStacksJob,
    steps: islandStepsFromMap(STEP_LABELS),
    activeStepLabel: "Starting…"
  });

  void (async () => {
    try {
      const result = await runDetectWorkflow({ projectId, repos }, signal);
      if (!jobController.isCurrent(generation)) return;

      if (!hasReviewableResults(result)) {
        completeAiJobIsland(DETECT_TOAST_ID, {
          status: "success",
          resultTitle: "No new stacks detected",
          requiresAction: false
        });
        resetDetectJobState();
        return;
      }

      setDetectJobState({
        status: "ready",
        stepLabel: null,
        results: result,
        error: null,
        // Open review immediately; host is dashboard-mounted so this works after form close.
        dialogOpen: true,
        projectId
      });

      completeAiJobIsland(DETECT_TOAST_ID, {
        status: "success",
        resultTitle: "Detection ready",
        requiresAction: true,
        resultAction: {
          label: "Review",
          onClick: () => {
            queueMicrotask(() => {
              setDetectReviewOpen(true);
            });
          }
        }
      });
    } catch (error) {
      if (!jobController.isCurrent(generation)) return;

      if (isAbortError(error) || controller.signal.aborted) {
        dismissAiJobIsland(DETECT_TOAST_ID);
        setDetectJobState({
          status: "canceled",
          stepLabel: null,
          runId: null,
          dialogOpen: false
        });
        return;
      }

      const message = getWorkflowErrorMessage(error, "Stack detection failed.");
      setDetectJobState({
        status: "failed",
        stepLabel: null,
        error: message,
        dialogOpen: false
      });

      const presentation = presentAiError(message, {
        feature: "generic",
        severity: "hard"
      });
      completeAiJobIsland(DETECT_TOAST_ID, {
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
export function cancelDetectStacksJob() {
  const current = getDetectJobState();
  if (current.status !== "running") {
    setDetectJobState({ stepLabel: null });
    return;
  }

  jobController.cancel(current.runId);
  dismissAiJobIsland(DETECT_TOAST_ID);
  setDetectJobState({
    status: "canceled",
    stepLabel: null,
    runId: null,
    dialogOpen: false
  });
}

/** Clear ready results after apply or dismiss. */
export function dismissDetectStacksJob() {
  resetDetectJobState();
}

/** Toggle review dialog. Closing keeps ready results so Detect can reopen them. */
export function setDetectReviewOpen(open: boolean) {
  setDetectJobState({ dialogOpen: open });
}
