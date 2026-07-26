import { type ResumeImportDraft } from "@tsu-stack/core";

import { createExternalStore, type AiJobStatus } from "@/shared/lib/ai-job";

export type OnboardingFlowStep = "upload" | "analyzing" | "review" | "done";

export type OnboardingApplySummary = {
  experiences: number;
  projects: number;
  stacks: number;
};

/**
 * In-memory onboarding session (survives dashboard route changes).
 * Cleared on full page reload, successful apply/skip reset, or explicit discard.
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
}

export function resetOnboardingSessionState() {
  store.resetState();
}

/**
 * Global onboarding session UI + extract job state.
 * Survives leaving `/dashboard/onboarding` mid-flow.
 */
export function useOnboardingSession() {
  return store.useStore();
}
