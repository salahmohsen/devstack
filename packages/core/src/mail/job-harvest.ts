import { z } from "zod";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  type ApplicationApplyMethod,
  type ApplicationSource
} from "#@/application/types";
import { DEFAULT_MIN_MATCH_SCORE } from "#@/job-preference/constants";
import { WorkModeSchema, type JobPreference, type WorkMode } from "#@/job-preference/types";
import { defaultJobPreference } from "#@/job-preference/utils";

/** Structured job extracted from a mail card and/or job page. */
export const HarvestedJobSchema = z.object({
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(300),
  location: z.string().max(300).nullable().optional(),
  salaryRange: z.string().max(200).nullable().optional(),
  description: z.string().max(20_000).nullable().optional(),
  listingUrl: z.string().url(),
  applyUrl: z.string().url().nullable().optional().default(null),
  applyMethod: ApplicationApplyMethodSchema.default("unknown"),
  workMode: WorkModeSchema.nullable().optional(),
  source: ApplicationSourceSchema.nullable().optional()
});
export type HarvestedJob = z.infer<typeof HarvestedJobSchema>;

/**
 * AI output from reading a job-notifier email (before page fetch).
 * listingUrl required; other fields optional until page enrich.
 */
export const MailNotifierExtractSchema = z.object({
  isJobNotifier: z.boolean(),
  reason: z.string().max(500).optional(),
  jobs: z
    .array(
      z.object({
        listingUrl: z.string().url(),
        title: z.string().max(300).optional().nullable(),
        companyName: z.string().max(300).optional().nullable(),
        location: z.string().max(300).optional().nullable(),
        applyMethod: ApplicationApplyMethodSchema.optional().nullable(),
        workMode: WorkModeSchema.optional().nullable()
      })
    )
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
  minMatchScore: z.number().int().min(0).max(100).default(60)
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
export const ScoredHarvestedJobSchema = HarvestedJobSchema.extend({
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
    for (const key of [...u.searchParams.keys()]) {
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

/**
 * Heuristic extract from fetched HTML (secondary enrichment).
 */
export function enrichJobFromHtml(job: HarvestedJob, html: string): HarvestedJob {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);

  const next = { ...job };
  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  )?.[1];
  if (ogTitle && (job.title === "Unknown role" || job.title.length < 4)) {
    next.title = ogTitle.slice(0, 300);
  }

  const lower = html.toLowerCase();
  if (lower.includes("easy apply") || lower.includes("easyapply")) {
    next.applyMethod = "easy_apply";
  }

  // External apply anchors
  const applyHref = html.match(
    /href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]{0,40}apply (on|to|at) (company|website)/i
  )?.[1];
  if (applyHref) {
    next.applyUrl = applyHref.replace(/&amp;/g, "&");
    next.applyMethod = "external";
  }

  const mailto = html.match(/href=["']mailto:([^"'?]+)/i)?.[1];
  if (mailto) {
    next.applyMethod = "email";
    next.applyUrl = `mailto:${mailto}`;
  }

  if (!next.workMode) {
    if (/\bremote\b/i.test(text)) next.workMode = "remote";
    else if (/\bhybrid\b/i.test(text)) next.workMode = "hybrid";
    else if (/\bon-?site\b/i.test(text)) next.workMode = "onsite";
  }

  if (!next.description && text.length > 80) {
    next.description = text.slice(0, 4000);
  }

  return next;
}

function includesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => n.trim().length > 0 && h.includes(n.toLowerCase()));
}

/**
 * Score a harvested job against user preferences (0–100). Rules-only.
 * When role keywords are set, require a hit on the **title** (not random URL text).
 */
export function scoreJobAgainstPreference(
  job: HarvestedJob,
  prefs: JobPreference | null | undefined
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

  if (p.workModes.length > 0) {
    if (job.workMode && p.workModes.includes(job.workMode)) {
      score += 20;
      reasons.push(`work mode ${job.workMode}`);
    } else if (job.workMode && !p.workModes.includes(job.workMode)) {
      score -= 20;
      reasons.push(`work mode ${job.workMode} not preferred`);
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

  score = Math.max(0, Math.min(100, Math.round(score)));
  const min = p.minMatchScore ?? DEFAULT_MIN_MATCH_SCORE;
  return {
    score,
    passed: score >= min,
    reasons
  };
}
