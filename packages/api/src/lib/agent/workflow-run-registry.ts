import { ORPCError } from "@orpc/server";

/**
 * Process-local ownership map for Mastra workflow runs started via the API.
 *
 * Binds `runId` → authenticated `userId` so `cancelWorkflowRun` cannot cancel
 * another user's run. Entries are not durable across processes/restarts;
 * unknown runIds are treated as forbidden (fail closed).
 */

type RegistryEntry = {
  userId: string;
  createdAt: number;
};

/** Default TTL for run ownership entries (2 hours). */
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

const ownership = new Map<string, RegistryEntry>();

let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function maybeCleanup(ttlMs: number = DEFAULT_TTL_MS): void {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  const cutoff = now - ttlMs;
  for (const [runId, entry] of ownership) {
    if (entry.createdAt < cutoff) {
      ownership.delete(runId);
    }
  }
}

/** Record that `userId` owns `runId` (call when create-run returns). */
export function registerWorkflowRun(runId: string, userId: string): void {
  maybeCleanup();
  ownership.set(runId, { userId, createdAt: Date.now() });
}

/** Drop ownership (optional; TTL also expires entries). */
export function unregisterWorkflowRun(runId: string): void {
  ownership.delete(runId);
}

/**
 * Ensure `userId` owns `runId`. Throws ORPCError FORBIDDEN on mismatch or unknown.
 */
export function assertWorkflowRunOwner(runId: string, userId: string): void {
  maybeCleanup();
  const entry = ownership.get(runId);
  if (!entry || entry.userId !== userId) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have permission to cancel this workflow run"
    });
  }
}
