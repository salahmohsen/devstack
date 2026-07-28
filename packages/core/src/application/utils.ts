import {
  ApplicationOutcomeSchema,
  ApplicationStageSchema,
  HiringUrgencySchema,
  type ApplicationOutcome,
  type ApplicationStage,
  type HiringUrgency
} from "#@/application/types";

/** Board column order — single source derived from stage enum values. */
export const APPLICATION_STAGES = ApplicationStageSchema.options;

export const APPLICATION_OUTCOMES = ApplicationOutcomeSchema.options;

export const HIRING_URGENCIES = HiringUrgencySchema.options;

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer"
};

export const APPLICATION_OUTCOME_LABELS: Record<ApplicationOutcome, string> = {
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
  accepted: "Accepted"
};

export const HIRING_URGENCY_LABELS: Record<HiringUrgency, string> = {
  unknown: "Unknown",
  immediate: "Immediate",
  soon: "Soon",
  flexible: "Flexible"
};

export function applicationStageOptions() {
  return APPLICATION_STAGES.map((value) => {
    return {
      value,
      label: APPLICATION_STAGE_LABELS[value]
    };
  });
}

export function applicationOutcomeOptions() {
  return APPLICATION_OUTCOMES.map((value) => {
    return {
      value,
      label: APPLICATION_OUTCOME_LABELS[value]
    };
  });
}

export function hiringUrgencyOptions() {
  return HIRING_URGENCIES.map((value) => {
    return {
      value,
      label: HIRING_URGENCY_LABELS[value]
    };
  });
}

export function isApplicationOpen(outcome: ApplicationOutcome | null | undefined): boolean {
  return outcome == null;
}
