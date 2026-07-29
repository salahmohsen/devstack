/** Resend inbound event type we persist into Career Inbox. */
export const RESEND_EMAIL_RECEIVED_EVENT = "email.received" as const;

/** Path segment used under the API server base. */
export const RESEND_WEBHOOK_PATH_PREFIX = "/webhooks/resend" as const;
