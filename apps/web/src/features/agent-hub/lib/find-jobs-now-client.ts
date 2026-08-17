import { getFindJobsNowState } from "@/shared/lib/find-jobs-now-store";

const startedToolCallIds = new Set<string>();

/**
 * First live call may enqueue. Remounts of the same toolCallId, and extra
 * find-jobs-now parts from a resume loop while a search is already running,
 * must not call enqueue again (that stacks “already running” toasts).
 */
export function claimFindJobsNowEnqueue(toolCallId: string): boolean {
  if (toolCallId && startedToolCallIds.has(toolCallId)) return false;
  if (getFindJobsNowState().status === "running") {
    if (toolCallId) startedToolCallIds.add(toolCallId);
    return false;
  }
  if (toolCallId) startedToolCallIds.add(toolCallId);
  return true;
}

export function resetFindJobsNowClientForTests() {
  startedToolCallIds.clear();
}
