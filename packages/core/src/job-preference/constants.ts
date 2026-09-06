import { type WorkMode } from "./types";

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const satisfies readonly WorkMode[];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site"
};

/** Default hard-skip threshold for auto job harvest → Application. */
export const DEFAULT_MIN_MATCH_SCORE = 60;

/** Default for mail-harvest → discovery import toggle (off for all users). */
export const DEFAULT_IMPORT_FROM_EMAIL = false;

/** Default: dashboard opens the apply-kit review sheet before accept. */
export const DEFAULT_REVIEW_APPLY_KIT = true;
