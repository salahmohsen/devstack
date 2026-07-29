import { z } from "zod";

/**
 * Heuristics to link Career Inbox mail → Applications CRM when unlinked.
 * Pure: no DB. Worker loads open apps and calls {@link resolveMailApplicationMatch}.
 */

/** Domains that almost never encode employer identity. */
export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru",
  "zoho.com"
]);

const COMMON_DOMAIN_PREFIXES = ["mail", "email", "jobs", "careers", "hr", "recruiting", "talent"];

/** Collapse company names for equality / containment checks. */
export function normalizeCompanyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return domain.length > 0 ? domain : null;
}

/** Best-effort employer slug from a work email domain. */
export function companyHintFromDomain(domain: string): string | null {
  const host = domain.toLowerCase().replace(/^www\./, "");
  if (FREE_MAIL_DOMAINS.has(host)) return null;

  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;

  // acme.co.uk → acme; mail.acme.com → acme
  let label = parts[0] ?? "";
  if (COMMON_DOMAIN_PREFIXES.includes(label) && parts.length >= 3) {
    label = parts[1] ?? label;
  } else if (parts.length >= 3 && label.length <= 3) {
    // uk.jobs.acme.com style — prefer registrable-ish middle/last brand
    label = parts[parts.length - 2] ?? label;
  }

  if (!label || label.length < 2) return null;
  // Title-case for display
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Pull company + role hints from From / subject (no LLM).
 * Prefer domain brand, then "at Acme", then subject " - Company - Role" patterns.
 */
export function extractMailApplicationHints(input: {
  fromName: string;
  fromEmail: string;
  subject: string;
}): { companyCandidates: string[]; titleHint: string | null } {
  const candidates: string[] = [];
  const seen = new Set<string>();

  function pushCompany(raw: string | null | undefined) {
    const trimmed = raw?.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 120) return;
    const key = normalizeCompanyKey(trimmed);
    if (!key || key.length < 2 || seen.has(key)) return;
    seen.add(key);
    candidates.push(trimmed.replace(/\s+/g, " ").trim());
  }

  const domain = domainFromEmail(input.fromEmail);
  if (domain) pushCompany(companyHintFromDomain(domain));

  const fromName = input.fromName.trim();
  // "Jane Doe via Lever" / "Jane at Acme Recruiting"
  const atMatch = fromName.match(/\bat\s+([A-Za-z0-9][\w .,&'-]{1,80})/i);
  if (atMatch?.[1]) pushCompany(atMatch[1].replace(/\s+(recruiting|talent|careers|hr)\b/i, ""));

  const viaMatch = fromName.match(/\bvia\s+([A-Za-z0-9][\w .,&'-]{1,60})/i);
  if (viaMatch?.[1]) {
    // via Greenhouse etc. — skip known ATS brands as company
    const via = viaMatch[1].trim();
    if (!/^(lever|greenhouse|workday|ashby|smartrecruiters|icims|bamboohr)$/i.test(via)) {
      pushCompany(via);
    }
  }

  const subject = input.subject.trim();
  let titleHint: string | null = null;

  // "Acme Corp — Software Engineer" / "Update from Acme | Backend"
  const dashParts = subject
    .split(/\s*[—–|-]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (dashParts.length >= 2) {
    const first = dashParts[0] ?? "";
    const last = dashParts[dashParts.length - 1] ?? "";
    if (first.length <= 80 && !/^(re|fw|fwd):/i.test(first)) {
      pushCompany(first.replace(/^(update|application|interview|offer)\s+(from|at|for)\s+/i, ""));
    }
    if (last.length >= 2 && last.length <= 120 && !/^(re|fw|fwd)$/i.test(last)) {
      titleHint = last;
    }
  }

  // "for the Software Engineer role" / "Software Engineer position"
  const roleMatch = subject.match(
    /\b(?:for(?:\s+the)?|as(?:\s+a)?)\s+([A-Za-z][\w /+&-]{2,80}?)\s+(?:role|position|opening)\b/i
  );
  if (roleMatch?.[1]) {
    titleHint = roleMatch[1].trim();
  }

  if (!titleHint) {
    const plainRole = subject.match(
      /\b((?:senior|staff|principal|junior|lead)\s+)?([A-Za-z][\w ]{2,40}(?:engineer|developer|designer|manager|analyst))\b/i
    );
    if (plainRole?.[0]) titleHint = plainRole[0].trim();
  }

  return { companyCandidates: candidates, titleHint };
}

export const MailApplicationMatchKindSchema = z.enum([
  "matched_existing",
  "create_new",
  "ambiguous",
  "insufficient_hints"
]);
export type MailApplicationMatchKind = z.infer<typeof MailApplicationMatchKindSchema>;

export type MailApplicationCandidate = {
  id: string;
  companyName: string;
  title: string;
};

export type MailApplicationMatchResult =
  | {
      kind: "matched_existing";
      applicationId: string;
      companyName: string;
      title: string;
      reason: string;
    }
  | {
      kind: "create_new";
      companyName: string;
      title: string;
      reason: string;
    }
  | { kind: "ambiguous"; reason: string; candidateIds: string[] }
  | { kind: "insufficient_hints"; reason: string };

/**
 * Given open applications + mail hints, decide match vs create vs skip.
 * - Exact normalized company → prefer single hit
 * - One containment match (hint in company or company in hint) → match
 * - Multiple → ambiguous (no auto-create)
 * - Zero + usable company hint → create_new
 */
export function resolveMailApplicationMatch(input: {
  openApplications: readonly MailApplicationCandidate[];
  companyCandidates: readonly string[];
  titleHint: string | null;
}): MailApplicationMatchResult {
  const { openApplications, companyCandidates, titleHint } = input;

  if (companyCandidates.length === 0) {
    return { kind: "insufficient_hints", reason: "no_company_hint" };
  }

  const hits: MailApplicationCandidate[] = [];
  const hitIds = new Set<string>();

  for (const company of companyCandidates) {
    const key = normalizeCompanyKey(company);
    if (!key) continue;

    for (const app of openApplications) {
      const appKey = normalizeCompanyKey(app.companyName);
      if (!appKey) continue;
      const exact = appKey === key;
      const contains =
        appKey.includes(key) || key.includes(appKey)
          ? Math.min(appKey.length, key.length) >= 3
          : false;
      if ((exact || contains) && !hitIds.has(app.id)) {
        hitIds.add(app.id);
        hits.push(app);
      }
    }
  }

  if (hits.length === 1) {
    const app = hits[0]!;
    return {
      kind: "matched_existing",
      applicationId: app.id,
      companyName: app.companyName,
      title: app.title,
      reason: "company_match"
    };
  }

  if (hits.length > 1) {
    return {
      kind: "ambiguous",
      reason: "multiple_company_matches",
      candidateIds: hits.map((h) => h.id)
    };
  }

  const companyName = companyCandidates[0]!.trim();
  const title =
    titleHint?.trim() && titleHint.trim().length >= 2
      ? titleHint.trim().slice(0, 200)
      : "Role from email";

  return {
    kind: "create_new",
    companyName: companyName.slice(0, 200),
    title,
    reason: "no_open_match_create"
  };
}
