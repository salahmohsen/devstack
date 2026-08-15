import { describe, expect, it } from "vitest";

import { scoreCatalogAgainstPreference } from "#@/job-discovery/cheap-score";
import { countTwoAxisPassedUnseen } from "#@/job-discovery/shelf";
import { defaultJobPreference } from "#@/job-preference/utils";

const hybridEgyptPrefs = {
  ...defaultJobPreference(),
  titleId: "frontend" as const,
  workModes: ["hybrid"] as Array<"hybrid">,
  locations: ["egypt"]
};

const remoteOnlyListing = {
  title: "Senior Frontend Engineer",
  companyName: "Acme",
  location: "Remote — US",
  workMode: "remote" as const,
  hiringRegion: "us",
  description: "100% remote. React.",
  skills: ["react"],
  salaryMin: null,
  salaryCurrency: null
};

const hybridCairoListing = {
  title: "Senior Frontend Engineer",
  companyName: "Cairo Co",
  location: "Cairo, Egypt",
  workMode: "hybrid" as const,
  hiringRegion: "egypt",
  description: "Hybrid in Cairo.",
  skills: ["react"],
  salaryMin: null,
  salaryCurrency: null
};

describe("countTwoAxisPassedUnseen", () => {
  it("does not count a remote-only cheap-pass catalog as two-axis unseen for hybrid+Egypt", () => {
    const catalog = [
      remoteOnlyListing,
      {
        ...remoteOnlyListing,
        title: "Frontend Developer",
        companyName: "Remote Labs",
        location: "Remote",
        hiringRegion: "worldwide"
      }
    ];

    expect(scoreCatalogAgainstPreference(remoteOnlyListing, hybridEgyptPrefs).passed).toBe(true);
    expect(countTwoAxisPassedUnseen(catalog, hybridEgyptPrefs, 25)).toBe(0);
  });

  it("counts $0 + two-axis survivors and short-circuits at budget", () => {
    expect(
      countTwoAxisPassedUnseen(
        [remoteOnlyListing, hybridCairoListing, { ...hybridCairoListing, companyName: "Nile" }],
        hybridEgyptPrefs,
        1
      )
    ).toBe(1);
  });
});
