/**
 * Pure policy helpers for hub superpowers (focus job, package quality gate).
 * Safe for multi-variable unit stress tests without DB/LLM.
 */

export type JobScoreRow = {
  id: string;
  title?: string | null;
  companyName?: string | null;
  matchScore?: number | null;
  description?: string | null;
};

/** G1: offer package only when title+company+description ≥ this length. */
export const APPLY_PACKAGE_MIN_DESCRIPTION_CHARS = 400;

/**
 * Focus job: named id if present in just-tracked, else highest matchScore.
 * Ties break by first occurrence (stable).
 */
export function selectFocusJob(
  justTracked: JobScoreRow[],
  namedApplicationId?: string | null
): JobScoreRow | null {
  if (justTracked.length === 0) return null;

  const named = namedApplicationId?.trim();
  if (named) {
    const found = justTracked.find((j) => j.id === named);
    if (found) return found;
  }

  let best: JobScoreRow | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const job of justTracked) {
    const score = typeof job.matchScore === "number" ? job.matchScore : Number.NEGATIVE_INFINITY;
    if (score > bestScore) {
      best = job;
      bestScore = score;
    }
  }
  // All scores missing → first tracked
  return best ?? justTracked[0] ?? null;
}

/** G1 package quality: combined title + company + description length. */
export function descriptionQualityLength(job: {
  title?: string | null;
  companyName?: string | null;
  description?: string | null;
}): number {
  return (
    (job.title?.trim().length ?? 0) +
    (job.companyName?.trim().length ?? 0) +
    (job.description?.trim().length ?? 0)
  );
}

export function meetsApplyPackageQualityGate(job: {
  title?: string | null;
  companyName?: string | null;
  description?: string | null;
}): boolean {
  return descriptionQualityLength(job) >= APPLY_PACKAGE_MIN_DESCRIPTION_CHARS;
}

/**
 * Filter triage confirm output against proposed ids (uncheck safety).
 * Only returns ids that were both confirmed and originally proposed.
 */
export function filterConfirmedTriageIds(input: {
  proposedTrackIds: string[];
  proposedDismissIds: string[];
  trackIds: string[];
  dismissIds: string[];
}): { trackIds: string[]; dismissIds: string[] } {
  const trackAllowed = new Set(input.proposedTrackIds);
  const dismissAllowed = new Set(input.proposedDismissIds);
  return {
    trackIds: input.trackIds.filter((id) => trackAllowed.has(id)),
    dismissIds: input.dismissIds.filter((id) => dismissAllowed.has(id))
  };
}

/**
 * Client HITL tools (no server execute). After the model calls one, the loop
 * must stop so ensure-final-response cannot force a "awaiting confirmation"
 * wrap-up. Names cover kebab ids and camel registration keys.
 */
export const HUB_CLIENT_HITL_TOOL_NAMES = new Set([
  "propose-new-jobs-triage",
  "proposeNewJobsTriage",
  "propose-application-from-jd",
  "proposeApplicationFromJd",
  "open-surface",
  "openSurface"
]);

export function isHubClientHitlToolName(name: string): boolean {
  return HUB_CLIENT_HITL_TOOL_NAMES.has(name);
}

/** Stop the agentic loop while a client confirmation card is still waiting. */
export function shouldStopHubLoopAfterClientHitl(ctx: {
  toolCalls: Array<{ id: string; name: string }>;
  toolResults: Array<{ id: string }>;
}): boolean {
  const completed = new Set(ctx.toolResults.map((result) => result.id));
  return ctx.toolCalls.some(
    (call) => isHubClientHitlToolName(call.name) && !completed.has(call.id)
  );
}
