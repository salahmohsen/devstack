import {
  userTurnAsksDailyBrief,
  userTurnAsksStackCatalog,
  userTurnRetriesStackCatalog
} from "@tsu-stack/core";

export { userTurnAsksDailyBrief, userTurnAsksStackCatalog, userTurnRetriesStackCatalog };

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
  "proposeMailCrmChange",
  "propose-application-field-change",
  "proposeApplicationFieldChange",
  "propose-set-outcome",
  "proposeSetOutcome",
  "propose-delete-application",
  "proposeDeleteApplication",
  "propose-delete-note",
  "proposeDeleteNote",
  "propose-batch-tracking-change",
  "proposeBatchTrackingChange",
  "propose-batch-generate-packages",
  "proposeBatchGeneratePackages",
  "propose-refresh-from-url",
  "proposeRefreshFromUrl"
]);

export function isHubClientHitlToolName(name: string): boolean {
  return HUB_CLIENT_HITL_TOOL_NAMES.has(name);
}

export function isOpenEntityInspectToolName(name: string): boolean {
  return name === "open-entity-inspect" || name === "openEntityInspect";
}

export function filterHubTodayGatherActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => isGetDailyBriefToolName(name));
}

export function filterHubTodayOpenActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => isOpenDailyBriefToolName(name));
}

/**
 * Concurrent forced reads (Today + stacks + brief + company + inspect +
 * application mention) must share one activeTools allowlist. Exclusive
 * filters overwrite each other in processInputStep order and surface
 * "Tool X not found. Available tools: Y".
 */
export type HubForcedReadFlags = {
  today: boolean;
  stacks: boolean;
  searchBrief: boolean;
  company: boolean;
  /** Yes/no pile status — listNewJobs only, never triage Confirm. */
  pile: boolean;
  /** Need openEntityInspect eventually (lookup and/or open phase). */
  inspect: boolean;
  /**
   * Successful list/search/get already ran this turn — force openEntityInspect
   * alone. Without this bit, server lookup tools stay in the allowlist forever
   * and the client open tool is deferred every step.
   */
  inspectLookupDone: boolean;
  /** Job listing open (Match %, listing, role/job wording) — CRM lookup only. */
  inspectJobListing: boolean;
  application: boolean;
};

export function anyHubForcedRead(flags: HubForcedReadFlags): boolean {
  return (
    flags.today ||
    flags.stacks ||
    flags.searchBrief ||
    flags.company ||
    flags.pile ||
    flags.inspect ||
    flags.application
  );
}

const HUB_INSPECT_LOOKUP_TOOL_RE =
  /searchEvidence|search-evidence|getExperience|get-experience|getProject|get-project|listExperiences|list-experiences|listProjects|list-projects|searchApplications|search-applications|getApplication|get-application|listNewJobs|list-new-jobs|listOpenApplications|list-open-applications/i;

const HUB_INSPECT_JOB_LOOKUP_TOOL_RE =
  /searchApplications|search-applications|getApplication|get-application|listNewJobs|list-new-jobs|listOpenApplications|list-open-applications/i;

export function isHubInspectLookupToolName(name: string): boolean {
  return HUB_INSPECT_LOOKUP_TOOL_RE.test(name);
}

export function filterHubUnionForcedReadActiveTools(
  toolNames: string[],
  flags: HubForcedReadFlags
): string[] {
  if (!anyHubForcedRead(flags)) return [];

  // Inspect open phase alone: client tool only (lookup already returned an id).
  if (
    flags.inspect &&
    flags.inspectLookupDone &&
    !flags.today &&
    !flags.stacks &&
    !flags.pile &&
    !flags.company &&
    !flags.application &&
    !flags.searchBrief
  ) {
    return toolNames.filter((name) => isOpenEntityInspectToolName(name));
  }

  const allowed = toolNames.filter((name) => {
    if (flags.today && isGetDailyBriefToolName(name)) return true;
    if (flags.stacks && isListStacksToolName(name)) return true;
    if (flags.searchBrief && isGetSearchBriefToolName(name)) return true;
    if (flags.application && isGetApplicationToolName(name)) return true;
    if (flags.pile && isListNewJobsToolName(name)) return true;
    if (
      flags.company &&
      /searchApplications|search-applications|getApplication|get-application|searchMail|search-mail|getMail|get-mail|listNewJobs|list-new-jobs|classifyMail|classify-mail|explainApplicationVsPrefs|explain-application-vs-prefs/i.test(
        name
      )
    ) {
      return true;
    }
    if (flags.inspect) {
      if (flags.inspectLookupDone) {
        // Packed with other server forced reads — keep open deferred until those finish.
        return false;
      }
      if (isOpenEntityInspectToolName(name)) return true;
      if (flags.inspectJobListing) return HUB_INSPECT_JOB_LOOKUP_TOOL_RE.test(name);
      return HUB_INSPECT_LOOKUP_TOOL_RE.test(name);
    }
    return false;
  });
  /**
   * Client HITL tools (getSearchBrief, openEntityInspect, …) have no server
   * execute. Mastra suspends the whole step when any co-emitted tool lacks
   * execute — packed getDailyBrief+listStacks+getSearchBrief ends with every
   * part stuck at input-available. Drop client HITL from the allowlist whenever
   * a server tool is also allowed; the next step forces the client tool alone.
   */
  const hasServer = allowed.some((name) => !isHubClientHitlToolName(name));
  if (!hasServer) return allowed;
  return allowed.filter((name) => !isHubClientHitlToolName(name));
}

/** Everyday “what am I looking for / job rules / show the brief”. */
export function userTurnAsksSearchBrief(text: string): boolean {
  const t = text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  // "what am I looking for" / "what I'm even looking for" / "what am i looking for again"
  if (/\bwhat (am i|i'?m)(?: \w+){0,2} looking for\b/.test(t)) return true;
  if (/\blooking for (in )?jobs?\b/.test(t)) return true;
  if (/\blooking for job-wise\b/.test(t)) return true;
  if (/\bwhat are my job (rules|goals|preferences|prefs)\b/.test(t)) return true;
  if (/\bwhat('?s| is) my (job )?(search )?brief\b/.test(t)) return true;
  if (/\bshow (me )?(my )?(the )?(search |job )?brief\b/.test(t)) return true;
  if (/\bmy job rules\b/.test(t)) return true;
  if (/\bwhat do i want\b/.test(t) && /\b(job|work|role)/.test(t)) return true;
  return false;
}

export const HUB_SEARCH_BRIEF_MUST_LOAD_FEEDBACK =
  "<system-reminder>They asked what they want / job rules / the search brief. Call getSearchBrief now. The File Diff is the UI. Do not invent rules from memory. Do not mention this reminder.</system-reminder>";

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

export function isGetApplicationToolName(name: string): boolean {
  return name === "get-application" || name === "getApplication";
}

export const HUB_APPLICATION_MUST_LOAD_FEEDBACK =
  "<system-reminder>They referenced an application {id}. Call getApplication now. Do not invent the JD or kit from memory. Do not mention this reminder.</system-reminder>";

export function isListStacksToolName(name: string): boolean {
  return name === "list-stacks" || name === "listStacks";
}

export function filterHubStackCatalogActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => isListStacksToolName(name));
}

/** Prefer union filter for packed multi-asks; keep single-tool helper for tests. */
export function filterHubSearchBriefGatherActiveTools(toolNames: string[]): string[] {
  return toolNames.filter((name) => isGetSearchBriefToolName(name));
}

export const HUB_STACKS_MUST_LIST_FEEDBACK =
  "<system-reminder>They asked for their stacks or skills. Call listStacks now. Then speak the filtered catalog. Do not only say you are pulling the list. Do not mention this reminder.</system-reminder>";

export function isOpenDailyBriefToolName(name: string): boolean {
  return name === "open-daily-brief" || name === "openDailyBrief";
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
  "<system-reminder>They asked what you have for them today. Call getDailyBrief now. Do not write the letter yourself. Do not triage. Do not findJobsNow. Do not mention this reminder.</system-reminder>";

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

/** "what's the deal with DualEntry" / "what's going on with Trivelta" — company without mail/stage words. */
const COMPANY_DEAL_RE =
  /\b(what'?s|whats)\s+(the\s+)?(deal|story|latest)\s+(with|on)\b|\b(what'?s|whats)\s+going\s+on\s+with\b|\bhow\s+('?s|is)\s+[\w'’-]{2,}.{0,24}\b(looking|going|doing)\b/i;

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
  const dealAsk = COMPANY_DEAL_RE.test(t);
  if (
    userTurnRetriesDailyBrief(t) &&
    !userTurnAsksDailyBrief(t) &&
    !COMPANY_STATUS_SIGNAL_RE.test(t) &&
    !dealAsk
  ) {
    return false;
  }
  if (!COMPANY_STATUS_SIGNAL_RE.test(t) && !dealAsk) return false;
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

/**
 * Open/show a New or Tracked job (not an evidence record). Prefer CRM search
 * over searchEvidence — triage paste often looks like title + company · Match N%.
 */
export function userTurnAsksJobListingInspect(text: string): boolean {
  if (!userTurnAsksEntityInspect(text)) return false;
  const t = text.trim();
  if (/\bmatch\s*\d{1,3}\s*%/i.test(t)) return true;
  if (/[·•]\s*match\b/i.test(t)) return true;
  if (/\blisting\b/i.test(t)) return true;
  if (/\b(open|show|preview)\b[\s\S]{0,100}\b(job|role|position|opening)\b/i.test(t)) return true;
  if (/\b(job|role|position|opening)\b[\s\S]{0,60}\b(open|show|preview)\b/i.test(t)) return true;
  return false;
}

/** "file these / triage / sort / filter the pile" — wants the Confirm card. */
export function userTurnAsksNewJobsTriage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    userTurnAsksGenerateApplyPackages(t) &&
    !/\b(filter|sort|screen|triage|track(?:ing|ed)?)\b/i.test(t)
  ) {
    // "generate package for each of them" is tracked-CRM, not a New jobs triage.
    return false;
  }
  if (
    /\b(triage|track these|file (these|them)|sort (the )?(pile|inbox|new jobs)|screen (the )?(pile|new jobs)|filter (my |the )?(pile|inbox|new jobs)|filter new jobs)\b/i.test(
      t
    )
  ) {
    return true;
  }
  // "filter/track my new jobs and … package for the one that suits me"
  if (
    /\b(new jobs|the pile|inbox)\b/i.test(t) &&
    /\b(filter|sort|screen|triage|track(?:ing|ed)?)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * "generate package for each/them/tracked" — apply kits for already-tracked jobs.
 * Must not reopen New jobs triage.
 */
export function userTurnAsksGenerateApplyPackages(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /\b(package|packages|apply kit|apply-kit)s?\b/i.test(t) &&
    /\b(each|all|them|these|those|tracked|every|pipeline)\b/i.test(t)
  ) {
    return true;
  }
  if (
    /\b(generate|make|start|prep|prepare).{0,48}(package|packages|apply kit|apply-kit)s?\b/i.test(
      t
    ) &&
    !/\b(new jobs|the pile|inbox)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

export const HUB_APPLY_PACKAGES_MUST_LIST_FEEDBACK =
  "<system-reminder>They asked to generate apply packages for tracked/already-triaged jobs. Call listOpenApplications({ limit: 20 }) now. Do not call listNewJobs or proposeNewJobsTriage. Do not mention this reminder.</system-reminder>";

export const HUB_APPLY_PACKAGES_MUST_PROPOSE_FEEDBACK =
  "<system-reminder>Tracked applications are listed. Call proposeBatchGeneratePackages once with all ids (and labels title/companyName). Do not call generateApplyPackage one-by-one. Do not reopen New jobs triage. Do not mention this reminder.</system-reminder>";

/** @deprecated Prefer HUB_APPLY_PACKAGES_MUST_PROPOSE_FEEDBACK (batch Confirm). */
export const HUB_APPLY_PACKAGES_MUST_GENERATE_FEEDBACK = HUB_APPLY_PACKAGES_MUST_PROPOSE_FEEDBACK;

export function isListOpenApplicationsToolName(name: string): boolean {
  return name === "list-open-applications" || name === "listOpenApplications";
}

export function isGenerateApplyPackageToolName(name: string): boolean {
  return name === "generate-apply-package" || name === "generateApplyPackage";
}

export function isProposeBatchGeneratePackagesToolName(name: string): boolean {
  return name === "propose-batch-generate-packages" || name === "proposeBatchGeneratePackages";
}

export function filterHubApplyPackageActiveTools(
  toolNames: string[],
  phase: "list" | "propose"
): string[] {
  return toolNames.filter((name) => {
    if (phase === "list") {
      return (
        isListOpenApplicationsToolName(name) ||
        /getApplication|get-application|searchApplications|search-applications/i.test(name)
      );
    }
    return isProposeBatchGeneratePackagesToolName(name);
  });
}

/** "pile empty or not" — list and speak, do not open Confirm. */
export function userTurnAsksPileStatusOnly(text: string): boolean {
  const t = text.trim();
  if (!t || userTurnAsksNewJobsTriage(t)) return false;
  return /\bpile\b.{0,40}\b(empty|or not|mess|messy|full|still)\b|\b(empty|anything|any(?:thing)? new|still a mess)\b.{0,40}\bpile\b|\bis the pile\b/i.test(
    t
  );
}

export const HUB_PILE_MUST_LIST_FEEDBACK =
  "<system-reminder>They asked whether the pile is empty/messy. Call listNewJobs now and speak the count. Do not open triage Confirm. Do not mention this reminder.</system-reminder>";

export const HUB_NEW_JOBS_MUST_LIST_FEEDBACK =
  "<system-reminder>They asked to filter/sort/file new jobs or start an apply package from the pile. Call listNewJobs now. Do not only say you are pulling them. Do not mention this reminder.</system-reminder>";

export function filterHubInspectActiveTools(
  toolNames: string[],
  opts?: { lookupDone?: boolean; jobListing?: boolean }
): string[] {
  if (opts?.lookupDone) {
    return toolNames.filter((name) => isOpenEntityInspectToolName(name));
  }
  const lookupRe = opts?.jobListing ? HUB_INSPECT_JOB_LOOKUP_TOOL_RE : HUB_INSPECT_LOOKUP_TOOL_RE;
  return toolNames.filter((name) => isOpenEntityInspectToolName(name) || lookupRe.test(name));
}

export const HUB_INSPECT_MUST_OPEN_FEEDBACK =
  '<system-reminder>They asked to open/show a record. For a job listing (company/title from New or Tracked), searchApplications or listNewJobs/listOpenApplications then openEntityInspect({ kind: "application", id }). For projects/experience/skills, searchEvidence or get then openEntityInspect with that kind. Stay on this page — do not openSurface for preview. Do not only say you opened it. Do not mention this reminder.</system-reminder>';

export const HUB_INSPECT_JOB_MUST_LOOKUP_FEEDBACK =
  "<system-reminder>They asked to open a job listing. Call searchApplications (or listNewJobs / listOpenApplications) for that company/title now. Do not searchEvidence. Do not say tools are missing. Do not mention this reminder.</system-reminder>";

export const HUB_INSPECT_MUST_CALL_OPEN_FEEDBACK =
  '<system-reminder>Lookup already returned an id. Call openEntityInspect({ kind, id }) now — kind="application" for a job. Stay on this page — do not openSurface. Do not say the panel is stuck. Do not mention this reminder.</system-reminder>';

export function hubInspectForceFeedback(opts: {
  lookupDone: boolean;
  jobListing: boolean;
}): string {
  if (opts.lookupDone) return HUB_INSPECT_MUST_CALL_OPEN_FEEDBACK;
  if (opts.jobListing) return HUB_INSPECT_JOB_MUST_LOOKUP_FEEDBACK;
  return HUB_INSPECT_MUST_OPEN_FEEDBACK;
}

export const HUB_TODAY_MUST_OPEN_FEEDBACK =
  "<system-reminder>getDailyBrief already returned markdown. Call openDailyBrief({ markdown }) with that markdown. Do not rewrite it. One short spoken line after. Do not paste the letter. Do not triage. Do not mention this reminder.</system-reminder>";

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

export function isProposeApplicationFieldChangeToolName(name: string): boolean {
  return name === "propose-application-field-change" || name === "proposeApplicationFieldChange";
}

export function isProposeSetOutcomeToolName(name: string): boolean {
  return name === "propose-set-outcome" || name === "proposeSetOutcome";
}

export function isProposeDeleteApplicationToolName(name: string): boolean {
  return name === "propose-delete-application" || name === "proposeDeleteApplication";
}

export function isProposeDeleteNoteToolName(name: string): boolean {
  return name === "propose-delete-note" || name === "proposeDeleteNote";
}

export function isProposeBatchTrackingChangeToolName(name: string): boolean {
  return name === "propose-batch-tracking-change" || name === "proposeBatchTrackingChange";
}

export function isProposeRefreshFromUrlToolName(name: string): boolean {
  return name === "propose-refresh-from-url" || name === "proposeRefreshFromUrl";
}

/** Evidence, hard-stop, and CRM Confirm cards — no same-turn listNewJobs/triage. */
export function isHubPostEvidenceLikeConfirmToolName(name: string): boolean {
  return (
    isProposeEvidenceChangeToolName(name) ||
    isProposeHardPreferenceChangeToolName(name) ||
    isProposeApplicationFieldChangeToolName(name) ||
    isProposeSetOutcomeToolName(name) ||
    isProposeDeleteApplicationToolName(name) ||
    isProposeDeleteNoteToolName(name) ||
    isProposeBatchTrackingChangeToolName(name) ||
    isProposeBatchGeneratePackagesToolName(name) ||
    isProposeRefreshFromUrlToolName(name)
  );
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
