import { type JobPreference, WorkModeSchema, type WorkMode } from "#@/job-preference/types";

import { scoreCatalogAgainstPreference } from "./cheap-score";
import { decideTwoAxis } from "./two-axis";
import { applyZeroDollarCandidate } from "./zero-dollar";

export type TwoAxisShelfListing = {
  title: string;
  companyName: string;
  location: string | null;
  workMode: string | null;
  hiringRegion: string | null;
  description: string | null;
  skills: readonly string[] | null;
  salaryMin: number | null;
  salaryCurrency: string | null;
};

function asWorkMode(value: string | null | undefined): WorkMode | null {
  const parsed = WorkModeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Cheap title shortlist, then $0 extract + two-axis.
 * Find now sizes ingest off this count — not cheap-only.
 */
export function countTwoAxisPassedUnseen(
  shelf: readonly TwoAxisShelfListing[],
  prefs: JobPreference,
  budget: number
): number {
  if (budget <= 0) return 0;

  let passed = 0;
  for (const listing of shelf) {
    const workMode = asWorkMode(listing.workMode);
    const cheap = scoreCatalogAgainstPreference(
      {
        title: listing.title,
        companyName: listing.companyName,
        location: listing.location,
        workMode,
        skills: listing.skills ? [...listing.skills] : [],
        salaryMin: listing.salaryMin,
        salaryCurrency: listing.salaryCurrency
      },
      prefs
    );
    if (!cheap.passed) continue;

    const candidate = applyZeroDollarCandidate({
      workMode,
      hiringRegion: listing.hiringRegion,
      location: listing.location,
      employmentType: null,
      description: listing.description,
      skills: listing.skills ? [...listing.skills] : []
    });
    const twoAxis = decideTwoAxis({
      workMode: candidate.workMode,
      hiringRegion: candidate.hiringRegion,
      location: candidate.location,
      prefs: { workModes: prefs.workModes, locations: prefs.locations }
    });
    if (twoAxis.action !== "pass") continue;

    passed += 1;
    if (passed >= budget) break;
  }
  return passed;
}
