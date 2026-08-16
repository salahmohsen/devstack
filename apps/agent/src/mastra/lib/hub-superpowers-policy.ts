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
  "openSurface",
  "propose-hard-preference-change",
  "proposeHardPreferenceChange",
  "open-entity-form",
  "openEntityForm",
  "open-entity-inspect",
  "openEntityInspect",
  "find-jobs-now",
  "findJobsNow",
  "get-search-brief",
  "getSearchBrief"
]);

export function isHubClientHitlToolName(name: string): boolean {
  return HUB_CLIENT_HITL_TOOL_NAMES.has(name);
}

/**
 * Silent listing prelude: fetch/extract only. Mastra registers supervisor
 * agents as `agent-<registrationKey>` (screenshot: `agent-jobPageExtractor`).
 */
export const HUB_JOB_PAGE_EXTRACT_TOOL_NAMES = new Set([
  "jobPageExtractor",
  "job-page-extractor",
  "agent-jobPageExtractor",
  "agent-job-page-extractor",
  "fetch-job-page",
  "fetchJobPage"
]);

export function isProposeApplicationFromJdToolName(name: string): boolean {
  return name === "propose-application-from-jd" || name === "proposeApplicationFromJd";
}

export function isProposeNewJobsTriageToolName(name: string): boolean {
  return name === "propose-new-jobs-triage" || name === "proposeNewJobsTriage";
}

export function isListNewJobsToolName(name: string): boolean {
  return name === "list-new-jobs" || name === "listNewJobs";
}

export function isHubJobPageExtractToolName(name: string): boolean {
  if (HUB_JOB_PAGE_EXTRACT_TOOL_NAMES.has(name)) return true;
  const bare = name.startsWith("agent-") ? name.slice("agent-".length) : name;
  return /jobPageExtractor|job-page-extractor|fetch-job-page|fetchJobPage/i.test(bare);
}

const HTTP_URL_RE = /https?:\/\/[^\s)>\]]+/gi;

/** LinkedIn `/jobs/view/`, ATS boards, and `/jobs|careers|positions/…` listing paths. */
export function isJobListingUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/[.,;:]+$/, ""));
  } catch {
    return false;
  }
  if (!/^https?:$/i.test(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (host.includes("linkedin.") && /\/(?:comm\/)?jobs\//.test(path)) return true;
  if (host.includes("indeed.") && (path.includes("viewjob") || path.includes("/job"))) return true;
  if (
    host.includes("greenhouse.io") ||
    host.includes("lever.co") ||
    host.includes("ashbyhq.com") ||
    host.includes("myworkdayjobs.com") ||
    host.includes("wellfound.com") ||
    host.includes("angel.co") ||
    host.includes("otta.com") ||
    host.includes("glassdoor.") ||
    host.includes("ziprecruiter.") ||
    host.includes("smartrecruiters.") ||
    host.includes("jobvite.") ||
    host.includes("workable.com") ||
    host.includes("bamboohr.com")
  ) {
    return true;
  }
  if (host.includes("github.")) return false;
  // BrassRing / Kenexa and regional portals: /careersME/PipelineDetail/…
  if (/\/(?:pipeline-?detail|job-?detail)\//.test(path)) return true;
  // /jobs/, /career/, /careers/, /careersME/, /positions/…
  return /\/(jobs?|careers?[a-z0-9]*|positions?)\/.+/.test(path);
}

export function extractJobListingUrlFromText(text: string): string | null {
  const matches = text.match(HTTP_URL_RE) ?? [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:]+$/, "");
    if (isJobListingUrl(cleaned)) return cleaned;
  }
  return null;
}

/** URL-only (or URL + short intent). Full JD paste should skip extract. */
export function isUrlOnlyJobListingPaste(text: string): boolean {
  const url = extractJobListingUrlFromText(text);
  if (!url) return false;
  const remainder = text.replace(url, "").replace(HTTP_URL_RE, "").replace(/\s+/g, " ").trim();
  return remainder.length < 120;
}

export const HUB_JOB_URL_IMPORT_FEEDBACK =
  "The user pasted a job listing URL. You may call jobPageExtractor at most once as a silent prelude. Do not call getJobPreferences, list*, or any other tool. Then you MUST call propose-application-from-jd with title, companyName, the FULL job description (all sections from the page — not an 800-char teaser), url (the listing URL), applyUrl, location, numeric matchScore 0–100, notes (1–3 sentence agent's take vs the seeker), and when stated: workMode, salaryRange, requiredSkills[], preferredSkills[]. If extract fails or the page is a login wall, still propose with that url and an empty description. Emit ZERO user-facing text until the proposal card. Never dump extractor JSON or restate the listing as prose. Do not extract twice.";

export const HUB_JOB_URL_MUST_PROPOSE_FEEDBACK =
  "Extract already ran. Do NOT call jobPageExtractor, fetch-job-page, or getJobPreferences again. Call propose-application-from-jd NOW with title, companyName, the FULL job description from the extract (or an empty description if the page was a login wall or extract failed), url (the listing URL), applyUrl, location, numeric matchScore 0–100, notes (1–3 sentence agent's take vs the seeker), and when stated: workMode, salaryRange, requiredSkills[], preferredSkills[]. Emit ZERO user-facing text until the proposal card. Never dump extractor JSON or restate the listing as prose.";

export const HUB_TRIAGE_MUST_PROPOSE_FEEDBACK =
  "listNewJobs already returned inbox rows. Do NOT call jobPreferenceMatchScorer, getJobPreferences, listExperiences, or any other tool. Call propose-new-jobs-triage NOW with track[] / dismiss[] using the real ids, titles, companyNames, matchScores, and a one-sentence reason each. Emit ZERO user-facing text — no markdown tables, no bullet recap. The triage card is the UI.";

export function hubJobUrlImportFeedback(sawExtract: boolean): string {
  return sawExtract ? HUB_JOB_URL_MUST_PROPOSE_FEEDBACK : HUB_JOB_URL_IMPORT_FEEDBACK;
}

/** Tools the supervisor may use while importing a pasted listing URL. */
export function filterHubJobUrlImportActiveTools(
  toolNames: readonly string[],
  sawExtract: boolean
): string[] {
  return toolNames.filter((name) => {
    if (isProposeApplicationFromJdToolName(name)) return true;
    if (sawExtract) return false;
    return isHubJobPageExtractToolName(name);
  });
}

/** Extract ran this iteration; the JD card has not been proposed yet. */
export function shouldForceProposeApplicationFromJd(toolNames: readonly string[]): boolean {
  const extractCalled = toolNames.some((name) => isHubJobPageExtractToolName(name));
  const proposeCalled = toolNames.some((name) => isProposeApplicationFromJdToolName(name));
  return extractCalled && !proposeCalled;
}

/** Tools allowed after listNewJobs returned inbox rows. */
export function filterHubTriageActiveTools(toolNames: readonly string[]): string[] {
  return toolNames.filter((name) => isProposeNewJobsTriageToolName(name));
}

/** listNewJobs ran this iteration; the triage card has not been proposed yet. */
export function shouldForceProposeNewJobsTriage(toolNames: readonly string[]): boolean {
  const listed = toolNames.some((name) => isListNewJobsToolName(name));
  const proposed = toolNames.some((name) => isProposeNewJobsTriageToolName(name));
  return listed && !proposed;
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
