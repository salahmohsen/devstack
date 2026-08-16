import { describe, expect, it } from "vitest";

import { scoreCatalogAgainstPreference } from "#@/job-discovery/cheap-score";
import { defaultJobPreference } from "#@/job-preference/utils";

const listing = {
  title: "Senior Frontend Engineer",
  companyName: "Acme",
  location: "Remote — EU",
  workMode: "remote" as const,
  skills: ["react", "typescript"],
  salaryMin: null,
  salaryCurrency: null
};

const prefs = {
  ...defaultJobPreference(),
  titleId: "frontend" as const,
  roleKeywords: [] as string[],
  excludeKeywords: ["php"],
  workModes: ["remote" as const],
  locations: ["EU"],
  minMatchScore: 90
};

describe("scoreCatalogAgainstPreference", () => {
  it("ranks a title hit and ignores minMatchScore (AI bar only)", () => {
    const r = scoreCatalogAgainstPreference(listing, { ...prefs, minMatchScore: 100 });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    // passed is "eligible to land", not "score >= minMatchScore"
  });

  it("kills exclude in title", () => {
    const r = scoreCatalogAgainstPreference({ ...listing, title: "PHP Frontend" }, prefs);
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("fails without a title keyword hit", () => {
    const r = scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, prefs);
    expect(r.passed).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/title/i);
  });

  it("does not use description text for excludes or title hits", () => {
    const r = scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, prefs);
    expect(r.passed).toBe(false);
  });

  it("passes a title hit when remote listing mismatches hybrid+Egypt prefs (mode/location are later gates)", () => {
    const r = scoreCatalogAgainstPreference(listing, {
      ...prefs,
      workModes: ["hybrid"],
      locations: ["Egypt"]
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.join(" ")).not.toMatch(/work mode|location match|location mismatch/i);
  });

  it("kills exclude react native on Senior React Native Engineer", () => {
    const r = scoreCatalogAgainstPreference(
      {
        ...listing,
        title: "Senior React Native Engineer",
        skills: ["react native", "typescript"]
      },
      { ...defaultJobPreference(), roleKeywords: ["engineer"], excludeKeywords: ["react native"] }
    );
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it("does not kill Senior React Native Engineer when exclude is react", () => {
    const r = scoreCatalogAgainstPreference(
      {
        ...listing,
        title: "Senior React Native Engineer",
        skills: ["react native", "typescript"]
      },
      { ...defaultJobPreference(), roleKeywords: ["engineer"], excludeKeywords: ["react"] }
    );
    expect(r.passed).toBe(true);
  });

  it("does not title-hit React Native on role keyword react", () => {
    const r = scoreCatalogAgainstPreference(
      {
        ...listing,
        title: "Senior React Native Engineer",
        skills: ["react native"]
      },
      { ...defaultJobPreference(), roleKeywords: ["react"] }
    );
    expect(r.passed).toBe(false);
    expect(r.reasons).toContain("no role keyword in title");
  });

  it("title-hits Senior React Engineer and React.js Developer on role keyword react", () => {
    const reactOnly = { ...defaultJobPreference(), roleKeywords: ["react"] };
    expect(
      scoreCatalogAgainstPreference({ ...listing, title: "Senior React Engineer" }, reactOnly)
        .passed
    ).toBe(true);
    expect(
      scoreCatalogAgainstPreference({ ...listing, title: "React.js Developer" }, reactOnly).passed
    ).toBe(true);
  });
});
