import { describe, expect, it } from "vitest";

import {
  countTwoAxisPassedUnseen,
  defaultJobPreference,
  scoreCatalogAgainstPreference
} from "@tsu-stack/core";

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

describe("findNow two-axis shelf", () => {
  it("does not treat a remote-only cheap-pass catalog as two-axis unseen for hybrid+Egypt", () => {
    expect(scoreCatalogAgainstPreference(remoteOnlyListing, hybridEgyptPrefs).passed).toBe(true);
    const twoAxisUnseen = countTwoAxisPassedUnseen([remoteOnlyListing], hybridEgyptPrefs, 25);
    expect(twoAxisUnseen).toBe(0);
    expect(twoAxisUnseen < 25).toBe(true);
  });
});
