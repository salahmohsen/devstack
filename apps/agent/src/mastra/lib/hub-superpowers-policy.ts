export { hubSupervisorInstructions } from "./hub-system-prompt.ts";

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
  "getSearchBrief",
  "propose-evidence-change",
  "proposeEvidenceChange",
  "open-daily-brief",
  "openDailyBrief",
  "propose-mail-crm-change",
  "proposeMailCrmChange"
]);

export function isHubClientHitlToolName(name: string): boolean {
  return HUB_CLIENT_HITL_TOOL_NAMES.has(name);
}

export function filterHubTodayGatherActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => isGetDailyBriefToolName(name));
}

export function filterHubTodayOpenActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => isOpenDailyBriefToolName(name));
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

export function isGetSearchBriefToolName(name: string): boolean {
  return name === "get-search-brief" || name === "getSearchBrief";
}

export function isGetDailyBriefToolName(name: string): boolean {
  return name === "get-daily-brief" || name === "getDailyBrief";
}

export function isOpenDailyBriefToolName(name: string): boolean {
  return name === "open-daily-brief" || name === "openDailyBrief";
}

export function userTurnAsksDailyBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /what (do )?you have for me today|what you have for me today|what (do )?we have( today)?|what have we (got )?today|what we got today|what have you (got )?today/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /what'?s (new|up)( today)?\b|daily (recap|brief|briefing)|for me today|today'?s (brief|briefing|pile|stuff)|catch me up|what'?s(?: \w+){0,3} on my plate|\bon my plate\b|brief me\b|anything (new )?(for me|today)|what landed|what showed up|update me( on today)?|what should i know today/i.test(
      t
    )
  ) {
    return true;
  }
  // Average English: "what we have today?", prefixes allowed ("don't give me a vibe check. what's … today")
  if (/\b(what|anything|whats|what'?s)\b[\s\S]{0,80}\btoday\b/i.test(t)) return true;
  return false;
}

/** Short follow-up after a Today ask — "try again", "you didn't do anything". */
export function userTurnRetriesDailyBrief(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /try (to )?(again|open)|try again|^again\.?$|open (it|the (side )?panel|the (letter|brief|briefing))|(show|open) (the )?(letter|brief|briefing)|the side panel|you didn'?t (make|do|open|pull)|didn'?t (do|make) any ?thing|still nothing|still no(thing)?\b|nothing happened|no panel|you did nothing/i.test(
    t
  );
}

export const HUB_TODAY_MUST_GATHER_FEEDBACK =
  "<system-reminder>They asked what you have for them today. Call getDailyBrief now for facts. Do not triage. Do not findJobsNow. Do not mention this reminder.</system-reminder>";

const COMPANY_STATUS_STOPWORDS = new Set([
  "and",
  "the",
  "they",
  "them",
  "their",
  "just",
  "you",
  "did",
  "have",
  "has",
  "any",
  "for",
  "from",
  "about",
  "with",
  "what",
  "whats",
  "how",
  "are",
  "was",
  "were",
  "email",
  "emails",
  "mail",
  "quiet",
  "stage",
  "news",
  "say",
  "tell",
  "check",
  "look",
  "write",
  "back",
  "still",
  "only"
]);

const TODAY_PACKED_STOPWORDS = new Set([
  ...COMPANY_STATUS_STOPWORDS,
  "today",
  "catch",
  "plate",
  "vibe",
  "check",
  "actually",
  "looking",
  "brief",
  "letter",
  "stuff",
  "update",
  "know",
  "landed",
  "showed",
  "ya3ni",
  "half",
  "dropped"
]);

const COMPANY_STATUS_SIGNAL_RE =
  /\b(stage|email|emails|mail|quiet|reply|replied|news|heard|applied|status|receipt|write back)\b/i;

function leftoverCompanyStatusTokens(text: string): string[] {
  return text
    .replace(/[^a-z0-9'\s]/gi, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !COMPANY_STATUS_STOPWORDS.has(word.toLowerCase()));
}

/** "trivelta? they email me or just quiet" — named company + status/mail. */
export function userTurnAsksCompanyStatus(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    userTurnRetriesDailyBrief(t) &&
    !userTurnAsksDailyBrief(t) &&
    !COMPANY_STATUS_SIGNAL_RE.test(t)
  ) {
    return false;
  }
  if (!COMPANY_STATUS_SIGNAL_RE.test(t)) return false;
  if (userTurnAsksEntityInspect(t) && leftoverCompanyStatusTokens(t).length === 0) {
    return false;
  }
  const leftover = leftoverCompanyStatusTokens(t);
  if (userTurnAsksDailyBrief(t)) {
    return leftover.filter((word) => !TODAY_PACKED_STOPWORDS.has(word.toLowerCase())).length > 0;
  }
  return leftover.length > 0;
}

export function filterHubCompanyStatusActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) =>
    /searchApplications|search-applications|getApplication|get-application|searchMail|search-mail|getMail|get-mail|listNewJobs|list-new-jobs|classifyMail|classify-mail|explainApplicationVsPrefs|explain-application-vs-prefs/i.test(
      name
    )
  );
}

export const HUB_COMPANY_MUST_READ_FEEDBACK =
  "<system-reminder>They asked about a company stage or mail. Call searchApplications and searchMail for that name now. Then speak the stage. Do not only say you are checking. Do not mention this reminder.</system-reminder>";

export function userTurnAsksEntityInspect(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\b(open|show|preview)\s+(the\s+)?(side\s+)?panel\b/i.test(t)) return false;
  if (/\b(open|show|preview)\s+(the\s+)?(letter|brief|briefing)\b/i.test(t)) return false;
  if (userTurnRetriesDailyBrief(t) && !/\b(open|show|preview)\b/i.test(t)) return false;
  if (/^(open|show|preview)\b/i.test(t) && !userTurnAsksDailyBrief(t)) return true;
  return /\b(open|show|preview)\s+(my\s+)?(?!me\b|us\b|the\b)[\w'’-]{2,}/i.test(t);
}

/** "file these / triage / sort the pile" — wants the Confirm card. */
export function userTurnAsksNewJobsTriage(text: string): boolean {
  return /\b(triage|track these|file (these|them)|sort (the )?(pile|inbox|new jobs)|screen (the )?(pile|new jobs))\b/i.test(
    text
  );
}

/** "pile empty or not" — list and speak, do not open Confirm. */
export function userTurnAsksPileStatusOnly(text: string): boolean {
  const t = text.trim();
  if (!t || userTurnAsksNewJobsTriage(t)) return false;
  return /\bpile\b.{0,24}\b(empty|or not)\b|\b(empty|anything|any(?:thing)? new)\b.{0,24}\bpile\b|\bis the pile\b/i.test(
    t
  );
}

export function isOpenEntityInspectToolName(name: string): boolean {
  return name === "open-entity-inspect" || name === "openEntityInspect";
}

export function filterHubInspectActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) =>
    /openEntityInspect|open-entity-inspect|searchEvidence|search-evidence|getExperience|get-experience|getProject|get-project|listExperiences|list-experiences|listProjects|list-projects/i.test(
      name
    )
  );
}

export const HUB_INSPECT_MUST_OPEN_FEEDBACK =
  "<system-reminder>They asked to open/show a record. Search or get it, then call openEntityInspect with the real id. Do not only say you opened it. Do not mention this reminder.</system-reminder>";

export const HUB_TODAY_MUST_OPEN_FEEDBACK =
  "<system-reminder>getDailyBrief already returned facts. Write the Today letter in the current voice from those facts, then call openDailyBrief({ markdown }). One short spoken line after. Do not paste the letter. Do not triage. Do not mention this reminder.</system-reminder>";

export const HUB_SEARCH_BRIEF_MUST_ANSWER_FEEDBACK =
  "getSearchBrief already ran. Do NOT call getSearchBrief, listNewJobs, or proposeNewJobsTriage. Answer the user in 1–2 sentences (e.g. where a section went). The File Diff is already on screen.";

export function isTrackJobToolName(name: string): boolean {
  return name === "track-job" || name === "trackJob";
}

export function isDismissJobToolName(name: string): boolean {
  return name === "dismiss-job" || name === "dismissJob";
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
  "listNewJobs already returned inbox rows. Do NOT call jobPreferenceMatchScorer, getJobPreferences, listExperiences, or any other tool. Call propose-new-jobs-triage NOW with track[] / dismiss[] using the real ids, titles, companyNames, matchScores, and a one-sentence reason each. If you have no dismiss split, put every listed job in track[]. Never call with both arrays empty when listNewJobs returned rows. Emit ZERO user-facing text — no markdown tables, no bullet recap. The triage card is the UI.";

export const HUB_TRIAGE_MUST_WRITE_FEEDBACK =
  "The user already confirmed triage. Do NOT call propose-new-jobs-triage again. Call trackJob once per confirmed trackIds[] and dismissJob once per confirmed dismissIds[]. Emit ZERO user-facing text until those writes finish.";

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

/** After confirm: only the CRM writes. A second propose this turn is forbidden. */
export function filterHubPostTriageConfirmActiveTools(toolNames: readonly string[]): string[] {
  return toolNames.filter((name) => isTrackJobToolName(name) || isDismissJobToolName(name));
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

export function isFindJobsNowToolName(name: string): boolean {
  return name === "find-jobs-now" || name === "findJobsNow";
}

export function isProposeEvidenceChangeToolName(name: string): boolean {
  return name === "propose-evidence-change" || name === "proposeEvidenceChange";
}

export function isProposeHardPreferenceChangeToolName(name: string): boolean {
  return name === "propose-hard-preference-change" || name === "proposeHardPreferenceChange";
}

/**
 * After evidence or hard-stop confirm: keep interview/search/get tools, but
 * drop inbox triage and find-now so auto-resume cannot re-open that path.
 */
export function filterHubPostEvidenceConfirmActiveTools(toolNames: readonly string[]): string[] {
  return toolNames.filter(
    (name) =>
      !isListNewJobsToolName(name) &&
      !isProposeNewJobsTriageToolName(name) &&
      !isFindJobsNowToolName(name)
  );
}
