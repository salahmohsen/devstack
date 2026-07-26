import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  AiJobRunningToastBody,
  cancelMastraWorkflowRun,
  createDetachedJobController,
  getWorkflowErrorMessage,
  isAbortError,
  showAiJobRunningToast
} from "@/shared/lib/ai-job";

import {
  RESUME_IMPORT_WORKFLOW_ID,
  runExtractResume
} from "@/features/onboarding/api/extract-resume.mutation";
import {
  getOnboardingSessionState,
  setOnboardingSessionState,
  useOnboardingSession
} from "@/features/onboarding/lib/onboarding-session-store";

/** Stable sonner id so step updates + dismiss work across navigations */
const EXTRACT_TOAST_ID = "onboarding-extract-job";

const jobController = createDetachedJobController({
  cancelRemoteRun: (runId) => cancelMastraWorkflowRun(RESUME_IMPORT_WORKFLOW_ID, runId)
});

/** Live toast body — step text from session store so shimmer is not remounted each step */
function ExtractRunningToastBody() {
  const { extractStepLabel } = useOnboardingSession();
  return <AiJobRunningToastBody title="Analyzing resume…" stepLabel={extractStepLabel} />;
}

function showRunningToast() {
  showAiJobRunningToast({
    id: EXTRACT_TOAST_ID,
    onCancel: cancelExtractResumeJob,
    body: <ExtractRunningToastBody />
  });
}

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
    extractStepLabel: "Starting analysis…",
    extractError: null,
    extractRunId: null,
    extractStartedAt: Date.now(),
    draft: null
  });

  showRunningToast();

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
        onStepChange: (stepLabel) => {
          if (!jobController.isCurrent(generation)) return;
          // Store only — toast body is store-subscribed; re-showing would remount shimmer
          setOnboardingSessionState({ extractStepLabel: stepLabel });
        }
      });

      if (!jobController.isCurrent(generation)) return;

      toast.dismiss(EXTRACT_TOAST_ID);

      setOnboardingSessionState({
        step: "review",
        draft,
        extractStatus: "ready",
        extractStepLabel: null,
        extractError: null,
        extractRunId: null
      });

      toast.success("Resume ready to review", {
        description: "Check the draft before importing.",
        action: (
          <Link to="/dashboard/onboarding" data-button>
            Review
          </Link>
        ),
        duration: 12_000
      });
    } catch (error) {
      if (!jobController.isCurrent(generation)) return;

      toast.dismiss(EXTRACT_TOAST_ID);

      if (isAbortError(error) || controller.signal.aborted) {
        setOnboardingSessionState({
          step: "upload",
          extractStatus: "canceled",
          extractStepLabel: null,
          extractRunId: null,
          extractError: null
        });
        // Explicit cancel already toasts from cancelExtractResumeJob
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
      toast.error("Failed to analyze resume.", {
        description: message,
        action: (
          <Link to="/dashboard/onboarding" data-button>
            Retry
          </Link>
        )
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
  toast.dismiss(EXTRACT_TOAST_ID);
  setOnboardingSessionState({
    step: "upload",
    extractStatus: "canceled",
    extractStepLabel: null,
    extractRunId: null,
    extractError: null
  });
  toast.info("Resume analysis cancelled.");
}

/** Clear extract error so UI can retry cleanly. */
export function clearExtractResumeError() {
  setOnboardingSessionState({ extractError: null, extractStatus: "idle" });
}
