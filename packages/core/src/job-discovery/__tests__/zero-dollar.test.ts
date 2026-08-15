import { describe, expect, it } from "vitest";

import {
  applyZeroDollarCandidate,
  inferEmploymentFromText,
  inferWorkModeFromText
} from "#@/job-discovery/zero-dollar";

describe("inferWorkModeFromText", () => {
  it("maps remote / hybrid / on-site phrases", () => {
    expect(inferWorkModeFromText("100% remote")).toBe("remote");
    expect(inferWorkModeFromText("Hybrid in Cairo")).toBe("hybrid");
    expect(inferWorkModeFromText("On-site in Berlin")).toBe("onsite");
    expect(inferWorkModeFromText("")).toBe(null);
  });
});

describe("inferEmploymentFromText", () => {
  it("maps full-time and contract", () => {
    expect(inferEmploymentFromText("Full-time role")).toBe("full_time");
    expect(inferEmploymentFromText("This is a contract engagement")).toBe("contract");
  });
});

describe("applyZeroDollarCandidate", () => {
  it("does not invent workMode when no $0 signal exists", () => {
    expect(
      applyZeroDollarCandidate({
        workMode: null,
        hiringRegion: null,
        location: "Cairo",
        employmentType: null,
        description: "Build great products.",
        skills: ["React"]
      }).workMode
    ).toBe(null);
  });

  it("fills mode and region from location + JD without overwriting catalog", () => {
    const filled = applyZeroDollarCandidate({
      workMode: null,
      hiringRegion: null,
      location: "Remote — LatAm",
      employmentType: null,
      description: "Full-time. React.",
      skills: [" React ", ""]
    });
    expect(filled.workMode).toBe("remote");
    expect(filled.hiringRegion).toBe("latam");
    expect(filled.employmentType).toBe("full_time");
    expect(filled.skills).toEqual(["React"]);

    expect(
      applyZeroDollarCandidate({
        workMode: "hybrid",
        hiringRegion: "egypt",
        location: "Remote — LatAm",
        employmentType: "contract",
        description: "100% remote Full-time",
        skills: []
      })
    ).toMatchObject({
      workMode: "hybrid",
      hiringRegion: "egypt",
      employmentType: "contract"
    });
  });
});
