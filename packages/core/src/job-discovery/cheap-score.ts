import { applyPreferenceHardFails } from "#@/job-preference/hard-fails";
import { matchesKeywordPhrase } from "#@/job-preference/phrase-match";
import { type JobPreference } from "#@/job-preference/types";
import { isGarbageCompany, isGarbageJobTitle } from "#@/mail/job-harvest";

import { effectiveRoleKeywords } from "./title-packs";
import { type CheapScoreResult, type NormalizedListing } from "./types";

type CheapListing = Pick<
  NormalizedListing,
  "title" | "companyName" | "location" | "workMode" | "skills" | "salaryMin" | "salaryCurrency"
>;

function includesAny(haystack: string, needles: readonly string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => {
    const k = n.trim().toLowerCase();
    return k.length > 0 && h.includes(k);
  });
}

/**
 * Catalog cheap score on structured fields only (no description / JD HTML).
 * `passed` means eligible to land/rank — never gated on minMatchScore.
 * Work mode and location are not scored here; two-axis is a later gate.
 */
export function scoreCatalogAgainstPreference(
  listing: CheapListing,
  prefs: JobPreference
): CheapScoreResult {
  const reasons: string[] = [];

  if (isGarbageJobTitle(listing.title) || isGarbageCompany(listing.companyName)) {
    return { score: 0, passed: false, reasons: ["invalid title/company"] };
  }

  const hard = applyPreferenceHardFails(
    {
      title: listing.title,
      companyName: listing.companyName,
      location: listing.location,
      description: listing.skills.join(" "),
      salaryMin: listing.salaryMin,
      salaryCurrency: listing.salaryCurrency
    },
    prefs
  );
  if (hard.failed) {
    return { score: 0, passed: false, reasons: hard.reasons };
  }

  const roleKeywords = effectiveRoleKeywords({
    titleId: prefs.titleId,
    roleKeywords: prefs.roleKeywords
  });
  const titleHits = roleKeywords.filter((k) => matchesKeywordPhrase(listing.title, k));

  if (titleHits.length === 0) {
    return { score: 15, passed: false, reasons: ["no role keyword in title"] };
  }

  let score = 40 + Math.min(40, 15 + titleHits.length * 10);
  reasons.push(`title keywords: ${titleHits.slice(0, 3).join(", ")}`);

  // One structured skill bonus: listing.skills vs role keywords or preferred locations
  const skillNeedles = [...roleKeywords, ...prefs.locations];
  if (
    listing.skills.length > 0 &&
    skillNeedles.length > 0 &&
    listing.skills.some((s) => includesAny(s, skillNeedles))
  ) {
    score += 5;
    reasons.push("structured skill hit");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, passed: true, reasons };
}
