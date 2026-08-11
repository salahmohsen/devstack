/**
 * Hard-delete dismissed discoveries older than this many days (auto-purge tick).
 * Keeps URL dedup for a month of soft-archive; Restoring/Tracking resets the clock via updatedAt.
 */
export const DISMISSED_APPLICATION_PURGE_AFTER_DAYS = 30 as const;

/** Max dismissed rows hard-deleted per purge tick (bounds work per run). */
export const DISMISSED_APPLICATION_PURGE_BATCH_LIMIT = 500 as const;

/** BullMQ queue for dismissed-application auto-purge. */
export const DISMISSED_APPLICATION_PURGE_QUEUE_NAME = "dismissed-application-purge" as const;

export const DISMISSED_APPLICATION_PURGE_TICK_JOB_NAME =
  "dismissed-application-purge-tick" as const;

/** Daily tick — cheap scan + bounded delete. */
export const DISMISSED_APPLICATION_PURGE_TICK_INTERVAL_MS = 24 * 60 * 60 * 1000;
