import { z } from "zod";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  type ApplicationApplyMethod,
  type ApplicationSource
} from "#@/application/types";
import {
  extractJobListingFromHtml,
  extractJobListingStructured,
  pickBetterListingDescription,
  stripListingChromeFromHtml,
  stripListingChromeFromText,
  type ListingPageExtract
} from "#@/common/extract-job-listing-page";
import { DEFAULT_MIN_MATCH_SCORE } from "#@/job-preference/constants";
import {
  SeekerMatchEvidenceSchema,
  WorkModeSchema,
  type JobPreference,
  type SeekerMatchEvidence,
  type WorkMode
} from "#@/job-preference/types";
import {
  defaultJobPreference,
  formatSeekerEvidenceForPrompt,
  isOpenJobPreference,
  seekerEvidenceHasSignal
} from "#@/job-preference/utils";

/**
 * LLMs often emit display labels (`Unknown`, `Easy Apply`) or aliases (`company`
 * instead of `companyName`). Coerce before strict enum/object parse so Mastra
 * structuredOutput does not fail the whole agent turn.
 */
export function normalizeHarvestApplyMethod(value: unknown): ApplicationApplyMethod {
  if (typeof value !== "string") return "unknown";
  const n = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (n === "easy_apply" || n === "easyapply") return "easy_apply";
  if (n === "external" || n === "company_website" || n === "ats") {
    return "external";
  }
  if (n === "email" || n === "mailto") return "email";
  if (n === "unknown" || n === "" || n === "n_a" || n === "na" || n === "null") {
    return "unknown";
  }
  return "unknown";
}

export function normalizeHarvestWorkMode(value: unknown): WorkMode | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const n = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (n === "remote" || n === "hybrid" || n === "onsite") return n;
  if (n === "on_site" || n === "in_office" || n === "office") return "onsite";
  if (n === "unknown" || n === "" || n === "n_a" || n === "na") return null;
  return null;
}

/** Map common LLM field aliases / casing onto HarvestedJob shape. */
export function coerceHarvestedJobInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };

  if (
    (o.companyName == null || o.companyName === "") &&
    typeof o.company === "string" &&
    o.company.trim()
  ) {
    o.companyName = o.company.trim();
  }
  delete o.company;
  // Models sometimes invent diagnostic keys (pageAccess, notes, …).
  delete o.pageAccess;
  delete o.notes;
  delete o.reason;

  if ("applyMethod" in o) {
    o.applyMethod = normalizeHarvestApplyMethod(o.applyMethod);
  }
  if ("workMode" in o) {
    o.workMode = normalizeHarvestWorkMode(o.workMode);
  }
  if (typeof o.applyUrl === "string" && o.applyUrl.trim() === "") {
    o.applyUrl = null;
  }

  // Never invent enum values: free-text brands (e.g. "Jack & Jill AI") → sourceLabel.
  if ("source" in o) {
    const normalized = normalizeHarvestSource(o.source);
    if (normalized === null && typeof o.source === "string" && o.source.trim()) {
      if (o.sourceLabel == null || o.sourceLabel === "") {
        o.sourceLabel = o.source.trim().slice(0, 80);
      }
    }
    o.source = normalized;
  }
  if (typeof o.sourceLabel === "string") {
    const t = o.sourceLabel.trim().slice(0, 80);
    o.sourceLabel = t.length > 0 ? t : null;
  }

  return o;
}

/** Closed platform enum only — invalid strings become null (and may fill sourceLabel). */
export function normalizeHarvestSource(value: unknown): ApplicationSource | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const n = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const parsed = ApplicationSourceSchema.safeParse(n);
  return parsed.success ? parsed.data : null;
}

const HarvestedJobObjectSchema = z.object({
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(300),
  location: z.string().max(300).nullable().optional(),
  salaryRange: z.string().max(200).nullable().optional(),
  description: z.string().max(20_000).nullable().optional(),
  listingUrl: z.string().url(),
  applyUrl: z.string().url().nullable().optional().default(null),
  applyMethod: ApplicationApplyMethodSchema.default("unknown"),
  workMode: WorkModeSchema.nullable().optional(),
  /** Prefer omit — server re-infers from URL. Free-text brands must not go here. */
  source: ApplicationSourceSchema.nullable().optional(),
  /** Short brand when platform is unknown/other (e.g. "Jack & Jill"). */
  sourceLabel: z.string().max(80).nullable().optional()
});

/** Structured job extracted from a mail card and/or job page. */
export const HarvestedJobSchema = z.preprocess(coerceHarvestedJobInput, HarvestedJobObjectSchema);
export type HarvestedJob = z.infer<typeof HarvestedJobObjectSchema>;

const MailNotifierJobObjectSchema = z.object({
  listingUrl: z.string().url(),
  title: z.string().max(300).optional().nullable(),
  companyName: z.string().max(300).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  applyMethod: ApplicationApplyMethodSchema.optional().nullable(),
  workMode: WorkModeSchema.optional().nullable()
});

/**
 * AI output from reading a job-notifier email (before page fetch).
 * listingUrl required; other fields optional until page enrich.
 */
export const MailNotifierExtractSchema = z.object({
  isJobNotifier: z.boolean(),
  reason: z.string().max(500).optional(),
  jobs: z
    .array(z.preprocess(coerceHarvestedJobInput, MailNotifierJobObjectSchema))
    .max(25)
    .default([])
});
export type MailNotifierExtract = z.infer<typeof MailNotifierExtractSchema>;

/** Preference slice passed into the harvest workflow for AI match scoring. */
export const HarvestJobPreferenceSchema = z.object({
  workModes: z.array(WorkModeSchema).default([]),
  locations: z.array(z.string()).default([]),
  roleKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  salaryMin: z.number().nullable().optional(),
  salaryCurrency: z.string().nullable().optional(),
  minMatchScore: z.number().int().min(0).max(100).default(60),
  /** Career-profile signal (experiences / stacks / projects) for fit scoring. */
  evidence: SeekerMatchEvidenceSchema.optional()
});
export type HarvestJobPreference = z.infer<typeof HarvestJobPreferenceSchema>;

/** Workflow I/O for Mastra mail-job-harvest-workflow */
export const MailJobHarvestWorkflowInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  fromEmail: z.string().default(""),
  fromName: z.string().default(""),
  subject: z.string().default(""),
  bodyText: z.string().default(""),
  bodyHtml: z.string().nullable().optional(),
  /** Seeker job preferences — AI scores each harvested job against these. */
  preference: HarvestJobPreferenceSchema.optional(),
  /** BYO runtime LLM (same shape as mail classify). */
  llm: z
    .object({
      modelId: z.string(),
      providerKind: z.string(),
      apiKey: z.string().optional()
    })
    .optional()
});
export type MailJobHarvestWorkflowInput = z.infer<typeof MailJobHarvestWorkflowInputSchema>;

export const JobMatchScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  reasons: z.array(z.string())
});
export type JobMatchScoreResult = z.infer<typeof JobMatchScoreResultSchema>;

/** Harvested job + AI preference match (workflow output). */
export const ScoredHarvestedJobSchema = HarvestedJobObjectSchema.extend({
  matchScore: z.number().int().min(0).max(100),
  matchPassed: z.boolean(),
  matchReasons: z.array(z.string()).default([]),
  /** 1–3 sentence narrative fit; null/omit when take step soft-failed. */
  agentTake: z.string().max(1200).nullable().optional()
});
export type ScoredHarvestedJob = z.infer<typeof ScoredHarvestedJobSchema>;

/** Batch AI scorer response (one entry per listingUrl). */
export const AiJobMatchBatchSchema = z.object({
  matches: z
    .array(
      z.object({
        listingUrl: z.string(),
        score: z.number().int().min(0).max(100),
        passed: z.boolean(),
        reasons: z.array(z.string()).max(8).default([])
      })
    )
    .default([])
});
export type AiJobMatchBatch = z.infer<typeof AiJobMatchBatchSchema>;

/** Batch agent-take response for match-passed harvest jobs. */
export const AiJobAgentTakeBatchSchema = z.object({
  takes: z
    .array(
      z.object({
        listingUrl: z.string(),
        agentTake: z.string().min(1).max(1200)
      })
    )
    .default([])
});
export type AiJobAgentTakeBatch = z.infer<typeof AiJobAgentTakeBatchSchema>;

export const MailJobHarvestWorkflowOutputSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  isJobNotifier: z.boolean(),
  jobs: z.array(ScoredHarvestedJobSchema),
  notes: z.string().optional()
});
export type MailJobHarvestWorkflowOutput = z.infer<typeof MailJobHarvestWorkflowOutputSchema>;

/**
 * Intermediate after match scoring — carries preference/llm for the take step.
 * Not the public workflow output.
 */
export const MailJobHarvestAfterScoreSchema = MailJobHarvestWorkflowOutputSchema.extend({
  preference: HarvestJobPreferenceSchema.optional(),
  llm: z.unknown().optional()
});
export type MailJobHarvestAfterScore = z.infer<typeof MailJobHarvestAfterScoreSchema>;

export const MailJobHarvestResultSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  candidatesFound: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  skippedLowMatch: z.number().int().nonnegative(),
  skippedDuplicate: z.number().int().nonnegative(),
  skippedFailed: z.number().int().nonnegative(),
  applicationIds: z.array(z.string())
});
export type MailJobHarvestResult = z.infer<typeof MailJobHarvestResultSchema>;

const TRACKING_QUERY_KEYS = new Set([
  "trackingid",
  "refid",
  "lipi",
  "midtoken",
  "midsig",
  "trk",
  "trkemail",
  "eid",
  "otptoken",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "mc_cid",
  "mc_eid"
]);

/**
 * Dedup hygiene only: strip common tracking query params.
 * Does **not** rewrite hosts/paths for LinkedIn/Indeed — multi-source AI supplies the URL.
 */
export function canonicalizeJobUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    for (const key of Array.from(u.searchParams.keys())) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    u.hash = "";
    let href = u.toString();
    if (href.endsWith("/") && u.pathname !== "/") href = href.slice(0, -1);
    return href;
  } catch {
    return null;
  }
}

export function inferApplicationSource(url: string, fromEmail?: string): ApplicationSource {
  const hay = `${url} ${fromEmail ?? ""}`.toLowerCase();
  if (hay.includes("linkedin.")) return "linkedin";
  if (hay.includes("indeed.")) return "indeed";
  if (hay.includes("greenhouse") || hay.includes("lever.co") || hay.includes("ashbyhq")) {
    return "company_website";
  }
  return "other";
}

/**
 * Known hosts → display label when platform is `other`.
 * Code first; model only fills when this returns null.
 */
const SOURCE_LABEL_BY_HOST_FRAGMENT: ReadonlyArray<{ match: string; label: string }> = [
  { match: "jackandjill", label: "Jack & Jill" },
  { match: "wellfound.", label: "Wellfound" },
  { match: "angel.co", label: "Wellfound" },
  { match: "otta.com", label: "Otta" },
  { match: "hired.com", label: "Hired" },
  { match: "dice.com", label: "Dice" },
  { match: "glassdoor.", label: "Glassdoor" },
  { match: "ziprecruiter.", label: "ZipRecruiter" },
  { match: "monster.", label: "Monster" },
  { match: "workable.com", label: "Workable" },
  { match: "smartrecruiters.", label: "SmartRecruiters" },
  { match: "jobvite.", label: "Jobvite" },
  { match: "bamboohr.", label: "BambooHR" },
  { match: "myworkdayjobs.", label: "Workday" },
  { match: "workday.", label: "Workday" }
];

/** Resolve display label for unknown platforms from listing URL host. */
export function inferSourceLabelFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    for (const { match, label } of SOURCE_LABEL_BY_HOST_FRAGMENT) {
      if (host.includes(match)) return label;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Final platform + optional free-text label for harvest/hub create.
 * Server owns enum; label only when platform is `other`.
 */
export function resolveApplicationSourceFields(input: {
  listingUrl: string;
  fromEmail?: string | null;
  /** Optional model hint — never trusted as enum. */
  modelSource?: ApplicationSource | null;
  modelSourceLabel?: string | null;
}): { source: ApplicationSource; sourceLabel: string | null } {
  const source = inferApplicationSource(input.listingUrl, input.fromEmail ?? undefined);
  // Known platforms never store free-text brand labels.
  if (source !== "other") {
    return { source, sourceLabel: null };
  }
  const fromHost = inferSourceLabelFromUrl(input.listingUrl);
  if (fromHost) return { source, sourceLabel: fromHost };
  const fromModel = input.modelSourceLabel?.trim().slice(0, 80);
  if (fromModel) return { source, sourceLabel: fromModel };
  // Model sometimes put the brand in `source` before coerce moved it to sourceLabel.
  return { source, sourceLabel: null };
}

/** Collect http(s) URLs from text + HTML hrefs. */
export function extractRawUrls(bodyText: string, bodyHtml: string | null | undefined): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const cleaned = raw
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[),.;]+$/g, "");
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      found.push(cleaned);
    }
  };

  const text = bodyText ?? "";
  for (const m of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    push(m[0]);
  }
  const html = bodyHtml ?? "";
  for (const m of html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    if (m[1]) push(m[1]);
  }
  return found;
}

function isLikelyJobListingUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("unsubscribe") || u.includes("emailunsub") || u.includes("preferences")) {
    return false;
  }
  if (u.includes("help/linkedin") || u.includes("premium/products")) return false;
  if (u.includes("notifications.googleapis.com/email/t/")) return false; // pixel
  if (u.includes("jackandjill.") && !/\/jobs\//i.test(u)) return false; // dashboard/support links
  // Job-like paths
  if (/\/jobs\/view\/\d+/i.test(u)) return true;
  if (/\/jobs\/[a-f0-9-]{10,}/i.test(u)) return true; // Jack and Jill, some ATS
  if (
    u.includes("indeed.") &&
    (u.includes("jk=") || u.includes("/viewjob") || u.includes("/rc/clk"))
  ) {
    return true;
  }
  if (u.includes("linkedin.com") && u.includes("/jobs/")) return true;
  if (u.includes("notifications.googleapis.com/email/redirect")) return true;
  if (
    u.includes("greenhouse.io") ||
    u.includes("lever.co") ||
    u.includes("ashbyhq.com") ||
    u.includes("myworkdayjobs.com") ||
    u.includes("/careers/") ||
    u.includes("/jobs/")
  ) {
    return true;
  }
  return false;
}

/**
 * Prefer job-view URLs over search-results from LinkedIn digests.
 */
export function rankJobUrl(url: string): number {
  const u = url.toLowerCase();
  if (/\/jobs\/view\/\d+/i.test(u)) return 100;
  // Jack and Jill / ATS job post pages: /jobs/{uuid}/post
  if (
    (u.includes("jackandjill.") || u.includes("app.jackandjill.")) &&
    /\/jobs\/[a-f0-9-]{10,}/i.test(u)
  ) {
    return 95;
  }
  if (/\/jobs\/[a-f0-9-]{10,}(?:\/|$|\?)/i.test(u)) return 90;
  if (u.includes("viewjob") || u.includes("jk=")) return 90;
  if (u.includes("email/redirect")) return 70;
  if (u.includes("/jobs/search")) return 20;
  if (u.includes("/careers/") || u.includes("greenhouse") || u.includes("lever")) return 80;
  // Generic /jobs/ paths (not search)
  if (u.includes("/jobs/") && !u.includes("search")) return 75;
  return 50;
}

export type ExtractJobLinksInput = {
  bodyText: string;
  bodyHtml?: string | null;
  subject?: string;
  fromEmail?: string;
};

/**
 * Extract candidate job listing URLs from a job-notifier email.
 * Does not fetch pages — uses mail body only (reliable for LinkedIn digests).
 */
export function extractJobListingUrls(input: ExtractJobLinksInput): string[] {
  const raw = extractRawUrls(input.bodyText, input.bodyHtml);
  const canonical: string[] = [];
  const seen = new Set<string>();

  for (const r of raw) {
    if (!isLikelyJobListingUrl(r)) continue;
    // Keep original URL for fetch; canonicalize for dedup key
    const key = canonicalizeJobUrl(r) ?? r;
    if (seen.has(key)) continue;
    seen.add(key);
    canonical.push(r);
  }

  // Prefer high-rank unique by canonical id
  const byCanon = new Map<string, string>();
  for (const url of canonical.toSorted((a, b) => rankJobUrl(b) - rankJobUrl(a))) {
    const key = canonicalizeJobUrl(url) ?? url;
    if (!byCanon.has(key)) byCanon.set(key, url);
  }

  // Drop pure search-results if we have job views
  const values = [...byCanon.values()];
  const views = values.filter((u) => rankJobUrl(u) >= 80);
  return (views.length > 0 ? views : values).slice(0, 25);
}

const SKIP_CONTEXT_LINES = new Set([
  "apply with resume & profile",
  "apply with resume and profile",
  "apply now",
  "view job",
  "this company is actively hiring",
  "expand your search",
  "recommendations based on your activity",
  "your other saved jobs",
  "remote jobs",
  "see all jobs"
]);

function isNoiseContextLine(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t || t.startsWith("http")) return true;
  if (t.startsWith("view job")) return true;
  if (t.startsWith("---")) return true;
  if (SKIP_CONTEXT_LINES.has(t)) return true;
  if (t.includes("unsubscribe") || t.includes("manage alert")) return true;
  if (/^your job alert/i.test(t)) return true;
  return false;
}

/** Reject marketing subjects used as fake titles. */
export function isGarbageJobTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 3 || t.length > 160) return true;
  if (/^unknown role$/i.test(t)) return true;
  if (/is hiring for a/i.test(t)) return true;
  if (/^salah[,:]/i.test(t)) return true;
  if (/apply now to/i.test(t)) return true;
  if (/^\d+\s+new jobs?\s+for/i.test(t)) return true;
  if (/^new jobs similar to/i.test(t)) return true;
  if (/^jobs similar to/i.test(t)) return true;
  if (/^job alert/i.test(t)) return true;
  if (/^your saved job/i.test(t)) return true;
  return false;
}

export function isGarbageCompany(company: string): boolean {
  const c = company.trim();
  if (c.length < 2 || c.length > 120) return true;
  if (/^unknown company$/i.test(c)) return true;
  if (/^apply /i.test(c)) return true;
  if (/^view job/i.test(c)) return true;
  if (/^https?:/i.test(c)) return true;
  // Location strings mis-parsed as company
  if (looksLikeLocationOnly(c)) return true;
  return false;
}

function looksLikeLocationOnly(s: string): boolean {
  const t = s.trim();
  if (/^(remote|hybrid|on-?site)$/i.test(t)) return true;
  if (/^(egypt|cairo|alexandria|giza|london|dubai|uae|ksa|usa|uk)$/i.test(t)) return true;
  if (/^(cairo|new cairo|giza).*(egypt)?$/i.test(t) && t.split(/[\s,]+/).length <= 5) {
    // "Cairo, Egypt" / "New Cairo, Cairo, Egypt"
    if (!/\b(inc|ltd|llc|corp|labs|studio|technologies|systems)\b/i.test(t)) return true;
  }
  return false;
}

function looksLikeRoleTitle(s: string): boolean {
  return /\b(engineer|developer|designer|manager|analyst|architect|lead|intern|scientist|consultant|specialist|officer)\b/i.test(
    s
  );
}

/**
 * Minimal structural gate after AI harvest (schema shape only).
 * Role quality, URL choice, and fit scoring are the agents' responsibility.
 */
export function isValidHarvestedJob(job: HarvestedJob): boolean {
  const title = job.title?.trim() ?? "";
  const company = job.companyName?.trim() ?? "";
  if (title.length < 2 || company.length === 0) return false;
  if (!job.listingUrl?.startsWith("http")) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(job.listingUrl);
  } catch {
    return false;
  }
  return true;
}

/**
 * @deprecated Prefer AI extract/enrich fields. No regex refinement on the hot path.
 * Kept for tests only — trims title/company.
 */
export function refineHarvestedJob(job: HarvestedJob): HarvestedJob {
  return {
    ...job,
    title: job.title.trim().slice(0, 300),
    companyName: job.companyName.trim().slice(0, 300)
  };
}

/**
 * Flatten HTML for LLM prompts while keeping anchor URLs (Jack and Jill digests
 * only put listing links in hrefs — body text alone has none).
 */
export function htmlToTextPreservingLinks(html: string, maxLen = 8_000): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(
      /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_full, href: string, inner: string) => {
        const label = inner
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const url = href.replace(/&amp;/g, "&");
        return label ? `${label} (${url})` : url;
      }
    )
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Parse Jack-and-Jill-style HTML digests:
 *   <a href="https://app.jackandjill.ai/jobs/...">Design Engineer at Paires</a>: Fully remote...
 */
export function harvestJobsFromHtmlAnchors(input: ExtractJobLinksInput): HarvestedJob[] {
  const html = input.bodyHtml ?? "";
  if (!html.includes("<a") && !html.includes("<A")) return [];

  const jobs: HarvestedJob[] = [];
  const seenCanon = new Set<string>();
  const fromEmail = input.fromEmail ?? "";

  const re =
    /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>(?:\s*:\s*([^<\n]{0,400}))?/gi;

  for (const m of html.matchAll(re)) {
    const listingUrl = (m[1] ?? "").replace(/&amp;/g, "&").replace(/[),.;]+$/g, "");
    if (!isLikelyJobListingUrl(listingUrl)) continue;

    const canon = canonicalizeJobUrl(listingUrl) ?? listingUrl;
    if (seenCanon.has(canon)) continue;

    const linkText = (m[2] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const blurb = (m[3] ?? "").replace(/\s+/g, " ").trim();

    // Skip bare company pipeline chips without a role title ("HumanI", "Emergent Labs").
    const at = linkText.match(/^(.+?)\s+at\s+(.+)$/i);
    if (!at && !looksLikeRoleTitle(linkText) && blurb.length < 24) continue;

    let title = "";
    let companyName = "";
    if (at) {
      title = at[1]!.trim();
      companyName = at[2]!.trim();
    } else if (looksLikeRoleTitle(linkText)) {
      title = linkText;
      companyName = "Unknown company";
    } else {
      continue;
    }

    let workMode: WorkMode | null = null;
    const modeBlob = `${title} ${companyName} ${blurb}`;
    if (/\bremote\b/i.test(modeBlob)) workMode = "remote";
    else if (/\bhybrid\b/i.test(modeBlob)) workMode = "hybrid";
    else if (/\bon-?site\b/i.test(modeBlob) || /\bin office\b/i.test(modeBlob)) workMode = "onsite";

    let location: string | null = null;
    const loc = blurb.match(/\b(?:based in|in)\s+([A-Za-z0-9 .,'-]{2,60}?)(?:\s*\(|\.|,|$)/i);
    if (loc) location = loc[1]!.trim();
    else if (/\b(remote|hybrid)\b/i.test(blurb) && !location) {
      // leave null; workMode already set
    }

    const job: HarvestedJob = {
      title: title.slice(0, 300),
      companyName: companyName.slice(0, 300),
      location,
      salaryRange: null,
      description: blurb ? blurb.slice(0, 2_000) : null,
      listingUrl: canon.startsWith("http") ? canon : listingUrl,
      applyUrl: null,
      applyMethod: "external",
      workMode,
      source: inferApplicationSource(listingUrl, fromEmail)
    };

    if (!isValidHarvestedJob(job)) continue;
    seenCanon.add(canon);
    jobs.push(job);
  }

  return jobs.slice(0, 25);
}

/**
 * Union of text-card + HTML-anchor harvests (dedup by canonical URL).
 */
export function harvestJobsFromMail(input: ExtractJobLinksInput): HarvestedJob[] {
  const merged = new Map<string, HarvestedJob>();
  for (const job of [...harvestJobsFromHtmlAnchors(input), ...harvestJobsFromMailBody(input)]) {
    const key = (canonicalizeJobUrl(job.listingUrl) ?? job.listingUrl).toLowerCase();
    if (!merged.has(key)) merged.set(key, job);
  }
  return [...merged.values()].slice(0, 25);
}

/**
 * Parse LinkedIn-style multi-line cards:
 *
 *   Title
 *   Company
 *   Location
 *   Apply with resume & profile
 *   View job: https://.../jobs/view/ID
 */
export function harvestJobsFromMailBody(input: ExtractJobLinksInput): HarvestedJob[] {
  const text = (input.bodyText ?? "").replace(/\u00A0/g, " ");
  const fromEmail = input.fromEmail ?? "";
  const jobs: HarvestedJob[] = [];
  const seenCanon = new Set<string>();

  // Split on each job view URL occurrence (including "View job: url")
  const urlRe =
    /(?:View job:\s*)?(https?:\/\/[^\s]+?(?:\/jobs\/view\/\d+|indeed\.[^\s]*jk=|viewjob)[^\s]*)/gi;
  const matches = [...text.matchAll(urlRe)];

  for (const m of matches) {
    const listingUrl = m[1]!.replace(/[),.;]+$/g, "");
    if (!isLikelyJobListingUrl(listingUrl)) continue;
    const canon = canonicalizeJobUrl(listingUrl) ?? listingUrl;
    if (seenCanon.has(canon)) continue;
    seenCanon.add(canon);

    const idx = m.index ?? 0;
    const before = text.slice(Math.max(0, idx - 500), idx);
    const lines = before
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !isNoiseContextLine(l));

    // Take last 1–3 meaningful lines before the URL as title / company / location
    const block = lines.slice(-4);
    let title = "";
    let companyName = "";
    let location: string | null = null;

    if (block.length >= 3) {
      // title, company, location (location may be "Egypt" or "Cairo, Egypt")
      location = block[block.length - 1]!;
      companyName = block[block.length - 2]!;
      title = block[block.length - 3]!;
      // If "location" looks like a company (has "Inc", "Ltd") swap heuristics
      if (/actively hiring/i.test(location)) {
        location = null;
        companyName = block[block.length - 1]!;
        title = block[block.length - 2]!;
      }
    } else if (block.length === 2) {
      title = block[0]!;
      companyName = block[1]!;
    } else if (block.length === 1) {
      // "Title at Company"
      const at = block[0]!.match(/^(.+?)\s+at\s+(.+)$/i);
      if (at) {
        title = at[1]!.trim();
        companyName = at[2]!.trim();
      } else {
        title = block[0]!;
      }
    }

    // Clean common junk
    title = title.replace(/^["'“]+|["'”]+$/g, "").trim();
    companyName = companyName
      .replace(/^["'“]+|["'”]+$/g, "")
      .replace(/[’']$/g, "")
      .trim();
    if (location) {
      location = location.replace(/^["']+|["']+$/g, "").trim();
      if (isNoiseContextLine(location) || /^apply /i.test(location)) location = null;
    }

    // Subject fallback only for single-job "Title at Company" subjects
    if ((!title || !companyName) && input.subject) {
      const at = input.subject.match(/^(.+?)\s+at\s+(.+)$/i);
      if (at && !isGarbageJobTitle(at[1]!)) {
        title = title || at[1]!.trim();
        companyName = companyName || at[2]!.trim();
      }
    }

    const ctx = before.slice(-300).toLowerCase();
    let applyMethod: ApplicationApplyMethod = "unknown";
    if (ctx.includes("easy apply") || ctx.includes("apply with resume")) {
      applyMethod = "easy_apply";
    } else if (ctx.includes("apply on company") || ctx.includes("company website")) {
      applyMethod = "external";
    }

    let workMode: WorkMode | null = null;
    const modeBlob = `${title} ${companyName} ${location ?? ""} ${ctx}`;
    if (/\bremote\b/i.test(modeBlob)) workMode = "remote";
    else if (/\bhybrid\b/i.test(modeBlob)) workMode = "hybrid";
    else if (/\bon-?site\b/i.test(modeBlob) || /\bin office\b/i.test(modeBlob)) workMode = "onsite";

    // Google job alerts (often few lines + redirect URLs)
    if (fromEmail.includes("google.com") && (!title || isGarbageJobTitle(title))) {
      const allLines = text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("http") && !isNoiseContextLine(l));
      if (allLines[0] && !isGarbageJobTitle(allLines[0])) title = allLines[0].slice(0, 200);
      // company often after location line
      const via = text.match(/\bvia\s+([A-Za-z0-9 ._-]{2,40})/i);
      if (via) companyName = via[1]!.trim();
      else if (allLines[2] && !/^near /i.test(allLines[2])) companyName = allLines[2].slice(0, 200);
      if (allLines[1] && /Egypt|Cairo|Remote|United|London/i.test(allLines[1])) {
        location = allLines[1];
      }
    }

    const job: HarvestedJob = {
      title: (title || "Unknown role").slice(0, 300),
      companyName: (companyName || "Unknown company").slice(0, 300),
      location,
      salaryRange: null,
      description: null,
      listingUrl: canon.startsWith("http") ? canon : listingUrl,
      applyUrl: null,
      applyMethod,
      workMode,
      source: inferApplicationSource(listingUrl, fromEmail)
    };

    if (!isValidHarvestedJob(job)) continue;
    jobs.push(job);
  }

  return jobs.slice(0, 25);
}

function stripTagsToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function metaContentFromHtml(html: string, propertyOrName: string): string | null {
  const prop = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")
  )?.[1];
  if (a?.trim()) return a.trim();
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i")
  )?.[1];
  const s = b?.trim();
  if (!s) return null;
  return s;
}

/**
 * Parse "Storyteller hiring Junior Web Developer in Egypt | LinkedIn" style titles.
 */
export function parseLinkedInHiringTitle(pageTitle: string): {
  title: string | null;
  companyName: string | null;
  location: string | null;
} {
  const cleaned = pageTitle.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  const m = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+))?$/i);
  if (!m) return { title: null, companyName: null, location: null };
  return {
    companyName: m[1]?.trim() || null,
    title: m[2]?.trim() || null,
    location: m[3]?.trim() || null
  };
}

/**
 * Public listing fields used by harvest / refresh.
 * Aliases {@link ListingPageExtract} so site-agnostic extract and harvest share one shape.
 */
export type PublicJobListingExtract = ListingPageExtract;

/**
 * Phrases / class markers for closed or expired public job postings.
 * Prefer multi-word markers over bare "closed" to avoid false positives.
 */
const CLOSED_LISTING_MARKERS = [
  "closed-job",
  "closed-job__flavor--closed",
  "no longer accepting applications",
  "this job is no longer available",
  "job is no longer available",
  "this position has been filled",
  "this job has expired",
  "job has expired",
  "job posting is no longer available",
  "applications have closed",
  "no longer accepting applicants"
] as const;

/**
 * True when HTML (LinkedIn guest, etc.) marks the listing as closed/expired.
 */
export function isClosedJobListingHtml(html: string): boolean {
  if (!html || html.length < 20) return false;
  const lower = html.toLowerCase();
  return CLOSED_LISTING_MARKERS.some((m) => lower.includes(m));
}

/**
 * True when plain page text (or description) marks the listing as closed.
 * Excludes CSS-only class names that never appear in stripped text.
 */
export function isClosedJobListingText(text: string): boolean {
  if (!text || text.length < 10) return false;
  const lower = text.toLowerCase();
  return CLOSED_LISTING_MARKERS.some((m) => !m.startsWith("closed-job") && lower.includes(m));
}

/**
 * Deterministic extract from public listing HTML.
 * Site-agnostic layers (JSON-LD, embedded SPA JSON, meta) plus LinkedIn guest
 * DOM fallbacks. Prefer {@link extractPublicJobListingFromHtmlAsync} when async
 * is available (adds Readability main-content extract).
 */
export function extractPublicJobListingFromHtml(
  html: string,
  listingUrl?: string
): PublicJobListingExtract {
  // Shared structured pipeline (JSON-LD → embedded JSON → meta).
  const structured = extractJobListingStructured(html, listingUrl);
  const out: PublicJobListingExtract = { ...structured };
  delete (out as { descriptionSource?: string }).descriptionSource;

  const host = listingUrl ? listingUrl.toLowerCase() : "";
  if (host.includes("linkedin.") || /linkedin\.com/i.test(html) || /d_jobs_guest/i.test(html)) {
    out.source = "linkedin";
  }

  if (isClosedJobListingHtml(html)) {
    out.listingClosed = true;
  }

  // LinkedIn public guest job card (SSR markup — still the richest LI guest signal)
  const liTitle =
    html.match(/top-card-layout__title[^>]*>([^<]+)/i)?.[1]?.trim() ??
    html.match(/class="[^"]*topcard__title[^"]*"[^>]*>([^<]+)/i)?.[1]?.trim() ??
    html.match(/<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)/i)?.[1]?.trim();
  if (liTitle) out.title = liTitle.slice(0, 300);

  const liCompany =
    html.match(/topcard__org-name-link[^>]*>([^<]+)/i)?.[1]?.trim() ??
    html.match(/topcard__flavor--black-link[^>]*>([^<]+)/i)?.[1]?.trim() ??
    html
      .match(/data-tracking-control-name="public_jobs_topcard-org-name"[^>]*>([^<]+)/i)?.[1]
      ?.trim();
  if (liCompany) out.companyName = liCompany.slice(0, 300);

  // Location often in flavor bullet next to company
  const liLocation =
    html.match(/topcard__flavor--bullet[^>]*>\s*([^<]+)/i)?.[1]?.trim() ??
    html.match(/class="[^"]*topcard__flavor[^"]*"[^>]*>\s*([^<]{2,80})/i)?.[1]?.trim();
  if (liLocation && !/ago|applicants|connections/i.test(liLocation)) {
    out.location = liLocation.slice(0, 300);
  }

  // Prefer the dedicated posting markup — never the whole page (Similar jobs lives outside).
  const descBlock =
    html.match(
      /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>\s*(?:<button|<\/section|<\/div)/i
    )?.[1] ??
    html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i)?.[1] ??
    html.match(
      /class="description__text description__text--rich"[^>]*>\s*<section[\s\S]*?show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i
    )?.[1];
  if (descBlock) {
    const desc = stripListingChromeFromText(stripTagsToText(descBlock)).slice(0, 12_000);
    const picked = pickBetterListingDescription(out.description, desc);
    if (picked) out.description = picked;
  }

  // Fallback: og / meta (+ parse "Company hiring Role in Location")
  const ogTitle = metaContentFromHtml(html, "og:title");
  if (ogTitle) {
    const parsed = parseLinkedInHiringTitle(ogTitle);
    if (!out.title && parsed.title) out.title = parsed.title;
    if (!out.companyName && parsed.companyName) out.companyName = parsed.companyName;
    if (!out.location && parsed.location) out.location = parsed.location;
    out.title ??= ogTitle.replace(/\s*\|\s*LinkedIn\s*$/i, "").slice(0, 300);
  }

  if (!out.description?.trim()) {
    const metaDesc =
      metaContentFromHtml(html, "og:description") ?? metaContentFromHtml(html, "description");
    if (metaDesc && metaDesc.length > 40) {
      out.description = stripListingChromeFromText(
        metaDesc
          .replace(/^Posted\s+[^.]+\.\s*/i, "")
          .replace(/\s*See this and similar jobs on LinkedIn\.?\s*$/i, "")
          .trim()
      ).slice(0, 2_000);
    }
  } else {
    out.description = stripListingChromeFromText(out.description).slice(0, 12_000);
  }

  const lower = html.toLowerCase();
  if (lower.includes("easy apply") || lower.includes("easyapply")) {
    out.applyMethod = "easy_apply";
  }

  const applyHref = html.match(
    /href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]{0,40}apply (on|to|at) (company|website)/i
  )?.[1];
  if (applyHref) {
    out.applyUrl = applyHref.replace(/&amp;/g, "&");
    out.applyMethod = "external";
  }

  const mailto = html.match(/href=["']mailto:([^"'?]+)/i)?.[1];
  if (mailto) {
    out.applyMethod = "email";
    out.applyUrl = `mailto:${mailto}`;
  }

  const textBlob = `${out.description ?? ""} ${out.location ?? ""} ${out.title ?? ""}`;
  if (!out.workMode) {
    if (/\bremote\b/i.test(textBlob)) out.workMode = "remote";
    else if (/\bhybrid\b/i.test(textBlob)) out.workMode = "hybrid";
    else if (/\bon-?site\b/i.test(textBlob)) out.workMode = "onsite";
  }

  return out;
}

/**
 * Full extract for async fetch paths: structured layers + Readability main content
 * when the description is still thin (classic SSR career pages).
 */
export async function extractPublicJobListingFromHtmlAsync(
  html: string,
  listingUrl?: string
): Promise<PublicJobListingExtract> {
  // Start with sync extract (includes LinkedIn DOM guest markup), then structured + Readability.
  // Description merge uses quality scoring so "Similar jobs" chrome never wins on length alone.
  const base = extractPublicJobListingFromHtml(html, listingUrl);
  const full = await extractJobListingFromHtml(html, listingUrl);
  const out: PublicJobListingExtract = { ...base };
  if (full.title && (!out.title || full.title.length > out.title.length)) {
    out.title = full.title;
  }
  if (full.companyName && !out.companyName) out.companyName = full.companyName;
  if (full.location && !out.location) out.location = full.location;
  if (full.workMode && !out.workMode) out.workMode = full.workMode;
  if (full.applyMethod && !out.applyMethod) out.applyMethod = full.applyMethod;
  if (full.listingClosed) out.listingClosed = true;
  const picked = pickBetterListingDescription(out.description, full.description);
  if (picked) out.description = picked;
  return out;
}

/** Prefer non-empty extracted fields over weak seed (Unknown / empty description). */
export function mergeJobListingExtract(
  seed: HarvestedJob,
  extract: PublicJobListingExtract
): HarvestedJob {
  const weakTitle =
    !seed.title?.trim() ||
    seed.title.length < 4 ||
    /^unknown/i.test(seed.title) ||
    isGarbageJobTitle(seed.title);
  const weakCompany =
    !seed.companyName?.trim() ||
    /^unknown/i.test(seed.companyName) ||
    isGarbageCompany(seed.companyName);

  const seedDesc = seed.description?.trim() ?? "";
  const extractDesc = extract.description?.trim() ?? "";
  // Prefer higher-quality posting body (not merely longer — chrome can be huge).
  const description =
    pickBetterListingDescription(seedDesc, extractDesc) ??
    (seedDesc || extractDesc || seed.description);

  return {
    ...seed,
    title: !weakTitle ? seed.title : (extract.title ?? seed.title),
    companyName: !weakCompany ? seed.companyName : (extract.companyName ?? seed.companyName),
    location: seed.location?.trim() ? seed.location : (extract.location ?? seed.location),
    description,
    applyMethod:
      seed.applyMethod !== "unknown" ? seed.applyMethod : (extract.applyMethod ?? seed.applyMethod),
    applyUrl: seed.applyUrl ?? extract.applyUrl ?? null,
    workMode: seed.workMode ?? extract.workMode ?? null,
    source: seed.source ?? extract.source ?? null
  };
}

/**
 * Heuristic extract from fetched HTML (secondary enrichment).
 */
export function enrichJobFromHtml(job: HarvestedJob, html: string): HarvestedJob {
  const extracted = extractPublicJobListingFromHtml(html, job.listingUrl);
  let next = mergeJobListingExtract(job, extracted);

  const text = stripListingChromeFromText(stripTagsToText(stripListingChromeFromHtml(html))).slice(
    0,
    12_000
  );

  if (!next.workMode) {
    if (/\bremote\b/i.test(text)) next.workMode = "remote";
    else if (/\bhybrid\b/i.test(text)) next.workMode = "hybrid";
    else if (/\bon-?site\b/i.test(text)) next.workMode = "onsite";
  }

  // Last resort: plain body text (chrome already stripped) only if still empty.
  if (!next.description?.trim() && text.length > 120) {
    next = { ...next, description: text.slice(0, 4_000) };
  }
  if (next.description) {
    next = { ...next, description: stripListingChromeFromText(next.description) };
  }

  return next;
}

/** Build LLM prompt text with deterministic listing fields first. */
export function formatJobPageTextForLlm(input: {
  pageText: string;
  extract?: PublicJobListingExtract | null;
  pageTitle?: string | null;
  maxChars?: number;
}): string {
  const max = input.maxChars ?? 12_000;
  const parts: string[] = [];
  const e = input.extract;
  if (e?.listingClosed) {
    parts.push(
      "=== LISTING STATUS: CLOSED ===\nThis posting is no longer accepting applications. Do not treat as an open role."
    );
  }
  if (e && (e.title || e.companyName || e.description || e.listingClosed)) {
    parts.push("=== DETERMINISTIC PAGE EXTRACT (prefer these facts) ===");
    if (e.listingClosed) parts.push("listingClosed: true");
    if (e.title) parts.push(`title: ${e.title}`);
    if (e.companyName) parts.push(`companyName: ${e.companyName}`);
    if (e.location) parts.push(`location: ${e.location}`);
    if (e.applyMethod) parts.push(`applyMethod: ${e.applyMethod}`);
    if (e.workMode) parts.push(`workMode: ${e.workMode}`);
    if (e.description) {
      const desc = stripListingChromeFromText(e.description).slice(0, 8_000);
      parts.push(`description:\n${desc}`);
    }
    parts.push("=== END EXTRACT ===");
  } else if (input.pageTitle) {
    parts.push(`Page title: ${input.pageTitle}`);
  }
  // Strip similar-jobs chrome from raw page text so the model is not primed with other roles.
  const pageText = stripListingChromeFromText(input.pageText);
  parts.push(pageText);
  return parts.join("\n\n").slice(0, max);
}

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => n.trim().length > 0 && h.includes(n.toLowerCase()));
}

const SENIORITY_STOP = new Set([
  "senior",
  "sr",
  "junior",
  "jr",
  "staff",
  "principal",
  "lead",
  "intern",
  "mid",
  "midlevel",
  "associate",
  "i",
  "ii",
  "iii",
  "iv"
]);

const ROLE_GENERIC_STOP = new Set([
  "software",
  "engineer",
  "engineering",
  "developer",
  "development",
  "programmer",
  "programming",
  "specialist",
  "consultant",
  "contractor",
  "manager",
  "director",
  "head",
  "officer",
  "founder",
  "remote",
  "hybrid",
  "onsite",
  "the",
  "and",
  "of",
  "for",
  "with",
  "a",
  "an",
  "at",
  "in",
  "to",
  "or"
]);

const KNOWN_ROLE_PHRASES = [
  "full stack",
  "fullstack",
  "front end",
  "frontend",
  "back end",
  "backend",
  "product design",
  "product designer",
  "ux design",
  "ui design",
  "data science",
  "data scientist",
  "machine learning",
  "site reliability",
  "devops",
  "sre",
  "mobile",
  "ios",
  "android",
  "platform",
  "infrastructure",
  "security",
  "quality assurance",
  "test automation"
] as const;

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function haystackHasPhrase(haystack: string, phrase: string): boolean {
  const needle = phrase.trim();
  if (needle.length < 3) return false;
  const pattern = escapeRegExp(needle).replace(/\s+/g, "[\\s._/+-]*");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(haystack);
}

function haystackHasStack(haystack: string, stackName: string): boolean {
  const needle = stackName.trim();
  if (needle.length < 2) return false;
  if (needle.length === 2 && !/^[.#+]/.test(needle)) {
    // Short tokens (Go, AI) need a strict word boundary.
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`, "i").test(haystack);
  }
  return haystackHasPhrase(haystack, needle);
}

/** Domain phrases from experience titles after dropping seniority / generic role words. */
export function meaningfulRolePhrases(title: string): string[] {
  const normalized = normalizeMatchText(title);
  if (!normalized) return [];
  const phrases = new Set<string>();
  for (const known of KNOWN_ROLE_PHRASES) {
    if (haystackHasPhrase(normalized, known)) phrases.add(known);
  }
  const tokens = normalized.split(" ").filter((token) => {
    if (!token || token.length < 3) return false;
    if (SENIORITY_STOP.has(token)) return false;
    if (ROLE_GENERIC_STOP.has(token)) return false;
    return true;
  });
  if (tokens.length > 0) {
    phrases.add(tokens.join(" "));
    for (const token of tokens) phrases.add(token);
  }
  return [...phrases];
}

function applyEvidenceToScore(
  job: HarvestedJob,
  evidence: SeekerMatchEvidence,
  score: number,
  reasons: string[]
): { score: number; evidenceFit: boolean; reasons: string[] } {
  const titleBlob = job.title.toLowerCase();
  const descBlob = `${job.title}\n${job.description ?? ""}`.toLowerCase();
  let next = score;
  let evidenceFit = false;

  const titlePhrases = evidence.roleTitles.flatMap((title) => meaningfulRolePhrases(title));
  const titleHits = titlePhrases.filter((phrase) => haystackHasPhrase(titleBlob, phrase));
  if (titleHits.length > 0) {
    next += Math.min(30, 18 + titleHits.length * 4);
    reasons.push(`experience title: ${titleHits.slice(0, 3).join(", ")}`);
    evidenceFit = true;
  }

  const featuredInTitle = evidence.featuredStackNames.filter((name) =>
    haystackHasStack(titleBlob, name)
  );
  if (featuredInTitle.length > 0) {
    next += Math.min(30, 16 + featuredInTitle.length * 6);
    reasons.push(`featured stack in title: ${featuredInTitle.slice(0, 3).join(", ")}`);
    evidenceFit = true;
  }

  const stacksInTitle = evidence.stackNames.filter((name) => haystackHasStack(titleBlob, name));
  if (stacksInTitle.length > 0) {
    next += Math.min(24, 10 + stacksInTitle.length * 5);
    reasons.push(`stack in title: ${stacksInTitle.slice(0, 3).join(", ")}`);
    evidenceFit = true;
  }

  const featuredInDesc = evidence.featuredStackNames.filter(
    (name) => !featuredInTitle.includes(name) && haystackHasStack(descBlob, name)
  );
  if (featuredInDesc.length > 0) {
    next += Math.min(12, featuredInDesc.length * 4);
    reasons.push(`featured stack in listing: ${featuredInDesc.slice(0, 3).join(", ")}`);
    evidenceFit = true;
  }

  const stacksInDesc = evidence.stackNames.filter(
    (name) => !stacksInTitle.includes(name) && haystackHasStack(descBlob, name)
  );
  if (stacksInDesc.length >= 2) {
    next += Math.min(12, stacksInDesc.length * 3);
    reasons.push(`stacks in listing: ${stacksInDesc.slice(0, 4).join(", ")}`);
    evidenceFit = true;
  }

  return { score: next, evidenceFit, reasons };
}

/**
 * Score a harvested job against user preferences and optional career-profile
 * evidence (0–100). Rules-only.
 * When role keywords are set, require a hit on the **title** (not random URL text).
 * When preferences are open and evidence exists, require a profile fit.
 */
export function scoreJobAgainstPreference(
  job: HarvestedJob,
  prefs: JobPreference | null | undefined,
  evidence?: SeekerMatchEvidence | null
): JobMatchScoreResult {
  const p = prefs ?? defaultJobPreference();
  const reasons: string[] = [];
  let score = 40;

  const titleBlob = job.title.toLowerCase();
  const blob = [job.title, job.companyName, job.location ?? "", job.description ?? ""]
    .join("\n")
    .toLowerCase();

  if (isGarbageJobTitle(job.title) || isGarbageCompany(job.companyName)) {
    return { score: 0, passed: false, reasons: ["invalid title/company"] };
  }

  if (p.excludeKeywords.length > 0 && includesAny(blob, p.excludeKeywords)) {
    return { score: 0, passed: false, reasons: ["excluded keyword match"] };
  }

  if (p.roleKeywords.length > 0) {
    // Title-only — never score from fetched HTML description noise
    const titleHits = p.roleKeywords.filter((k) => titleBlob.includes(k.toLowerCase()));
    if (titleHits.length > 0) {
      score += Math.min(40, 15 + titleHits.length * 10);
      reasons.push(`title keywords: ${titleHits.slice(0, 3).join(", ")}`);
    } else {
      return { score: 15, passed: false, reasons: ["no role keyword in title"] };
    }
  }

  // workModes is multi-select (OR): any preferred mode counts as a match.
  if (p.workModes.length > 0) {
    const preferred = p.workModes.join(", ");
    if (job.workMode && p.workModes.includes(job.workMode)) {
      score += 20;
      reasons.push(`work mode ${job.workMode} matches preferred (${preferred})`);
    } else if (job.workMode && !p.workModes.includes(job.workMode)) {
      score -= 20;
      reasons.push(`work mode ${job.workMode} not in preferred (${preferred})`);
    } else {
      reasons.push("work mode unknown");
    }
  }

  if (p.locations.length > 0) {
    const locFromJob =
      job.location != null && job.location.length > 0
        ? includesAny(job.location, p.locations)
        : false;
    const locHit =
      locFromJob ||
      includesAny(blob, p.locations) ||
      (job.workMode === "remote" && p.workModes.includes("remote"));
    if (locHit) {
      score += 15;
      reasons.push("location match");
    } else if (job.location) {
      score -= 15;
      reasons.push("location mismatch");
    }
  }

  if (seekerEvidenceHasSignal(evidence) && evidence) {
    const applied = applyEvidenceToScore(job, evidence, score, reasons);
    score = applied.score;
    if (isOpenJobPreference(p) && !applied.evidenceFit) {
      return {
        score: Math.min(applied.score, 25),
        passed: false,
        reasons: [...applied.reasons, "no profile evidence fit"]
      };
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const min = p.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE;
  return {
    score,
    passed: score >= min,
    reasons
  };
}

/** Shared harvest / application-match scorer prompt. */
export function formatJobMatchScorePrompt(input: {
  prefs: HarvestJobPreference | JobPreference;
  evidence?: SeekerMatchEvidence | null;
  jobs: unknown[];
  minScore: number;
}): string {
  const evidence =
    input.evidence ?? ("evidence" in input.prefs ? (input.prefs.evidence ?? null) : null);
  return `Score these jobs for the seeker.

JobPreference (JSON):
${JSON.stringify(
  {
    workModes: input.prefs.workModes ?? [],
    locations: input.prefs.locations ?? [],
    roleKeywords: input.prefs.roleKeywords ?? [],
    excludeKeywords: input.prefs.excludeKeywords ?? [],
    salaryMin: input.prefs.salaryMin ?? null,
    salaryCurrency: input.prefs.salaryCurrency ?? null,
    minMatchScore: input.minScore
  },
  null,
  2
)}

${formatSeekerEvidenceForPrompt(evidence)}

Jobs (JSON array):
${JSON.stringify(input.jobs, null, 2)}

Return matches[] with listingUrl, score 0-100, passed (true only if score >= minMatchScore ${input.minScore} and not excluded), and reasons.
Use semantic role fit — do not treat generic words like "engineer" or "developer" as a strong frontend/react match.
workModes is multi-select (OR): empty array = any mode; boost when job.workMode is any preferred mode; soft-penalize only when job mode is known and outside the preferred set.
When roleKeywords are empty, infer fit from SeekerProfileEvidence (experience titles, featured stacks, project stacks). Fail jobs that are orthogonal to this career (nursing, sales SDR, graphic design vs a frontend engineer, etc.).
A job should pass only if it reasonably matches the seeker's craft or explicit preferences.`;
}
