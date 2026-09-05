import { describe, expect, it } from "vitest";

import {
  countTwoAxisPassedUnseen,
  defaultJobPreferenceOutput,
  scoreCatalogAgainstPreference
} from "@tsu-stack/core";

const hybridEgyptPrefs = {
  ...defaultJobPreferenceOutput(),
  workModes: ["hybrid"] as Array<"hybrid">,
  cities: ["egypt"],
  roleKeywords: ["frontend"]
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

describe("findNow two-axis shelf", () => {
  it("does not treat a remote-only cheap-pass shelf row as two-axis unseen for hybrid+Egypt", () => {
    expect(scoreCatalogAgainstPreference(remoteOnlyListing, hybridEgyptPrefs).passed).toBe(true);
    const twoAxisUnseen = countTwoAxisPassedUnseen([remoteOnlyListing], hybridEgyptPrefs, 100);
    expect(twoAxisUnseen).toBe(0);
    expect(twoAxisUnseen < 100).toBe(true);
  });
});
