import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  advanceIslandMapStep,
  cancelMastraWorkflowRun,
  completeAiJobIsland,
  createDetachedJobController,
  dismissAiJobIsland,
  getWorkflowErrorMessage,
  islandStepsFromMap,
  isAbortError,
  patchIslandActiveLabel,
  upsertAiJobIsland
} from "@/shared/lib/ai-job";
import { presentAiError } from "@/shared/lib/parse-ai-error";

import {
  RESUME_EXTRACT_STEP_LABELS,
  RESUME_IMPORT_WORKFLOW_ID,
  runExtractResume
} from "@/features/onboarding/api/extract-resume.mutation";
import {
  getOnboardingSessionState,
  setOnboardingSessionState
} from "@/features/onboarding/lib/onboarding-session-store";

/** Stable island id so step updates + dismiss work across navigations */
const EXTRACT_TOAST_ID = "onboarding-extract-job";

const jobController = createDetachedJobController({
  cancelRemoteRun: (runId) => cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId)
});

/**
 * Start resume extract as a detached job (survives route changes).
 * Single-flight: no-ops with a toast if already running for the same source.
 */
export function startExtractResumeJob(input?: { objectKey?: string; filename?: string | null }) {
  const session = getOnboardingSessionState();
  const objectKey = input?.objectKey ?? session.objectKey;
  const filename = input?.filename !== undefined ? input.filename : session.filename;

  if (!objectKey) {
    toast.error("Upload a resume before analyzing.");
    return;
  }

  if (session.extractStatus === "running") {
    toast.info("Resume analysis is already running.", {
      description: session.extractStepLabel ?? "Working in the background…",
      action: (
        <Link to="/dashboard/onboarding" data-button>
          View
        </Link>
      )
    });
    // Ensure UI shows analyzing if user re-clicked Analyze
    setOnboardingSessionState({ step: "analyzing" });
    return;
  }

  // Already have a draft for this source — go to review
  if (session.draft && session.objectKey === objectKey && session.extractStatus === "ready") {
    setOnboardingSessionState({ step: "review", extractError: null });
    return;
  }

  const { generation, controller, signal } = jobController.begin();

  setOnboardingSessionState({
    objectKey,
    filename: filename ?? null,
    step: "analyzing",
    extractStatus: "running",
    extractStepLabel: "Starting analysis",
    extractError: null,
    extractRunId: null,
    extractStartedAt: Date.now(),
    draft: null
  });

  upsertAiJobIsland({
    id: EXTRACT_TOAST_ID,
    title: "Analyzing resume",
    onCancel: cancelExtractResumeJob,
    steps: islandStepsFromMap(RESUME_EXTRACT_STEP_LABELS),
    activeStepLabel: "Starting analysis"
  });

  void (async () => {
    try {
      const draft = await runExtractResume({
        objectKey,
        filename: filename ?? undefined,
        signal,
        onRunId: (runId) => {
          if (!jobController.isCurrent(generation)) return;
          setOnboardingSessionState({ extractRunId: runId });
        },
        onStepChange: ({ stepName, label }) => {
          if (!jobController.isCurrent(generation)) return;
          setOnboardingSessionState({ extractStepLabel: label });
          if (stepName) {
            advanceIslandMapStep(EXTRACT_TOAST_ID, stepName, label ?? stepName);
          } else if (label) {
            patchIslandActiveLabel(EXTRACT_TOAST_ID, label);
          }
        }
      });

      if (!jobController.isCurrent(generation)) return;

      setOnboardingSessionState({
        step: "review",
        draft,
        extractStatus: "ready",
        extractStepLabel: null,
        extractError: null,
        extractRunId: null
      });

      completeAiJobIsland(EXTRACT_TOAST_ID, {
        status: "success",
        resultTitle: "Resume ready to review",
        requiresAction: true,
        resultAction: {
          label: "Review",
          to: "/dashboard/onboarding"
        }
      });
    } catch (error) {
      if (!jobController.isCurrent(generation)) return;

      if (isAbortError(error) || controller.signal.aborted) {
        dismissAiJobIsland(EXTRACT_TOAST_ID);
        setOnboardingSessionState({
          step: "upload",
          extractStatus: "canceled",
          extractStepLabel: null,
          extractRunId: null,
          extractError: null
        });
        return;
      }

      const message = getWorkflowErrorMessage(error, "Resume analysis failed.");
      setOnboardingSessionState({
        step: "analyzing",
        extractStatus: "failed",
        extractStepLabel: null,
        extractError: message,
        extractRunId: null
      });

      const presentation = presentAiError(message, {
        feature: "resume",
        severity: "hard"
      });
      completeAiJobIsland(EXTRACT_TOAST_ID, {
        status: "error",
        resultTitle: presentation.title,
        errorMessage: presentation.description,
        requiresAction: true,
        resultAction: {
          label: "Open onboarding",
          to: "/dashboard/onboarding"
        }
      });
    } finally {
      jobController.clearIf(controller);
    }
  })();
}

/**
 * Explicit cancel — does not run on route change.
 */
export function cancelExtractResumeJob() {
  const session = getOnboardingSessionState();
  if (session.extractStatus !== "running") {
    setOnboardingSessionState({ extractStepLabel: null });
    return;
  }

  jobController.cancel(session.extractRunId);
  dismissAiJobIsland(EXTRACT_TOAST_ID);
  setOnboardingSessionState({
    step: "upload",
    extractStatus: "canceled",
    extractStepLabel: null,
    extractRunId: null,
    extractError: null
  });
}

/** Clear extract error so UI can retry cleanly. */
export function clearExtractResumeError() {
  setOnboardingSessionState({ extractError: null, extractStatus: "idle" });
}
