import {
  ApplicationActivityKindSchema,
  ApplicationApplyMethodSchema,
  ApplicationOutcomeSchema,
  ApplicationSourceSchema,
  ApplicationSourceTagSchema,
  ApplicationStageSchema,
  ApplicationTrackingStatusSchema,
  EmploymentTypeSchema,
  HiringUrgencySchema,
  type ApplicationActivityKind,
  type ApplicationApplyMethod,
  type ApplicationOutcome,
  type ApplicationSource,
  type ApplicationSourceTag,
  type ApplicationStage,
  type ApplicationTrackingStatus,
  type EmploymentType,
  type HiringUrgency
} from "#@/application/types";

/** Board column order — single source derived from stage enum values. */
export const APPLICATION_STAGES = ApplicationStageSchema.options;

export const APPLICATION_OUTCOMES = ApplicationOutcomeSchema.options;

export const HIRING_URGENCIES = HiringUrgencySchema.options;

export const APPLICATION_SOURCES = ApplicationSourceSchema.options;

export const APPLICATION_SOURCE_TAGS = ApplicationSourceTagSchema.options;

export const APPLICATION_TRACKING_STATUSES = ApplicationTrackingStatusSchema.options;

const PLATFORM_TAGS = new Set<string>(ApplicationSourceSchema.options);

/**
 * Build multi source tags for discovery writes.
 * Channel: mail | hub | manual | discovery. Platform: linkedin | indeed | …
 */
export function buildApplicationSourceTags(input: {
  channel: "mail" | "hub" | "manual" | "discovery";
  platform?: ApplicationSource | null;
}): ApplicationSourceTag[] {
  const tags = new Set<ApplicationSourceTag>([input.channel]);
  if (input.platform && PLATFORM_TAGS.has(input.platform)) {
    tags.add(input.platform as ApplicationSourceTag);
  }
  return [...tags];
}

export const APPLICATION_SOURCE_TAG_LABELS: Record<ApplicationSourceTag, string> = {
  mail: "Mail",
  hub: "Hub",
  manual: "Manual",
  discovery: "Discovery",
  linkedin: "LinkedIn",
  indeed: "Indeed",
  company_website: "Company site",
  referral: "Referral",
  recruiter: "Recruiter",
  other: "Other"
};

export const APPLICATION_TRACKING_STATUS_LABELS: Record<ApplicationTrackingStatus, string> = {
  inbox: "New",
  tracked: "Tracked",
  dismissed: "Dismissed"
};

export const APPLICATION_ACTIVITY_KINDS = ApplicationActivityKindSchema.options;

export const APPLICATION_ACTIVITY_KIND_LABELS: Record<ApplicationActivityKind, string> = {
  discovered: "Discovered",
  promoted: "Tracked",
  dismissed: "Dismissed",
  restored: "Restored",
  note: "Note",
  stage_changed: "Stage changed",
  outcome_set: "Outcome set",
  package_generated: "Package generated",
  silence_nudged: "Quiet reminder",
  ghosted_suggested: "Suggest ghosted"
};

/**
 * Human-readable one-line summary for an activity row (system + notes).
 */
export function formatApplicationActivitySummary(input: {
  kind: ApplicationActivityKind;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const meta = input.metadata ?? {};
  switch (input.kind) {
    case "discovered": {
      const via = typeof meta.via === "string" ? meta.via : null;
      if (via === "manual_create") return "Added manually";
      if (via === "hub_create") return "Created from hub";
      if (via === "crm_create") return "Created from mail";
      if (via === "discovery") return "Discovered from job search";
      return "Discovered from job alert";
    }
    case "promoted": {
      const from = typeof meta.from === "string" ? meta.from : null;
      if (from === "dismissed") return "Tracked from dismissed";
      if (from === "inbox") return "Moved to Tracked jobs";
      return "Moved to Tracked jobs";
    }
    case "dismissed":
      return "Dismissed from New jobs";
    case "restored":
      return "Restored to New jobs";
    case "note": {
      const body = input.body?.trim();
      return body && body.length > 0 ? body : "Note";
    }
    case "stage_changed": {
      const to =
        typeof meta.toStage === "string"
          ? (APPLICATION_STAGE_LABELS[meta.toStage as ApplicationStage] ?? meta.toStage)
          : null;
      const from =
        typeof meta.fromStage === "string"
          ? (APPLICATION_STAGE_LABELS[meta.fromStage as ApplicationStage] ?? meta.fromStage)
          : null;
      if (to && from) return `Moved from ${from} to ${to}`;
      if (to) return `Moved to ${to}`;
      return "Stage updated";
    }
    case "outcome_set": {
      const outcome =
        typeof meta.outcome === "string"
          ? (APPLICATION_OUTCOME_LABELS[meta.outcome as ApplicationOutcome] ?? meta.outcome)
          : null;
      return outcome ? `Closed as ${outcome}` : "Outcome set";
    }
    case "package_generated":
      return "Apply package generated";
    case "silence_nudged":
      return "This job has been quiet for 7 days";
    case "ghosted_suggested":
      return "Still quiet after 14 days. You can mark this as ghosted.";
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}

/** True when the event is a user-authored note (vs system). */
export function isUserApplicationActivity(kind: ApplicationActivityKind): boolean {
  return kind === "note";
}

export const APPLICATION_APPLY_METHODS = ApplicationApplyMethodSchema.options;

export const EMPLOYMENT_TYPES = EmploymentTypeSchema.options;

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

export const APPLICATION_SOURCE_LABELS: Record<ApplicationSource, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  company_website: "Company website",
  referral: "Referral",
  recruiter: "Recruiter",
  other: "Other"
};

export const APPLICATION_APPLY_METHOD_LABELS: Record<ApplicationApplyMethod, string> = {
  easy_apply: "Easy Apply",
  external: "External",
  email: "Email",
  unknown: "Unknown"
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  unknown: "Unknown",
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship"
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

export function applicationSourceOptions() {
  return APPLICATION_SOURCES.map((value) => {
    return {
      value,
      label: APPLICATION_SOURCE_LABELS[value]
    };
  });
}

export function applicationApplyMethodOptions() {
  return APPLICATION_APPLY_METHODS.map((value) => {
    return {
      value,
      label: APPLICATION_APPLY_METHOD_LABELS[value]
    };
  });
}

export function employmentTypeOptions() {
  return EMPLOYMENT_TYPES.map((value) => {
    return {
      value,
      label: EMPLOYMENT_TYPE_LABELS[value]
    };
  });
}

export function isApplicationOpen(outcome: ApplicationOutcome | null | undefined): boolean {
  return outcome == null;
}
