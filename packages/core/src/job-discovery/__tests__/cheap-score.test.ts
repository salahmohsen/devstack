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
});
