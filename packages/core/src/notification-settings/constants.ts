import { type NotificationChannelPrefs, type NotificationKind } from "./types";

/**
 * Full product kind set (prefs + emit).
 * Mail-assistant sparse kinds (`mail.needs_action`, `mail.apply_nudge`, `mail.job_alerts_ready`):
 * emit only on those events — never on noise file, per-link crawl, or below-threshold skips.
 * Emit wiring for the three assistant kinds may wait for P1 harvest/classify paths.
 */
export const NOTIFICATION_KINDS = [
  "mail.classified.important",
  "mail.needs_action",
  "mail.apply_nudge",
  "mail.job_alerts_ready",
  "application.stage_auto",
  "application.silence_nudge",
  "application.ghosted_suggest",
  "workflow.finished",
  "security.new_device_otp"
] as const satisfies readonly NotificationKind[];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  "mail.classified.important": "Important mail classified",
  "mail.needs_action": "Mail needs action",
  "mail.apply_nudge": "Apply nudge",
  "mail.job_alerts_ready": "Job alerts ready",
  "application.stage_auto": "Application stage auto-updated",
  "application.silence_nudge": "Quiet tracked job",
  "application.ghosted_suggest": "Suggest mark ghosted",
  "workflow.finished": "Workflow finished",
  "security.new_device_otp": "New device security code"
};

export const NOTIFICATION_KIND_DESCRIPTIONS: Record<NotificationKind, string> = {
  "mail.classified.important": "When classify marks a message as high-signal career mail.",
  "mail.needs_action":
    "When mail is marked as recruiter, interview, offer, or another explicit action item.",
  "mail.apply_nudge": "When a saved or expiring job listing needs an apply reminder.",
  "mail.job_alerts_ready":
    "When a job-alert digest creates matched applications (batched; not per-link crawl).",
  "application.stage_auto": "When CRM stage changes from mail classify.",
  "application.silence_nudge":
    "When a tracked job has had no stage change and no linked mail for 7 days.",
  "application.ghosted_suggest":
    "When a tracked job has been quiet for 14 days. Suggests Ghosted; does not set it.",
  "workflow.finished": "When a long-running AI workflow completes.",
  "security.new_device_otp": "One-time codes for new device trust (recommended on email)."
};

/** Product defaults: app on for most; email on for security. */
export function defaultNotificationChannelPrefs(): NotificationChannelPrefs {
  return {
    "mail.classified.important": { app: true, email: false },
    "mail.needs_action": { app: true, email: false },
    "mail.apply_nudge": { app: true, email: false },
    "mail.job_alerts_ready": { app: true, email: false },
    "application.stage_auto": { app: true, email: false },
    "application.silence_nudge": { app: true, email: false },
    "application.ghosted_suggest": { app: true, email: false },
    "workflow.finished": { app: true, email: false },
    "security.new_device_otp": { app: true, email: true }
  };
}

/** Kinds that always send email immediately (never digests). */
export const IMMEDIATE_EMAIL_NOTIFICATION_KINDS = ["security.new_device_otp"] as const;

export const NOTIFICATION_DIGEST_QUEUE_NAME = "notification-digest" as const;
export const NOTIFICATION_DIGEST_TICK_JOB_NAME = "notification-digest-tick" as const;
/** Default digest fan-out interval. */
export const NOTIFICATION_DIGEST_TICK_INTERVAL_MS = 60 * 60 * 1000;
