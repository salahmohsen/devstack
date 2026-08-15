import { LIVENESS_AFTER_MS } from "./constants";

/** First HTTP liveness check: `createdAt + LIVENESS_AFTER_MS` (~3.5d). */
export function inboxLivenessDueAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + LIVENESS_AFTER_MS);
}

/** Null `inboxExpiresAt` is grandfathered and never expires. */
export function isInboxExpired(row: { inboxExpiresAt: Date | null; now: Date }): boolean {
  if (row.inboxExpiresAt == null) return false;
  return row.now.getTime() >= row.inboxExpiresAt.getTime();
}
