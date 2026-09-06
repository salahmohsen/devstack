import { MAX_OPEN_INBOX } from "./constants";

/** Inbox insert gate. 50-cap is trackingStatus=inbox only. */
export function inboxKeeperInsertAllowed(input: {
  openInbox: number;
  inboxThisRun: number;
  poolSize: number;
}): boolean {
  return input.openInbox < MAX_OPEN_INBOX && input.inboxThisRun < input.poolSize;
}

/**
 * How many fetched candidates this run may still land into inbox.
 * seats from open-inbox cap; remainingN from poolSize (DISCOVERY_FETCH_POOL_SIZE);
 * AI seats only when a key is present.
 */
export function computeLandBudget(input: {
  poolSize: number;
  openInbox: number;
  /** pending + AI-passed still inbox for this runId */
  inboxThisRun: number;
  remainingDailyAiAttempts: number;
  hasAiKey: boolean;
}): number {
  const seats = Math.max(0, MAX_OPEN_INBOX - input.openInbox);
  const remainingN = Math.max(0, input.poolSize - input.inboxThisRun);
  const aiSeats = input.hasAiKey ? Math.max(0, input.remainingDailyAiAttempts) : remainingN;
  return Math.min(remainingN, seats, aiSeats);
}
