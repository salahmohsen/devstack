import { describe, expect, it } from "vitest";

import { statedCatalogPatch } from "#@/lib/job-discovery/hydrate";

const emptyCatalog = {
  workMode: null,
  hiringRegion: null,
  employmentType: null,
  location: null,
  skills: [] as string[]
};

describe("statedCatalogPatch", () => {
  it("writes stated extract fields when catalog values are null", () => {
    expect(
      statedCatalogPatch(emptyCatalog, {
        workMode: "remote",
        workModeStated: true,
        hiringRegion: "latam",
        employmentType: "full_time",
        location: "LatAm",
        skills: ["Go"]
      })
    ).toEqual({
      workMode: "remote",
      hiringRegion: "latam",
      employmentType: "full_time",
      location: "LatAm",
      skills: ["Go"]
    });
  });

  it("never overwrites a non-null ATS workMode with a dictionary guess", () => {
    const patch = statedCatalogPatch(
      {
        workMode: "remote",
        hiringRegion: null,
        employmentType: null,
        location: "LatAm",
        skills: []
      },
      {
        workMode: "hybrid",
        workModeStated: false,
        hiringRegion: "latam",
        employmentType: "full_time",
        location: "Remote — LatAm"
      }
    );

    expect(patch.workMode).toBeUndefined();
    expect(patch.hiringRegion).toBe("latam");
    expect(patch.employmentType).toBe("full_time");
    expect(patch.location).toBeUndefined();
  });

  it("does not persist an unstated workMode guess onto an empty catalog", () => {
    const patch = statedCatalogPatch(emptyCatalog, {
      workMode: "remote",
      workModeStated: false
    });
    expect(patch.workMode).toBeUndefined();
  });
});
