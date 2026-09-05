import { describe, expect, it } from "vitest";

import { scoreCatalogAgainstPreference } from "#@/job-discovery/cheap-score";
import { countTwoAxisPassedUnseen } from "#@/job-discovery/shelf";
import { defaultJobPreferenceOutput } from "#@/job-preference/utils";

const hybridCairoPrefs = {
  ...defaultJobPreferenceOutput(),
  roleKeywords: ["frontend"],
  workModes: ["hybrid" as const],
  cities: ["Cairo"]
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
  salaryCurrency: null,
  experienceYearsMin: null
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
  salaryCurrency: null,
  experienceYearsMin: null
};

describe("countTwoAxisPassedUnseen", () => {
  it("does not count a remote-only cheap-pass catalog as two-axis unseen for hybrid+Cairo", () => {
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

    expect(scoreCatalogAgainstPreference(remoteOnlyListing, hybridCairoPrefs).passed).toBe(true);
    expect(countTwoAxisPassedUnseen(catalog, hybridCairoPrefs, 25)).toBe(0);
  });

  it("counts $0 + two-axis survivors and short-circuits at budget", () => {
    expect(
      countTwoAxisPassedUnseen(
        [remoteOnlyListing, hybridCairoListing, { ...hybridCairoListing, companyName: "Nile" }],
        hybridCairoPrefs,
        1
      )
    ).toBe(1);
  });

  it("gates remote listings on the regions facet when cities are empty", () => {
    const menaRemotePrefs = {
      ...defaultJobPreferenceOutput(),
      roleKeywords: ["frontend"],
      workModes: ["remote" as const],
      regions: ["mena" as const]
    };
    expect(
      countTwoAxisPassedUnseen(
        [
          { ...remoteOnlyListing, hiringRegion: "latam", location: "LatAm" },
          { ...remoteOnlyListing, hiringRegion: "mena", location: null }
        ],
        menaRemotePrefs,
        25
      )
    ).toBe(1);
  });
});
