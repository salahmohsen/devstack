import { WORK_MODES } from "#@/job-preference/constants";
import { type WorkMode } from "#@/job-preference/types";

import { hiringRegionsOverlap, resolveRemoteListingSlug } from "./hiring-region";

export type TwoAxisWorkMode = WorkMode | null;

/**
 * Callers map the facet-shaped preference onto this shape:
 * `workModes` from `workModes`, `remoteRegions` from `regions`,
 * `locations` from `cities`.
 */
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

function remoteRegionGate(prefs: TwoAxisPrefs): string[] {
  if (prefs.remoteRegions.length > 0) return prefs.remoteRegions;
  return prefs.locations;
}

/**
 * Hard filter: work mode + place.
 * Empty / all-three workModes = no mode filter. Unknown mode always drops.
 * Remote: Remote regions is the gate. Empty list uses Locations only as "where I live"
 * so unrestricted/worldwide remotes keep and US/LatAm-only remotes drop. Both empty = any remote.
 * Hybrid/onsite: Locations are a strict job-place match. Never reads Remote regions.
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
        allowUserWorldwide: false,
        expand: "listing"
      })
    ) {
      return { action: "drop", reason: "place does not overlap preferred locations" };
    }
    return { action: "pass", reason: `${workMode} place overlaps` };
  }

  if (modes.length > 0 && !modes.includes("remote")) {
    return { action: "drop", reason: "work mode remote not preferred" };
  }

  const remoteGate = remoteRegionGate(prefs);
  if (remoteGate.length === 0) {
    return { action: "pass", reason: "remote worldwide" };
  }

  const listing = resolveRemoteListingSlug(hiringRegion, location);
  if (listing.specificUnknown) {
    return { action: "drop", reason: "remote listing place is specific and unknown" };
  }
  const listingSlug = listing.slug;

  if (listingSlug == null) {
    return { action: "drop", reason: "remote listing region unknown" };
  }
  if (listingSlug === "worldwide") {
    return { action: "pass", reason: "remote worldwide listing" };
  }
  if (
    !hiringRegionsOverlap(remoteGate, listingSlug, location, {
      expand: "lineage"
    })
  ) {
    return { action: "drop", reason: "remote hiring region does not overlap" };
  }

  return { action: "pass", reason: "remote region overlaps" };
}

/** Freehire has already normalized place data; avoid losing it to prose parsing. */
export function decideStructuredJobPlace(
  input: TwoAxisInput & {
    regions?: readonly string[];
    countries?: readonly string[];
    cities?: readonly string[];
    preferredCountries?: readonly string[];
  }
): TwoAxisDecision {
  const mode = input.workMode;
  const modes = effectiveWorkModes(input.prefs.workModes);
  if (!mode || (modes.length > 0 && !modes.includes(mode))) return decideTwoAxis(input);
  const normalized = (value: string) => value.trim().toLowerCase();
  if (mode === "remote" && (input.regions?.length ?? 0) > 0) {
    const regions = input.regions!.map(normalized);
    if (regions.includes("global")) return { action: "pass", reason: "remote worldwide listing" };
    const wanted = remoteRegionGate(input.prefs);
    if (wanted.length === 0) {
      return { action: "pass", reason: "remote unrestricted" };
    }
    if (
      regions.some((region) =>
        hiringRegionsOverlap(wanted, region, input.location, { expand: "lineage" })
      )
    ) {
      return { action: "pass", reason: "structured remote region overlaps" };
    }
    return { action: "drop", reason: "structured remote region does not overlap" };
  }
  if (mode !== "remote") {
    const cities = (input.cities ?? []).map(normalized);
    if (input.prefs.locations.some((city) => cities.includes(normalized(city)))) {
      return { action: "pass", reason: "structured city overlaps" };
    }
    const countries = (input.countries ?? []).map(normalized);
    if (input.preferredCountries?.some((country) => countries.includes(normalized(country)))) {
      return { action: "pass", reason: "structured country overlaps" };
    }
  }
  return decideTwoAxis(input);
}
