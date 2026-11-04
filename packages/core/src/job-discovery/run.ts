import { z } from "zod";

export const DiscoveryRunStageSchema = z.enum([
  "queued",
  "fetching",
  "filtering",
  "scoring",
  "retrying",
  "completed",
  "failed"
]);
export type DiscoveryRunStage = z.infer<typeof DiscoveryRunStageSchema>;
export const DiscoveryCandidateOutcomeSchema = z.enum([
  "pending",
  "passed",
  "dismissed",
  "heuristic",
  "skipped",
  "failed"
]);
export type DiscoveryCandidateOutcome = z.infer<typeof DiscoveryCandidateOutcomeSchema>;
export const DiscoveryRunSchema = z.object({
  runId: z.string(),
  stage: DiscoveryRunStageSchema,
  reason: z.string().nullable(),
  fetched: z.number().int().nonnegative(),
  evaluated: z.number().int().nonnegative(),
  added: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
  scheduledAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  retryAt: z.string().datetime().nullable()
});
export type DiscoveryRun = z.infer<typeof DiscoveryRunSchema>;
export const DiscoveryStatusInputSchema = z.object({ runId: z.string().min(1).optional() });
export const DiscoveryStatusOutputSchema = z.object({
  userId: z.string(),
  run: DiscoveryRunSchema.nullable(),
  lastSuccessfulAt: z.string().datetime().nullable(),
  nextScheduledAt: z.string().datetime().nullable()
});
export function isDiscoveryRunTerminal(stage: DiscoveryRunStage): boolean {
  return stage === "completed" || stage === "failed";
}
export function discoveryBlockedReason(reason: string | null): string | null {
  if (reason === "title_required") {
    return "Choose a role or category in Job preferences, then try again.";
  }
  if (reason === "inbox_full") {
    return "Your inbox is full. Dismiss or track some jobs, then try again.";
  }
  return null;
}
export function discoveryRunLabel(run: DiscoveryRun): string {
  if (isDiscoveryRunTerminal(run.stage) && discoveryBlockedReason(run.reason)) {
    return "Search paused";
  }
  switch (run.stage) {
    case "queued":
      return "Search queued";
    case "fetching":
      return "Fetching listings…";
    case "filtering":
      return `Checking ${run.fetched} listings against your preferences…`;
    case "scoring":
      return `Screening matches: ${run.evaluated} checked, ${run.added} added…`;
    case "retrying":
      return "Job source unavailable. Retrying…";
    case "failed":
      return "Search failed";
    case "completed":
      return run.added > 0 ? `${run.added} new jobs added` : "Search completed with no new matches";
  }
}
