import { type ResumeImportDraft } from "@tsu-stack/core";

import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type OnboardingFlowStep = "upload" | "analyzing" | "review" | "jobs" | "connect" | "done";

export const ONBOARDING_DESTINATION_STEPS = [
  { id: "upload", label: "Resume", matches: ["upload", "analyzing"] as const },
  { id: "review", label: "Review", matches: ["review"] as const },
  { id: "jobs", label: "Jobs", matches: ["jobs"] as const },
  { id: "connect", label: "Connect", matches: ["connect"] as const },
  { id: "done", label: "Ready", matches: ["done"] as const }
] as const;

export type OnboardingApplySummary = {
  experiences: number;
  projects: number;
  stacks: number;
};

/**
 * In-memory onboarding session (survives dashboard route changes).
 * Step is also mirrored to sessionStorage so OAuth return can resume Connect.
 */
export type OnboardingSessionState = {
  step: OnboardingFlowStep;
  objectKey: string | null;
  filename: string | null;
  draft: ResumeImportDraft | null;
  applySummary: OnboardingApplySummary | null;
  /** Extract / analyze job lifecycle */
  extractStatus: AiJobStatus;
  extractStepLabel: string | null;
  extractError: string | null;
  extractRunId: string | null;
  extractStartedAt: number | null;
};

const STEP_STORAGE_KEY = "tsu.onboarding.step";

const FLOW_STEPS: readonly OnboardingFlowStep[] = [
  "upload",
  "analyzing",
  "review",
  "jobs",
  "connect",
  "done"
];

function isFlowStep(value: string): value is OnboardingFlowStep {
  return (FLOW_STEPS as readonly string[]).includes(value);
}

function persistStep(step: OnboardingFlowStep) {
  try {
    sessionStorage.setItem(STEP_STORAGE_KEY, step);
  } catch {
    // Private mode / SSR — in-memory store is enough.
  }
}

export function readPersistedOnboardingStep(): OnboardingFlowStep | null {
  try {
    const raw = sessionStorage.getItem(STEP_STORAGE_KEY);
    if (raw && isFlowStep(raw)) return raw;
  } catch {
    return null;
  }
  return null;
}

export function clearPersistedOnboardingStep() {
  try {
    sessionStorage.removeItem(STEP_STORAGE_KEY);
  } catch {
    // ignore
  }
}

const initialState: OnboardingSessionState = {
  step: "upload",
  objectKey: null,
  filename: null,
  draft: null,
  applySummary: null,
  extractStatus: "idle",
  extractStepLabel: null,
  extractError: null,
  extractRunId: null,
  extractStartedAt: null
};

const store = createExternalStore(initialState);

export function getOnboardingSessionState() {
  return store.getState();
}

export function setOnboardingSessionState(partial: Partial<OnboardingSessionState>) {
  store.setState(partial);
  if (partial.step) persistStep(partial.step);
}

export function resetOnboardingSessionState() {
  store.resetState();
  clearPersistedOnboardingStep();
}

/**
 * Global onboarding session UI + extract job state.
 * Survives leaving `/dashboard/onboarding` mid-flow.
 */
export function useOnboardingSession() {
  return store.useStore();
}
