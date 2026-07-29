import { type NotificationChannelPrefs, type NotificationKind } from "./types";

export const NOTIFICATION_KINDS = [
  "mail.reply.draft_ready",
  "mail.classified.important",
  "application.stage_auto",
  "workflow.finished",
  "security.new_device_otp"
] as const satisfies readonly NotificationKind[];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  "mail.reply.draft_ready": "Reply draft ready",
  "mail.classified.important": "Important mail classified",
  "application.stage_auto": "Application stage auto-updated",
  "workflow.finished": "Workflow finished",
  "security.new_device_otp": "New device security code"
};

export const NOTIFICATION_KIND_DESCRIPTIONS: Record<NotificationKind, string> = {
  "mail.reply.draft_ready": "When a mail reply draft is waiting in Review (Assist mode).",
  "mail.classified.important": "When classify marks a message as high-signal career mail.",
  "application.stage_auto": "When CRM stage changes from mail classify.",
  "workflow.finished": "When a long-running AI workflow completes.",
  "security.new_device_otp": "One-time codes for new device trust (recommended on email)."
};

/** Product defaults: app on for most; email on for security + draft ready. */
export function defaultNotificationChannelPrefs(): NotificationChannelPrefs {
  return {
    "mail.reply.draft_ready": { app: true, email: true },
    "mail.classified.important": { app: true, email: false },
    "application.stage_auto": { app: true, email: false },
    "workflow.finished": { app: true, email: false },
    "security.new_device_otp": { app: true, email: true }
  };
}
