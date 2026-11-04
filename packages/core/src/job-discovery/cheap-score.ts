import { applyPreferenceHardFails } from "#@/job-preference/hard-fails";
import { matchesKeywordPhrase } from "#@/job-preference/phrase-match";
import { type JobPreferenceOutput, type WorkMode } from "#@/job-preference/types";
import { isGarbageCompany, isGarbageJobTitle } from "#@/mail/job-harvest";

import { type CheapScoreResult } from "./types";
import { applyYearsCap } from "./years-cap";

type CheapListing = {
  title: string;
  companyName: string;
  location: string | null;
  workMode: WorkMode | null;
  skills: readonly string[];
  salaryMin: number | null;
  salaryCurrency: string | null;
  salaryPeriod?: "month" | "year" | "day" | "hour" | null;
  category?: string | null;
  experienceYearsMin?: number | null;
};

/**
 * Role gate for freehire-only discovery: explicit `q` keywords or category
 * chips must be present before a land run may fetch/score.
 */
export function hasValidRoleQuery(input: {
  roleKeywords: readonly string[];
  categories: readonly string[] | null;
}): boolean {
  if (input.roleKeywords.some((keyword) => keyword.trim().length > 0)) return true;
  return (input.categories?.length ?? 0) > 0;
}

/**
 * Catalog cheap score on structured fields only (no description / JD HTML).
 * `passed` means eligible to land/rank — never gated on minMatchScore.
 * Work mode and place are not scored here; two-axis is a later gate, and
 * region/geo matching happens upstream in the freehire query.
 * Callers must run {@link hasValidRoleQuery} first — with empty needles
 * every listing silently fails "no role keyword in title".
 */
export function scoreCatalogAgainstPreference(
  listing: CheapListing,
  prefs: JobPreferenceOutput
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
      salaryMin: listing.salaryPeriod ? listing.salaryMin : null,
      salaryPeriod: listing.salaryPeriod,
      salaryCurrency: listing.salaryCurrency
    },
    prefs
  );
  if (hard.failed) {
    return { score: 0, passed: false, reasons: hard.reasons };
  }

  const roleKeywords = prefs.roleKeywords;
  const needles = roleKeywords.length > 0 ? roleKeywords : (prefs.categories ?? []);
  const titleHits = needles.filter((k) => matchesKeywordPhrase(listing.title, k));

  const categoryHit =
    roleKeywords.length === 0 &&
    listing.category != null &&
    (prefs.categories ?? []).includes(
      listing.category as NonNullable<JobPreferenceOutput["categories"]>[number]
    );
  if (titleHits.length === 0 && !categoryHit) {
    return { score: 15, passed: false, reasons: ["no role keyword in title"] };
  }

  let score = 40 + Math.min(40, 15 + titleHits.length * 10);
  reasons.push(
    categoryHit
      ? `category: ${listing.category}`
      : `title keywords: ${titleHits.slice(0, 3).join(", ")}`
  );

  // One structured skill bonus: listing.skills vs role keywords / categories
  if (
    listing.skills.length > 0 &&
    needles.length > 0 &&
    listing.skills.some((s) => needles.some((n) => matchesKeywordPhrase(s, n)))
  ) {
    score += 5;
    reasons.push("structured skill hit");
  }

  const years = applyYearsCap({
    aiScore: score,
    listingMinYears: listing.experienceYearsMin ?? null,
    seekerYears: prefs.experienceYearsMin
  });
  if (years.capped) reasons.push("years cap");
  score = years.displayScore;

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, passed: true, reasons };
}
