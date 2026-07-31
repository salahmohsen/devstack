import { z } from "zod";

import {
  ApplicationApplyMethodSchema,
  ApplicationSourceSchema,
  type ApplicationApplyMethod,
  type ApplicationSource
} from "#@/application/types";
import { DEFAULT_MIN_MATCH_SCORE } from "#@/job-preference/constants";
import { type JobPreference, type WorkMode } from "#@/job-preference/types";
import { defaultJobPreference } from "#@/job-preference/utils";

/** Structured job extracted from a mail card and/or job page. */
export const HarvestedJobSchema = z.object({
  title: z.string().min(1).max(300),
  companyName: z.string().min(1).max(300),
  location: z.string().max(300).nullable().optional(),
  salaryRange: z.string().max(200).nullable().optional(),
  description: z.string().max(20_000).nullable().optional(),
  listingUrl: z.string().url(),
  applyUrl: z.string().url().nullable().optional(),
  applyMethod: ApplicationApplyMethodSchema.default("unknown"),
  workMode: z.enum(["remote", "hybrid", "onsite"]).nullable().optional(),
  source: ApplicationSourceSchema.nullable().optional()
});
export type HarvestedJob = z.infer<typeof HarvestedJobSchema>;

export const JobMatchScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  reasons: z.array(z.string())
});
export type JobMatchScoreResult = z.infer<typeof JobMatchScoreResultSchema>;

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
 * Canonical listing URL for dedup: strip tracking query params, normalize host.
 */
export function canonicalizeJobUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    // Drop common tracking params
    for (const key of u.searchParams.keys()) {
      if (TRACKING_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }
    // LinkedIn job id path
    const li = u.pathname.match(/\/jobs\/view\/(\d+)/i);
    if (li && (u.hostname.includes("linkedin.com") || u.hostname.includes("lnkd.in"))) {
      return `https://www.linkedin.com/jobs/view/${li[1]}`;
    }
    // Indeed jk=
    const jk = u.searchParams.get("jk");
    if (jk && u.hostname.includes("indeed.")) {
      return `https://www.indeed.com/viewjob?jk=${jk}`;
    }
    u.hash = "";
    // Prefer https + no trailing slash
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
  // Job-like paths
  if (/\/jobs\/view\/\d+/i.test(u)) return true;
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
  if (u.includes("viewjob") || u.includes("jk=")) return 90;
  if (u.includes("email/redirect")) return 70;
  if (u.includes("/jobs/search")) return 20;
  if (u.includes("/careers/") || u.includes("greenhouse") || u.includes("lever")) return 80;
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

/**
 * Parse LinkedIn-style digest cards from plain text:
 * "Title | Company | Location" near a jobs/view URL.
 */
export function harvestJobsFromMailBody(input: ExtractJobLinksInput): HarvestedJob[] {
  const urls = extractJobListingUrls(input);
  const text = (input.bodyText ?? "").replace(/\u00A0/g, " ");
  const jobs: HarvestedJob[] = [];
  const fromEmail = input.fromEmail ?? "";

  for (const listingUrl of urls) {
    const canon = canonicalizeJobUrl(listingUrl) ?? listingUrl;
    const source = inferApplicationSource(listingUrl, fromEmail);

    // Find context window around URL in text
    const idx = text.indexOf(listingUrl.slice(0, 60));
    const windowStart = Math.max(0, idx - 400);
    const windowEnd = Math.min(text.length, (idx >= 0 ? idx : 0) + listingUrl.length + 100);
    const ctx = idx >= 0 ? text.slice(windowStart, windowEnd) : text.slice(0, 800);

    let title = "Unknown role";
    let companyName = "Unknown company";
    let location: string | null = null;
    let applyMethod: ApplicationApplyMethod = "unknown";
    let workMode: WorkMode | null = null;

    // Pattern: Title | Company | Location (allow en-dash/em-dash in titles)
    const pipe = ctx.match(
      /([A-Za-z0-9][^|\n]{2,100}?)\s*\|\s*([^|\n]{1,80}?)(?:\s*\|\s*([^|\n]{1,80}?))?(?=\s*\||\s*Apply|\s*View|$)/
    );
    if (pipe) {
      title = pipe[1]!.trim();
      companyName = pipe[2]!.trim();
      location = pipe[3]?.trim() ?? null;
      // Drop trailing "Apply with resume..." fragments if captured
      companyName = companyName.replace(/\s*Apply with resume.*$/i, "").trim();
    } else {
      // Subject often "Title at Company"
      const sub = input.subject ?? "";
      const at = sub.match(/^(.+?)\s+at\s+(.+)$/i);
      if (at) {
        title = at[1]!.trim();
        companyName = at[2]!.trim();
      } else if (sub.length > 3 && sub.length < 120) {
        title = sub.replace(/^job alert[:\s]*/i, "").trim() || title;
      }
    }

    const ctxLower = ctx.toLowerCase();
    if (ctxLower.includes("easy apply") || ctxLower.includes("apply with resume")) {
      applyMethod = "easy_apply";
    } else if (ctxLower.includes("apply on company") || ctxLower.includes("company website")) {
      applyMethod = "external";
    }

    if (/\bremote\b/i.test(ctx) || /\bremote\b/i.test(title)) workMode = "remote";
    else if (/\bhybrid\b/i.test(ctx)) workMode = "hybrid";
    else if (/\bon-?site\b/i.test(ctx) || /\bin office\b/i.test(ctx)) workMode = "onsite";

    // Google job alerts: "Title ... Company ... via Board"
    if (fromEmail.includes("google.com") && title === "Unknown role") {
      const lines = text
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines[0]) title = lines[0].slice(0, 200);
      const via = text.match(/via\s+([A-Za-z0-9 ._-]+)/i);
      if (lines[1] && !lines[1].toLowerCase().startsWith("near")) {
        companyName = lines[1].slice(0, 200);
      }
      if (via) companyName = companyName === "Unknown company" ? via[1]!.trim() : companyName;
    }

    jobs.push({
      title: title.slice(0, 300) || "Unknown role",
      companyName: companyName.slice(0, 300) || "Unknown company",
      location,
      salaryRange: null,
      description: null,
      listingUrl: canon.startsWith("http") ? canon : listingUrl,
      applyUrl: null,
      applyMethod,
      workMode,
      source
    });
  }

  return jobs;
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
 */
export function scoreJobAgainstPreference(
  job: HarvestedJob,
  prefs: JobPreference | null | undefined
): JobMatchScoreResult {
  const p = prefs ?? defaultJobPreference();
  const reasons: string[] = [];
  let score = 50; // neutral base when little signal

  const blob = [
    job.title,
    job.companyName,
    job.location ?? "",
    job.description ?? "",
    job.listingUrl
  ]
    .join("\n")
    .toLowerCase();

  // Hard fail: exclude keywords
  if (p.excludeKeywords.length > 0 && includesAny(blob, p.excludeKeywords)) {
    return {
      score: 0,
      passed: false,
      reasons: [`excluded keyword match`]
    };
  }

  // Work mode
  if (p.workModes.length > 0) {
    if (job.workMode && p.workModes.includes(job.workMode)) {
      score += 25;
      reasons.push(`work mode ${job.workMode}`);
    } else if (job.workMode && !p.workModes.includes(job.workMode)) {
      score -= 25;
      reasons.push(`work mode ${job.workMode} not preferred`);
    } else {
      // unknown mode — slight penalty only if user is strict
      reasons.push("work mode unknown");
    }
  }

  // Location
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
      score -= 10;
      reasons.push("location mismatch");
    }
  }

  // Role keywords
  if (p.roleKeywords.length > 0) {
    const hits = p.roleKeywords.filter((k) => blob.includes(k.toLowerCase()));
    if (hits.length > 0) {
      score += Math.min(25, 10 + hits.length * 5);
      reasons.push(`keywords: ${hits.slice(0, 3).join(", ")}`);
    } else {
      score -= 15;
      reasons.push("no role keyword match");
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
