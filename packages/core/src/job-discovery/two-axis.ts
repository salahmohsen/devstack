import { WORK_MODES } from "#@/job-preference/constants";
import { type WorkMode } from "#@/job-preference/types";

import { hiringRegionsOverlap, normalizeHiringRegion } from "./hiring-region";

export type TwoAxisWorkMode = WorkMode | null;

export type TwoAxisPrefs = {
  workModes: Array<"remote" | "hybrid" | "onsite">;
  locations: string[];
};

export type TwoAxisInput = {
  workMode: TwoAxisWorkMode;
  hiringRegion: string | null;
  location: string | null;
  prefs: TwoAxisPrefs;
};

export type TwoAxisDecision = {
  action: "pass" | "drop";
  reason: string;
};

function effectiveWorkModes(workModes: readonly string[]): string[] {
  if (workModes.length === 0) return [];
  if (workModes.length === WORK_MODES.length && WORK_MODES.every((m) => workModes.includes(m))) {
    return [];
  }
  return [...workModes];
}

/**
 * Hard filter: work mode + hiring region. Unknown mode always drops.
 * Empty / all-three workModes = no mode filter.
 * Remote + missing hiringRegion → worldwide (pass) when remote is allowed.
 */
export function decideTwoAxis(input: TwoAxisInput): TwoAxisDecision {
  const { workMode, hiringRegion, location, prefs } = input;

  if (workMode == null) {
    return { action: "drop", reason: "unknown work mode" };
  }

  const modes = effectiveWorkModes(prefs.workModes);
  if (modes.length > 0 && !modes.includes(workMode)) {
    return { action: "drop", reason: `work mode ${workMode} not preferred` };
  }

  if (workMode === "onsite" || workMode === "hybrid") {
    if (prefs.locations.length === 0) {
      return { action: "drop", reason: "onsite/hybrid requires preferred locations" };
    }
    if (!hiringRegionsOverlap(prefs.locations, hiringRegion, location)) {
      return { action: "drop", reason: "place does not overlap preferred locations" };
    }
    return { action: "pass", reason: `${workMode} place overlaps` };
  }

  // remote — mode already allowed (empty/all-three, or remote in prefs)
  const region =
    hiringRegion != null && hiringRegion.trim().length > 0 ? hiringRegion.trim() : null;

  // Unknown region: location may still encode a hiring region (e.g. LatAm)
  if (region == null) {
    const locSlug = normalizeHiringRegion(location);
    if (locSlug != null && locSlug !== "worldwide") {
      if (!hiringRegionsOverlap(prefs.locations, locSlug, location)) {
        return { action: "drop", reason: "remote hiring region does not overlap" };
      }
      return { action: "pass", reason: "remote region overlaps" };
    }
    // No region + no known region in location → worldwide
    return { action: "pass", reason: "remote with unknown region (worldwide)" };
  }

  if (!hiringRegionsOverlap(prefs.locations, region, location)) {
    return { action: "drop", reason: "remote hiring region does not overlap" };
  }

  return { action: "pass", reason: "remote region overlaps" };
}
