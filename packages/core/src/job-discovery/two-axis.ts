import { WORK_MODES } from "#@/job-preference/constants";
import { type WorkMode } from "#@/job-preference/types";

import { hiringRegionsOverlap, normalizeHiringRegion } from "./hiring-region";

export type TwoAxisWorkMode = WorkMode | null;

export type TwoAxisPrefs = {
  workModes: Array<"remote" | "hybrid" | "onsite">;
  locations: string[];
  remoteRegions: string[];
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
 * Empty remoteRegions = worldwide remote. Onsite/hybrid never reads remoteRegions.
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
    if (
      !hiringRegionsOverlap(prefs.locations, hiringRegion, location, {
        allowUserWorldwide: false
      })
    ) {
      return { action: "drop", reason: "place does not overlap preferred locations" };
    }
    return { action: "pass", reason: `${workMode} place overlaps` };
  }

  if (modes.length > 0 && !modes.includes("remote")) {
    return { action: "drop", reason: "work mode remote not preferred" };
  }
  if (prefs.remoteRegions.length === 0) {
    return { action: "pass", reason: "remote worldwide" };
  }

  const region =
    hiringRegion != null && hiringRegion.trim().length > 0 ? hiringRegion.trim() : null;
  const locSlug = normalizeHiringRegion(location);
  const listingSlug = region != null ? (normalizeHiringRegion(region) ?? locSlug) : locSlug;

  if (listingSlug == null) {
    return { action: "drop", reason: "remote listing region unknown" };
  }
  if (listingSlug === "worldwide") {
    return { action: "pass", reason: "remote worldwide listing" };
  }
  if (!hiringRegionsOverlap(prefs.remoteRegions, hiringRegion, location)) {
    return { action: "drop", reason: "remote hiring region does not overlap" };
  }

  return { action: "pass", reason: "remote region overlaps" };
}
