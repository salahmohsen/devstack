/**
 * Site-agnostic public job listing extraction.
 *
 * Priority (efficient → expensive):
 * 1. schema.org JobPosting JSON-LD (explicit structured data)
 * 2. Embedded JSON in inline scripts (JSON.parse / large objects with job-like fields)
 * 3. Mozilla Readability via @extractus/article-extractor (main content)
 * 4. Open Graph / meta tags
 *
 * No host-specific scrapers — ATS/SPAs that bury the JD in JS are handled by (2).
 */

import { extractFromHtml } from "@extractus/article-extractor";

import { extractSkillMentions } from "#@/application/job-skills";
import { type ApplicationApplyMethod, type ApplicationSource } from "#@/application/types";
import { normalizeHiringRegion } from "#@/job-discovery/hiring-region";
import { type SalaryPeriod } from "#@/job-preference/salary-compare";
import { type WorkMode } from "#@/job-preference/types";

export type ListingPageExtract = {
  title?: string;
  companyName?: string;
  location?: string | null;
  description?: string | null;
  applyMethod?: ApplicationApplyMethod;
  applyUrl?: string | null;
  workMode?: WorkMode | null;
  /** True when workMode came from JSON-LD / explicit ATS fields, not JD prose. */
  workModeStated?: boolean;
  hiringRegion?: string | null;
  employmentType?: string | null;
  /** Team / function chip from ATS chrome (e.g. Engineering). */
  department?: string | null;
  /** ISO date `YYYY-MM-DD` when the posting states a publish day. */
  datePosted?: string | null;
  /** Stated experience band, e.g. `4+ years of experience`. */
  experience?: string | null;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: SalaryPeriod | null;
  skills?: string[];
  source?: ApplicationSource;
  listingClosed?: boolean;
  /** Which layer produced the description (diagnostics / tests). */
  descriptionSource?: "jsonld" | "embedded_json" | "readability" | "meta";
};

const EMPLOYMENT_COMPACT: Readonly<Record<string, string>> = {
  fulltime: "full_time",
  parttime: "part_time",
  contract: "contract",
  contractor: "contract",
  intern: "internship",
  internship: "internship"
};

/** Map ATS / schema.org employment strings. Does not invent `unknown`. */
export function normalizeStatedEmploymentType(value: unknown): string | null {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const compact = item
      .trim()
      .toLowerCase()
      .replace(/[_\s-]+/g, "");
    if (!compact) continue;
    const mapped = EMPLOYMENT_COMPACT[compact];
    if (mapped) return mapped;
  }
  return null;
}

/** Map ATS workplace / JSON-LD jobLocationType / isRemote. */
export function normalizeStatedWorkMode(value: unknown): WorkMode | null {
  if (value === true) return "remote";
  if (typeof value !== "string") return null;
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "");
  if (compact === "remote" || compact === "telecommute" || compact === "wfh") return "remote";
  if (compact === "hybrid" || compact === "remotehybrid" || compact === "hybridremote") {
    return "hybrid";
  }
  if (compact === "onsite") return "onsite";
  return null;
}

/** ISO calendar day from schema.org `datePosted` / ATS publish fields. */
export function normalizeDatePosted(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

/** First stated experience band (`4+ years`, `at least 5 years of experience`). */
export function extractExperienceFromDescription(text: string): string | null {
  const match =
    text.match(/\b(\d+\s*\+\s*years?(?:\s+of\s+experience)?)\b/i) ??
    text.match(/\b(at\s+least\s+\d+\s*years?(?:\s+of\s+experience)?)\b/i) ??
    text.match(/\b(\d+\s*years?\s+of\s+experience)\b/i);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ");
}

/** Board chrome mis-read as the employer (`LinkedIn`, `Company unavailable (LinkedIn listing)`). */
export function isJobBoardCompanyName(company: string): boolean {
  const c = company.trim();
  if (/^(linkedin|indeed|glassdoor)(\s+listing)?$/i.test(c)) return true;
  if (/\b(linkedin|indeed|glassdoor)\s+listing\b/i.test(c)) return true;
  if (/^company unavailable\b/i.test(c)) return true;
  return false;
}

/**
 * "Yassir hiring Senior Frontend Engineer in Cairo, Egypt | LinkedIn"
 * (and Indeed / Glassdoor equivalents).
 */
export function parseHiringPageTitle(pageTitle: string): {
  title: string | null;
  companyName: string | null;
  location: string | null;
} {
  const cleaned = pageTitle.replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor)\s*$/i, "").trim();
  const match = cleaned.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+(.+))?$/i);
  if (!match) return { title: null, companyName: null, location: null };
  const companyName = match[1]?.trim() || null;
  return {
    companyName: companyName && !isJobBoardCompanyName(companyName) ? companyName : null,
    title: match[2]?.trim() || null,
    location: match[3]?.trim() || null
  };
}

/** Named + numeric HTML entities (`&apos;`, `&#39;`, `&#x27;`). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (raw, hex: string) => {
      const code = Number.parseInt(hex, 16);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return raw;
      return String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (raw, dec: string) => {
      const code = Number.parseInt(dec, 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return raw;
      return String.fromCodePoint(code);
    });
}

const JOB_CRITERIA_ITEM =
  /<h3[^>]*job-criteria-subheader[^>]*>\s*([^<]+?)\s*<\/h3>\s*<span[^>]*job-criteria-text[^>]*>\s*([^<]+?)\s*<\/span>/gi;

/**
 * LinkedIn guest (and similar) labeled criteria: Employment type, Workplace type.
 * Does not invent Hybrid when the page never states a workplace type.
 */
export function extractGuestJobCriteria(
  html: string
): Pick<ListingPageExtract, "employmentType" | "workMode" | "workModeStated" | "department"> {
  const out: Pick<
    ListingPageExtract,
    "employmentType" | "workMode" | "workModeStated" | "department"
  > = {};
  for (const match of html.matchAll(JOB_CRITERIA_ITEM)) {
    const label = decodeHtmlEntities(match[1] ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const value = decodeHtmlEntities(match[2] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!label || !value || /^not applicable$/i.test(value)) continue;
    if (label === "employment type") {
      const employmentType = normalizeStatedEmploymentType(value);
      if (employmentType) out.employmentType = employmentType;
    } else if (label === "workplace type" || label === "work type") {
      const workMode = normalizeStatedWorkMode(value);
      if (workMode) {
        out.workMode = workMode;
        out.workModeStated = true;
      }
    } else if ((label === "job function" || label === "department") && value.length <= 80) {
      out.department = value;
    }
  }
  return out;
}

/**
 * ATS header chip: `<li class="department">…Engineering…</li>`.
 * Ignores i18n placeholders such as `%LABEL_POSITION_TYPE_FULL_TIME%`.
 */
export function extractDepartmentFromHtml(html: string): string | null {
  const item = html.match(
    /<li[^>]*\bclass=["'][^"']*\bdepartment\b[^"']*["'][^>]*>[\s\S]*?<\/li>/i
  )?.[0];
  if (!item) return null;
  const span = item.match(/<span(?![^>]*\bpolygot\b)[^>]*>\s*([^<]+?)\s*<\/span>/i)?.[1];
  const raw = (span ?? item.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  if (!raw || raw.length > 80 || /%[A-Z0-9_]+%/.test(raw)) return null;
  return raw;
}

/** Catalog mention scan. Extra names are usually this user's stacks. */
export function extractSkillsFromJobDescription(
  text: string,
  extraNames: readonly string[] = []
): { required: string[]; preferred: string[] } {
  return extractSkillMentions(text, extraNames);
}

/** Prefer hybrid when a remote posting also states a hybrid option. */
export function refineWorkModeFromDescription(
  workMode: WorkMode | null | undefined,
  text: string
): WorkMode | null {
  const hasHybrid = /\bhybrid\b/i.test(text);
  const hasRemote = /\bremote\b/i.test(text);
  if (hasHybrid && (hasRemote || workMode === "remote")) return "hybrid";
  if (workMode) return workMode;
  if (hasHybrid) return "hybrid";
  if (hasRemote) return "remote";
  if (/\bon[\s-]?site\b/i.test(text)) return "onsite";
  return null;
}

export function applyInferredListingFields(extract: ListingPageExtract): ListingPageExtract {
  const desc = extract.description ?? "";
  const workMode = refineWorkModeFromDescription(extract.workMode, desc);
  if (workMode) {
    extract.workMode = workMode;
    extract.workModeStated = true;
  }
  if (!extract.skills || extract.skills.length === 0) {
    const skills = extractSkillsFromJobDescription(desc);
    const names = [...skills.required, ...skills.preferred];
    if (names.length > 0) extract.skills = names;
  }
  if (!extract.experience && desc) {
    extract.experience = extractExperienceFromDescription(desc);
  }
  return extract;
}

const TITLE_KEYS =
  /^(job_?opening_?name|posting_?title|job_?title|position_?title|position|role|title|name)$/i;
const DESC_KEYS =
  /^(job_?description|posting_?description|full_?description|description|content|body|details|summary|about_?the_?job|responsibilities)$/i;
const COMPANY_KEYS =
  /^(company_?name|company|organization|organisation|hiring_?organization|employer|org_?name|employer_?name)$/i;
const LOCATION_KEYS = /^(location|job_?location|city|address|work_?location)$/i;
const REMOTE_KEYS = /^(remote_?job|is_?remote|remote|work_?remotely|telecommute)$/i;
const WORKPLACE_KEYS = /^(workplace_?type|work_?mode)$/i;
const EMPLOYMENT_KEYS = /^(employment_?type)$/i;
const DEPARTMENT_KEYS = /^(department|team|job_?function|occupational_?category)$/i;
const DATE_POSTED_KEYS = /^(date_?posted|published_?at|posted_?at|posted_?date)$/i;
const SKILL_FIELD_KEYS = /^(skills?|skill_?names?|required_?skills?)$/i;
const CLOSED_KEYS = /^(is_?closed|closed|expired|publish|is_?published|active|is_?active)$/i;

const MAX_WALK_NODES = 4_000;
const MIN_DESC_CHARS = 80;
const MAX_DESC_CHARS = 12_000;

/**
 * Job-board chrome that often pollutes main-content extractors (Readability)
 * and full-page text. Cut description text at the first hit (when enough body
 * precedes it). Keep multi-word phrases to avoid false positives.
 */
const LISTING_CHROME_TEXT_CUTOFFS: RegExp[] = [
  /\n\s*Similar jobs\b/i,
  /\bSimilar jobs\b/i,
  /\n\s*People also viewed\b/i,
  /\bPeople also viewed\b/i,
  /\n\s*People also follow\b/i,
  /\bReferrals increase your chances\b/i,
  /\n\s*See who you know\b/i,
  /\bSee who you know\b/i,
  /\n\s*Explore top content on LinkedIn\b/i,
  /\bExplore top content on LinkedIn\b/i,
  /\n\s*More jobs on LinkedIn\b/i,
  /\n\s*Show more jobs\b/i,
  /\n\s*Jobs you may be interested in\b/i,
  /\n\s*Others viewed\b/i,
  /\n\s*Recommended for you\b/i
];

/** HTML blocks to drop before Readability / full-page text conversion. */
const LISTING_CHROME_HTML_BLOCKS: RegExp[] = [
  /<[^>]*\bsimilar-jobs\b[^>]*>[\s\S]*?<\/(?:section|div|aside|ul)>/gi,
  /<section[^>]*class="[^"]*similar[^"]*"[^>]*>[\s\S]*?<\/section>/gi,
  /<aside[^>]*>[\s\S]*?People also viewed[\s\S]*?<\/aside>/gi,
  /<section[^>]*>[\s\S]*?People also viewed[\s\S]*?<\/section>/gi,
  /<div[^>]*class="[^"]*people-also[^"]*"[^>]*>[\s\S]*?<\/div>/gi
];

/**
 * Remove recommendation / similar-jobs chrome from plain job text.
 * Only cuts when there is real body before the marker (≥80 chars).
 */
export function stripListingChromeFromText(text: string): string {
  if (!text) return text;
  let t = text;
  for (const re of LISTING_CHROME_TEXT_CUTOFFS) {
    const m = t.search(re);
    if (m >= 80) {
      t = t.slice(0, m);
    }
  }
  // Drop trailing LinkedIn meta noise when it appears mid/end of meta one-liners
  t = t
    .replace(/\s*See this and similar jobs on LinkedIn\.?\s*$/i, "")
    .replace(/\s*Show more\s*$/i, "")
    .trim();
  return t;
}

/**
 * Drop known job-board chrome subtrees so Readability does not treat
 * "Similar jobs" carousels as the article body.
 */
export function stripListingChromeFromHtml(html: string): string {
  if (!html) return html;
  let out = html;
  for (const re of LISTING_CHROME_HTML_BLOCKS) {
    out = out.replace(re, " ");
  }
  return out;
}

/**
 * Prefer real posting body over longer chrome-polluted extracts.
 * Penalize known board noise; reward clean length.
 */
export function scoreListingDescription(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  const cleaned = stripListingChromeFromText(text);
  let score = Math.min(cleaned.length, MAX_DESC_CHARS);
  const lower = text.toLowerCase();
  if (lower.includes("similar jobs")) score -= 5_000;
  if (lower.includes("people also viewed")) score -= 4_000;
  if (lower.includes("referrals increase your chances")) score -= 2_000;
  if (lower.includes("explore top content")) score -= 2_000;
  // Repeated job-card titles (carousel) look like short lines of role names
  const lines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 12) {
    const shortRoleLines = lines.filter(
      (l) => l.length < 80 && /\b(engineer|developer|frontend|backend|full.?stack)\b/i.test(l)
    ).length;
    if (shortRoleLines >= 6) score -= 3_000;
  }
  return score;
}

/** Decode a JS string literal body (`\x22`, `\n`, `\/`, …). */
export function decodeJsStringLiteral(content: string): string {
  let out = "";
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i]!;
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = content[i + 1];
    if (next === undefined) {
      out += "\\";
      break;
    }
    if (next === "x" && /^[0-9A-Fa-f]{2}/.test(content.slice(i + 2, i + 4))) {
      out += String.fromCharCode(Number.parseInt(content.slice(i + 2, i + 4), 16));
      i += 3;
      continue;
    }
    if (next === "u" && /^[0-9A-Fa-f]{4}/.test(content.slice(i + 2, i + 6))) {
      out += String.fromCharCode(Number.parseInt(content.slice(i + 2, i + 6), 16));
      i += 5;
      continue;
    }
    if (next === "n") {
      out += "\n";
      i += 1;
      continue;
    }
    if (next === "r") {
      out += "\r";
      i += 1;
      continue;
    }
    if (next === "t") {
      out += "\t";
      i += 1;
      continue;
    }
    out += next;
    i += 1;
  }
  return out;
}

export function stripHtmlToPlainText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(stripped)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function metaContent(html: string, propertyOrName: string): string | null {
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

function asPlaceText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.name === "string" && rec.name.trim()) return rec.name.trim();
  if (typeof rec.addressCountry === "string" && rec.addressCountry.trim()) {
    return rec.addressCountry.trim();
  }
  const addr = rec.address;
  if (addr && typeof addr === "object" && !Array.isArray(addr)) {
    const a = addr as Record<string, unknown>;
    if (typeof a.addressCountry === "string" && a.addressCountry.trim()) {
      return a.addressCountry.trim();
    }
    if (typeof a.name === "string" && a.name.trim()) return a.name.trim();
  }
  return null;
}

function firstPlaceText(value: unknown): string | null {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    const text = asPlaceText(item);
    if (text) return text;
  }
  return null;
}

function hiringRegionFromPlaces(value: unknown): string | null {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    const text = asPlaceText(item);
    const slug = text ? normalizeHiringRegion(text) : null;
    if (slug) return slug;
  }
  return null;
}

function asSkillName(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const name = rec.name ?? rec.termCode;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function asSkillList(value: unknown): string[] {
  if (value == null) return [];
  const items = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item === "string" && item.includes(",")) {
      for (const part of item.split(",")) {
        const name = part.trim();
        if (name) out.push(name);
      }
      continue;
    }
    const name = asSkillName(item);
    if (name) out.push(name);
  }
  return out;
}

function scoreExtract(e: ListingPageExtract): number {
  let s = 0;
  if (e.title) s += 20 + Math.min(e.title.length, 80) / 4;
  if (e.companyName) s += 15;
  if (e.description) s += Math.min(e.description.length, 8_000) / 20;
  if (e.location) s += 5;
  if (e.workMode) s += 3;
  if (e.hiringRegion) s += 2;
  if (e.employmentType) s += 2;
  if (e.department) s += 1;
  if (e.datePosted) s += 1;
  if (e.experience) s += 1;
  if (e.salaryMin != null || e.salaryRange) s += 2;
  if (e.skills && e.skills.length > 0) s += 2;
  return s;
}

function mergePreferRicher(
  base: ListingPageExtract,
  next: ListingPageExtract | null | undefined
): ListingPageExtract {
  if (!next) return base;
  const out: ListingPageExtract = { ...base };
  if (next.title && (!out.title || next.title.length > out.title.length)) out.title = next.title;
  if (next.companyName && !out.companyName) out.companyName = next.companyName;
  if (next.location && !out.location) out.location = next.location;
  if (next.applyMethod && !out.applyMethod) out.applyMethod = next.applyMethod;
  if (next.applyUrl && !out.applyUrl) out.applyUrl = next.applyUrl;
  if (next.workMode && (!out.workMode || (next.workModeStated && !out.workModeStated))) {
    out.workMode = next.workMode;
    out.workModeStated = next.workModeStated;
  }
  if (next.hiringRegion && !out.hiringRegion) out.hiringRegion = next.hiringRegion;
  if (next.employmentType && !out.employmentType) out.employmentType = next.employmentType;
  if (next.department && !out.department) out.department = next.department;
  if (next.datePosted && !out.datePosted) out.datePosted = next.datePosted;
  if (next.experience && !out.experience) out.experience = next.experience;
  if (next.salaryRange && !out.salaryRange) out.salaryRange = next.salaryRange;
  if (next.salaryMin != null && out.salaryMin == null) out.salaryMin = next.salaryMin;
  if (next.salaryCurrency && !out.salaryCurrency) out.salaryCurrency = next.salaryCurrency;
  if (next.salaryPeriod && !out.salaryPeriod) out.salaryPeriod = next.salaryPeriod;
  if (next.skills && next.skills.length > 0 && (!out.skills || out.skills.length === 0)) {
    out.skills = next.skills;
  }
  if (next.source && !out.source) out.source = next.source;
  if (next.listingClosed) out.listingClosed = true;
  const nextDesc = next.description?.trim() ?? "";
  const curDesc = out.description?.trim() ?? "";
  if (nextDesc.length > curDesc.length + 40) {
    out.description = next.description;
    out.descriptionSource = next.descriptionSource ?? out.descriptionSource;
  } else if (!curDesc && nextDesc) {
    out.description = next.description;
    out.descriptionSource = next.descriptionSource ?? out.descriptionSource;
  }
  return out;
}

function asPlainDesc(value: string): string | null {
  const plain = /<[^>]+>/.test(value) ? stripHtmlToPlainText(value) : value.trim();
  const cleaned = stripListingChromeFromText(plain);
  if (cleaned.length < MIN_DESC_CHARS) return null;
  return cleaned.slice(0, MAX_DESC_CHARS);
}

type WalkHit = {
  title?: string;
  companyName?: string;
  location?: string;
  description?: string;
  remote?: boolean;
  workMode?: WorkMode;
  employmentType?: string;
  department?: string;
  datePosted?: string;
  hiringRegion?: string;
  skills?: string[];
  closed?: boolean;
};

/**
 * Walk arbitrary JSON looking for job-like field names (ATS-agnostic).
 */
export function walkJsonForJobFields(root: unknown): WalkHit {
  const hit: WalkHit = {};
  let bestDesc = "";
  let nodes = 0;

  const visit = (node: unknown, depth: number) => {
    if (nodes > MAX_WALK_NODES || depth > 12 || node == null) return;
    nodes += 1;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    for (const [rawKey, value] of Object.entries(rec)) {
      const key = rawKey.replace(/[\s-]+/g, "_");
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) continue;
        if (TITLE_KEYS.test(key) && trimmed.length >= 3 && trimmed.length <= 300) {
          if (!hit.title || trimmed.length > hit.title.length) hit.title = trimmed.slice(0, 300);
        } else if (COMPANY_KEYS.test(key) && trimmed.length >= 2 && trimmed.length <= 200) {
          hit.companyName ??= trimmed.slice(0, 200);
        } else if (LOCATION_KEYS.test(key) && trimmed.length >= 2 && trimmed.length <= 200) {
          hit.location ??= trimmed.slice(0, 200);
        } else if (DESC_KEYS.test(key) || trimmed.length > 400) {
          // Long strings under any key can be a JD body (many ATSs use free-form keys).
          const plain = asPlainDesc(trimmed);
          if (
            plain &&
            plain.length > bestDesc.length &&
            (DESC_KEYS.test(key) || plain.length > 250)
          ) {
            // Prefer explicit description keys; accept long free-form only when very long.
            if (DESC_KEYS.test(key) || plain.length > bestDesc.length) {
              bestDesc = plain;
            }
          }
        } else if (WORKPLACE_KEYS.test(key)) {
          const mode = normalizeStatedWorkMode(trimmed);
          if (mode) hit.workMode ??= mode;
        } else if (EMPLOYMENT_KEYS.test(key)) {
          const employmentType = normalizeStatedEmploymentType(trimmed);
          if (employmentType) hit.employmentType ??= employmentType;
        } else if (DEPARTMENT_KEYS.test(key) && trimmed.length >= 2 && trimmed.length <= 80) {
          hit.department ??= trimmed.slice(0, 80);
        } else if (DATE_POSTED_KEYS.test(key)) {
          const posted = normalizeDatePosted(trimmed);
          if (posted) hit.datePosted ??= posted;
        } else if (SKILL_FIELD_KEYS.test(key)) {
          const skills = asSkillList(trimmed);
          if (skills.length > 0) hit.skills ??= skills;
        } else if (CLOSED_KEYS.test(key)) {
          const lower = trimmed.toLowerCase();
          if (lower === "false" || lower === "0" || lower === "closed" || lower === "expired") {
            if (key.toLowerCase().includes("publish") || key.toLowerCase().includes("active")) {
              hit.closed = true;
            }
          }
        }
      } else if (typeof value === "boolean") {
        if (REMOTE_KEYS.test(key) && value) hit.remote = true;
        if (CLOSED_KEYS.test(key)) {
          // publish:false / active:false / closed:true / is_closed:true
          const k = key.toLowerCase();
          if ((k.includes("publish") || k.includes("active")) && value === false) hit.closed = true;
          if ((k.includes("closed") || k.includes("expired")) && value === true) hit.closed = true;
        }
      } else if (Array.isArray(value) && SKILL_FIELD_KEYS.test(key)) {
        const skills = asSkillList(value);
        if (skills.length > 0) hit.skills ??= skills;
      } else if (Array.isArray(value) && EMPLOYMENT_KEYS.test(key)) {
        const employmentType = normalizeStatedEmploymentType(value);
        if (employmentType) hit.employmentType ??= employmentType;
      } else if (value && typeof value === "object") {
        // hiringOrganization: { name: "..." }
        if (COMPANY_KEYS.test(key) && !hit.companyName) {
          const nested = value as Record<string, unknown>;
          const name = nested.name ?? nested.legalName ?? nested.company_name;
          if (typeof name === "string" && name.trim()) hit.companyName = name.trim().slice(0, 200);
        }
        visit(value, depth + 1);
      }
    }
  };

  visit(root, 0);
  if (bestDesc) hit.description = bestDesc;
  return hit;
}

function hitToExtract(
  hit: WalkHit,
  source?: ListingPageExtract["descriptionSource"]
): ListingPageExtract | null {
  if (!hit.title && !hit.description && !hit.companyName) return null;
  const out: ListingPageExtract = {};
  if (hit.title) out.title = hit.title;
  if (hit.companyName) out.companyName = hit.companyName;
  if (hit.location) out.location = hit.location;
  if (hit.description) {
    out.description = hit.description;
    out.descriptionSource = source;
  }
  if (hit.workMode) {
    out.workMode = hit.workMode;
    out.workModeStated = true;
  } else if (hit.remote) {
    out.workMode = "remote";
    out.workModeStated = true;
  }
  if (hit.employmentType) out.employmentType = hit.employmentType;
  if (hit.department) out.department = hit.department;
  if (hit.datePosted) out.datePosted = hit.datePosted;
  if (hit.hiringRegion) out.hiringRegion = hit.hiringRegion;
  else if (hit.location) {
    const region = normalizeHiringRegion(hit.location);
    if (region) out.hiringRegion = region;
  }
  if (hit.skills && hit.skills.length > 0) out.skills = hit.skills;
  if (hit.closed) out.listingClosed = true;
  return out;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function salaryPeriodFromUnit(value: unknown): SalaryPeriod | null {
  if (typeof value !== "string") return null;
  const compact = value
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "");
  if (
    compact === "year" ||
    compact === "yr" ||
    compact === "annum" ||
    compact === "annual" ||
    compact === "ann" ||
    compact === "years" ||
    compact === "p1y"
  ) {
    return "year";
  }
  if (
    compact === "month" ||
    compact === "mo" ||
    compact === "monthly" ||
    compact === "months" ||
    compact === "p1m"
  ) {
    return "month";
  }
  return null;
}

function applyJsonLdBaseSalary(extract: ListingPageExtract, raw: unknown): void {
  if (raw == null) return;
  if (typeof raw === "string") {
    const salaryRange = raw.trim();
    if (salaryRange) extract.salaryRange = salaryRange.slice(0, 200);
    return;
  }
  if (typeof raw !== "object") return;
  const amount = raw as Record<string, unknown>;
  const nested =
    amount.value && typeof amount.value === "object" && !Array.isArray(amount.value)
      ? (amount.value as Record<string, unknown>)
      : null;
  const salaryMin =
    asFiniteNumber(nested?.minValue) ??
    asFiniteNumber(nested?.value) ??
    asFiniteNumber(amount.minValue) ??
    asFiniteNumber(amount.value);
  const currencyRaw = amount.currency ?? nested?.currency;
  const currency =
    typeof currencyRaw === "string" && currencyRaw.trim() ? currencyRaw.trim().toUpperCase() : null;
  const period =
    salaryPeriodFromUnit(nested?.unitText) ??
    salaryPeriodFromUnit(nested?.duration) ??
    salaryPeriodFromUnit(amount.unitText) ??
    salaryPeriodFromUnit(amount.duration);
  if (salaryMin != null) extract.salaryMin = salaryMin;
  if (currency) extract.salaryCurrency = currency;
  if (period) extract.salaryPeriod = period;
}

/** Parse schema.org JobPosting blocks from application/ld+json scripts. */
export function extractJsonLdJobPostings(html: string): ListingPageExtract | null {
  const blocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  ];
  let best: ListingPageExtract | null = null;
  let bestScore = 0;

  for (const m of blocks) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes: unknown[] = Array.isArray(data)
      ? data
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { "@graph"?: unknown })["@graph"])
        ? ((data as { "@graph": unknown[] })["@graph"] as unknown[])
        : [data];

    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const o = node as Record<string, unknown>;
      const types = Array.isArray(o["@type"])
        ? o["@type"].map(String)
        : typeof o["@type"] === "string"
          ? [o["@type"]]
          : Array.isArray(o["@type"])
            ? o["@type"].filter((x): x is string => typeof x === "string")
            : [];
      if (!types.some((t) => /jobposting/i.test(t))) continue;

      const extract: ListingPageExtract = { descriptionSource: "jsonld" };
      if (typeof o.title === "string" && o.title.trim()) {
        extract.title = o.title.trim().slice(0, 300);
      }
      if (typeof o.description === "string") {
        const d = asPlainDesc(o.description);
        if (d) extract.description = d;
      }
      const org = o.hiringOrganization;
      if (org && typeof org === "object") {
        const name = (org as { name?: unknown }).name;
        if (typeof name === "string" && name.trim()) {
          extract.companyName = name.trim().slice(0, 200);
        }
      }
      if (typeof o.jobLocation === "string") extract.location = o.jobLocation.slice(0, 200);
      else if (o.jobLocation && typeof o.jobLocation === "object") {
        const addr = (o.jobLocation as { address?: unknown }).address;
        if (typeof addr === "string") extract.location = addr.slice(0, 200);
        else if (addr && typeof addr === "object") {
          const a = addr as Record<string, unknown>;
          const parts = [a.addressLocality, a.addressRegion, a.addressCountry]
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim());
          if (parts.length > 0) extract.location = parts.join(", ").slice(0, 200);
        }
      }
      if (o.jobLocationType === "TELECOMMUTE" || o.jobLocationType === "remote") {
        extract.workMode =
          refineWorkModeFromDescription("remote", extract.description ?? "") ?? "remote";
        extract.workModeStated = true;
      }
      const employmentType = normalizeStatedEmploymentType(o.employmentType);
      if (employmentType) extract.employmentType = employmentType;
      const posted = normalizeDatePosted(o.datePosted);
      if (posted) extract.datePosted = posted;
      const occupational =
        typeof o.occupationalCategory === "string" ? o.occupationalCategory.trim() : "";
      if (occupational.length >= 2 && occupational.length <= 80) {
        extract.department = occupational;
      }
      const requirementText = firstPlaceText(o.applicantLocationRequirements);
      if (!extract.location && requirementText) {
        extract.location = requirementText.slice(0, 200);
      }
      const hiringRegion =
        hiringRegionFromPlaces(o.applicantLocationRequirements) ??
        (extract.location ? normalizeHiringRegion(extract.location) : null);
      if (hiringRegion) extract.hiringRegion = hiringRegion;
      const skills = asSkillList(o.skills);
      if (skills.length > 0) extract.skills = skills;
      if (typeof o.validThrough === "string") {
        const through = Date.parse(o.validThrough);
        if (!Number.isNaN(through) && through < Date.now()) extract.listingClosed = true;
      }
      if (o.directApply === true) extract.applyMethod = "external";
      applyJsonLdBaseSalary(extract, o.baseSalary);

      const sc = scoreExtract(extract);
      if (sc > bestScore) {
        bestScore = sc;
        best = applyInferredListingFields(extract);
      }
    }
  }
  return best;
}

/**
 * Yield string arguments of `JSON.parse('…')` / `JSON.parse("…")` in a script body.
 * Handles `\xHH` / `\uXXXX` escapes used by many career-site SPAs.
 */
export function* iterJsonParseStringArgs(script: string): Generator<string> {
  let i = 0;
  while (i < script.length) {
    const idx = script.indexOf("JSON.parse", i);
    if (idx < 0) return;
    let j = idx + "JSON.parse".length;
    while (j < script.length && /\s/.test(script[j]!)) j += 1;
    if (script[j] !== "(") {
      i = idx + 1;
      continue;
    }
    j += 1;
    while (j < script.length && /\s/.test(script[j]!)) j += 1;
    const quote = script[j];
    if (quote !== "'" && quote !== '"') {
      i = idx + 1;
      continue;
    }
    j += 1;
    const start = j;
    // Scan to closing quote with JS-string escape awareness.
    while (j < script.length) {
      const c = script[j]!;
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === quote) break;
      j += 1;
    }
    if (j >= script.length) {
      i = idx + 1;
      continue;
    }
    yield script.slice(start, j);
    i = j + 1;
  }
}

/** Mine inline scripts for embedded job JSON (SPA career sites). */
export function extractEmbeddedJobJson(html: string): ListingPageExtract | null {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)];
  let best: ListingPageExtract | null = null;
  let bestScore = 0;

  for (const m of scripts) {
    const body = m[1];
    if (!body || body.length < 40) continue;
    // Cap pathological script size for walk cost (keep large enough for full JDs).
    const script = body.length > 600_000 ? body.slice(0, 600_000) : body;

    for (const rawArg of iterJsonParseStringArgs(script)) {
      if (rawArg.length < 20) continue;
      let jsonText: string;
      try {
        jsonText = decodeJsStringLiteral(rawArg);
      } catch {
        continue;
      }
      let data: unknown;
      try {
        data = JSON.parse(jsonText);
      } catch {
        continue;
      }
      const hit = walkJsonForJobFields(data);
      const extract = hitToExtract(hit, "embedded_json");
      if (!extract) continue;
      const sc = scoreExtract(extract);
      if (sc > bestScore) {
        bestScore = sc;
        best = extract;
      }
    }

    // Also try bare JSON object/array literals assigned in script (smaller blobs).
    if (script.length < 200_000) {
      for (const lit of script.matchAll(/=\s*(\[[\s\S]{80,}?\]|\{[\s\S]{80,}?\})\s*;/g)) {
        const raw = lit[1];
        if (!raw || raw.length > 150_000) continue;
        try {
          const data = JSON.parse(raw);
          const hit = walkJsonForJobFields(data);
          const extract = hitToExtract(hit, "embedded_json");
          if (!extract) continue;
          const sc = scoreExtract(extract);
          if (sc > bestScore) {
            bestScore = sc;
            best = extract;
          }
        } catch {
          // not pure JSON
        }
      }
    }
  }

  return best;
}

function extractMetaListing(html: string): ListingPageExtract {
  const out: ListingPageExtract = {};
  const ogTitle = metaContent(html, "og:title") ?? metaContent(html, "twitter:title");
  const ogSite = metaContent(html, "og:site_name");
  const ogDesc =
    metaContent(html, "og:description") ??
    metaContent(html, "twitter:description") ??
    metaContent(html, "description");

  if (ogTitle) {
    const hiring = parseHiringPageTitle(ogTitle);
    if (hiring.title) out.title = hiring.title.slice(0, 300);
    if (hiring.companyName) out.companyName = hiring.companyName.slice(0, 200);
    if (hiring.location) out.location = hiring.location.slice(0, 300);
    if (!out.title) {
      // "Company - Role" / "Role | Company"
      const dash = ogTitle.match(/^(.+?)\s+[–—-]\s+(.+?)(?:\s+[–—-]\s+.+)?$/);
      const pipe = ogTitle.match(/^(.+?)\s*\|\s*(.+)$/);
      if (dash) {
        const a = dash[1]!.trim();
        const b = dash[2]!.trim();
        if (/\b(engineer|developer|designer|manager|analyst|lead|intern)\b/i.test(b)) {
          if (!isJobBoardCompanyName(a)) out.companyName = a.slice(0, 200);
          out.title = b.slice(0, 300);
        } else if (/\b(engineer|developer|designer|manager|analyst|lead|intern)\b/i.test(a)) {
          out.title = a.slice(0, 300);
          if (!isJobBoardCompanyName(b)) out.companyName = b.slice(0, 200);
        } else {
          out.title = ogTitle.replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor)\s*$/i, "").slice(0, 300);
        }
      } else if (pipe) {
        out.title = pipe[1]!.trim().slice(0, 300);
        const rhs = pipe[2]!.trim();
        if (!isJobBoardCompanyName(rhs)) out.companyName ??= rhs.slice(0, 200);
      } else {
        out.title = ogTitle.replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor)\s*$/i, "").slice(0, 300);
      }
    }
  }
  if (ogSite && !out.companyName && !isJobBoardCompanyName(ogSite)) {
    out.companyName = ogSite.slice(0, 200);
  }
  if (out.companyName && isJobBoardCompanyName(out.companyName)) {
    delete out.companyName;
  }
  // Keep short meta teasers too — callers use isThinJobDescription on the string.
  // (Previously length > 40 dropped one-liners and left description undefined.)
  if (ogDesc?.trim()) {
    out.description = ogDesc
      .replace(/^Posted\s+[^.]+\.\s*/i, "")
      .replace(/\s*See this and similar jobs on LinkedIn\.?\s*$/i, "")
      .trim()
      .slice(0, 2_000);
    out.descriptionSource = "meta";
  }
  const blob = `${out.description ?? ""} ${out.title ?? ""}`;
  if (/\bremote\b/i.test(blob)) out.workMode = "remote";
  else if (/\bhybrid\b/i.test(blob)) out.workMode = "hybrid";
  return out;
}

/**
 * Readability-based main content (works on classic SSR job pages).
 * Strips job-board chrome (Similar jobs carousels, etc.) before parse so
 * Readability does not treat recommendation lists as the article.
 * Async because @extractus/article-extractor is Promise-based.
 */
export async function extractReadableMainContent(
  html: string,
  pageUrl?: string
): Promise<ListingPageExtract | null> {
  try {
    const cleanedHtml = stripListingChromeFromHtml(html);
    const article = await extractFromHtml(cleanedHtml, pageUrl);
    if (!article) return null;
    const out: ListingPageExtract = { descriptionSource: "readability" };
    if (article.title?.trim()) out.title = article.title.trim().slice(0, 300);
    const contentHtml = article.content ?? "";
    const plain = contentHtml ? stripHtmlToPlainText(contentHtml) : "";
    const cleanedPlain = stripListingChromeFromText(plain);
    const metaDesc = article.description?.trim()
      ? stripListingChromeFromText(article.description.trim())
      : "";
    const desc =
      cleanedPlain.length >= MIN_DESC_CHARS
        ? cleanedPlain.slice(0, MAX_DESC_CHARS)
        : metaDesc.length >= MIN_DESC_CHARS
          ? metaDesc.slice(0, MAX_DESC_CHARS)
          : null;
    if (desc) out.description = desc;
    return out.title || out.description ? out : null;
  } catch {
    return null;
  }
}

/**
 * Sync structured extract: JSON-LD + embedded JSON + meta.
 * Prefer this on hot paths; call {@link enrichListingExtractWithReadability} when async is OK.
 */
export function extractJobListingStructured(
  html: string,
  _listingUrl?: string
): ListingPageExtract {
  let out: ListingPageExtract = {};

  const jsonLd = extractJsonLdJobPostings(html);
  out = mergePreferRicher(out, jsonLd);

  const embedded = extractEmbeddedJobJson(html);
  out = mergePreferRicher(out, embedded);

  const meta = extractMetaListing(html);
  // Meta is weak — only fill gaps (never overwrite a rich embedded description with meta one-liner).
  if (!out.title && meta.title) out.title = meta.title;
  if (!out.companyName && meta.companyName) out.companyName = meta.companyName;
  if (!out.location && meta.location) out.location = meta.location;
  if (!out.workMode && meta.workMode) out.workMode = meta.workMode;
  const metaDesc = stripListingChromeFromText(meta.description?.trim() ?? "");
  const curDesc = out.description?.trim() ?? "";
  if (metaDesc && scoreListingDescription(metaDesc) > scoreListingDescription(curDesc) + 40) {
    out.description = metaDesc;
    out.descriptionSource = "meta";
  } else if (!curDesc && metaDesc) {
    out.description = metaDesc;
    out.descriptionSource = "meta";
  }

  if (out.description) {
    out.description = stripListingChromeFromText(out.description).slice(0, MAX_DESC_CHARS);
  }
  if (!out.department) {
    const department = extractDepartmentFromHtml(html);
    if (department) out.department = department;
  }
  const criteria = extractGuestJobCriteria(html);
  if (criteria.employmentType && !out.employmentType) {
    out.employmentType = criteria.employmentType;
  }
  if (criteria.workMode && !out.workMode) {
    out.workMode = criteria.workMode;
    out.workModeStated = true;
  }
  if (criteria.department && !out.department) out.department = criteria.department;

  return applyInferredListingFields(out);
}

/**
 * Full async extract: structured layers first, then Readability if description still weak.
 * Never lets a chrome-heavy Readability result replace a cleaner shorter body.
 */
export async function extractJobListingFromHtml(
  html: string,
  listingUrl?: string
): Promise<ListingPageExtract> {
  let out = extractJobListingStructured(html, listingUrl);
  const descLen = out.description?.trim().length ?? 0;
  // Skip Readability when structured extract is already a real posting body.
  if (descLen < 400 || scoreListingDescription(out.description) < 200) {
    const readable = await extractReadableMainContent(html, listingUrl);
    if (readable) {
      const nextScore = scoreListingDescription(readable.description);
      const curScore = scoreListingDescription(out.description);
      if (nextScore > curScore + 40) {
        out = mergePreferRicher(out, readable);
      } else {
        // Still take title/company gaps from readability when description is worse.
        if (!out.title && readable.title) out.title = readable.title;
        if (!out.companyName && readable.companyName) out.companyName = readable.companyName;
      }
    }
  }
  if (out.description) {
    out.description = stripListingChromeFromText(out.description).slice(0, MAX_DESC_CHARS);
  }
  return out;
}

/**
 * Prefer the higher-quality description (not merely the longer one).
 */
export function pickBetterListingDescription(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  const aClean = a?.trim() ? stripListingChromeFromText(a.trim()) : "";
  const bClean = b?.trim() ? stripListingChromeFromText(b.trim()) : "";
  if (!aClean && !bClean) return null;
  if (!aClean) return bClean.slice(0, MAX_DESC_CHARS);
  if (!bClean) return aClean.slice(0, MAX_DESC_CHARS);
  return scoreListingDescription(bClean) > scoreListingDescription(aClean) + 40
    ? bClean.slice(0, MAX_DESC_CHARS)
    : aClean.slice(0, MAX_DESC_CHARS);
}
