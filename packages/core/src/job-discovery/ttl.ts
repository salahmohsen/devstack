/** Null `inboxExpiresAt` is grandfathered and never expires. */
export function isInboxExpired(row: { inboxExpiresAt: Date | null; now: Date }): boolean {
  if (row.inboxExpiresAt == null) return false;
  return row.now.getTime() >= row.inboxExpiresAt.getTime();
}
