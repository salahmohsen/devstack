import { describe, expect, it } from "vitest";

import {
  decideLandCandidate,
  extraPassCreateLimit,
  selectListingsToLand
} from "#@/lib/job-discovery/land";

describe("selectListingsToLand", () => {
  it("takes the highest cheap scores up to toLand", () => {
    const picked = selectListingsToLand(
      [
        { id: "a", score: 40 },
        { id: "b", score: 80 },
        { id: "c", score: 70 }
      ],
      2
    );
    expect(picked.map((p) => p.id)).toEqual(["b", "c"]);
  });

  it("takes none when the land budget is 0", () => {
    const picked = selectListingsToLand([{ id: "a", score: 90 }], 0);
    expect(picked.map((p) => p.id)).toEqual([]);
  });
});

describe("extraPassCreateLimit", () => {
  it("caps the extra pass at remaining budget, not landed + budget", () => {
    expect(extraPassCreateLimit(2)).toBe(2);
    expect(extraPassCreateLimit(0)).toBe(0);
    expect(extraPassCreateLimit(-3)).toBe(0);
  });
});

describe("decideLandCandidate", () => {
  const egyptRemote = {
    workModes: ["remote"] as Array<"remote" | "hybrid" | "onsite">,
    locations: [] as string[],
    remoteRegions: ["egypt"]
  };

  it("does not return created=true without a two-axis pass", () => {
    expect(
      decideLandCandidate({
        workMode: "remote",
        hiringRegion: "latam",
        location: "LatAm",
        description: null,
        prefs: egyptRemote
      }).created
    ).toBe(false);
    expect(
      decideLandCandidate({
        workMode: null,
        hiringRegion: "worldwide",
        location: null,
        description: null,
        prefs: egyptRemote
      }).created
    ).toBe(false);
    expect(
      decideLandCandidate({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Cairo",
        description: null,
        prefs: egyptRemote
      }).created
    ).toBe(false);
  });

  it("returns created=true only after $0 two-axis pass", () => {
    expect(
      decideLandCandidate({
        workMode: "remote",
        hiringRegion: "mena",
        location: "Cairo",
        description: null,
        prefs: egyptRemote
      }).created
    ).toBe(true);
    expect(
      decideLandCandidate({
        workMode: null,
        hiringRegion: null,
        location: "Remote — MENA",
        description: "100% remote role. Full-time.",
        prefs: egyptRemote
      }).created
    ).toBe(true);
  });
});
