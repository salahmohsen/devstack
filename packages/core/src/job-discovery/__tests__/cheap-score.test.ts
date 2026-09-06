import { describe, expect, it } from "vitest";

import { hasValidRoleQuery, scoreCatalogAgainstPreference } from "#@/job-discovery/cheap-score";
import { defaultJobPreferenceOutput } from "#@/job-preference/utils";

const listing = {
  title: "Senior Frontend Engineer",
  companyName: "Acme",
  location: "Remote — EU",
  workMode: "remote" as const,
  skills: ["react", "typescript"],
  salaryMin: null,
  salaryCurrency: null,
  experienceYearsMin: null
};

const prefs = {
  ...defaultJobPreferenceOutput(),
  roleKeywords: ["frontend", "react"],
  workModes: ["remote" as const],
  salaryMin: null,
  salaryCurrency: null,
  experienceYearsMin: null
};

describe("scoreCatalogAgainstPreference", () => {
  it("ranks a title hit; passed is eligible-to-land, never minMatchScore-gated", () => {
    const r = scoreCatalogAgainstPreference(listing, { ...prefs, minMatchScore: 100 });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.join(" ")).toMatch(/title keywords/i);
  });

  it("kills a garbage title/company", () => {
    expect(
      scoreCatalogAgainstPreference({ ...listing, title: "Job Alert: 5 new roles" }, prefs).passed
    ).toBe(false);
    expect(
      scoreCatalogAgainstPreference({ ...listing, companyName: "LinkedIn" }, prefs).passed
    ).toBe(false);
  });

  it("applies the salary floor only when the stated currency matches", () => {
    const usdFloor = { ...prefs, salaryMin: 4000, salaryCurrency: "USD" };
    const below = scoreCatalogAgainstPreference(
      { ...listing, salaryMin: 24_000, salaryCurrency: "USD" },
      usdFloor
    );
    expect(below.passed).toBe(false);
    expect(below.reasons).toContain("below salary floor");

    const mismatch = scoreCatalogAgainstPreference(
      { ...listing, salaryMin: 24_000, salaryCurrency: "EUR" },
      usdFloor
    );
    expect(mismatch.passed).toBe(true);
  });

  it("title-hits Front End when the keyword is frontend", () => {
    const r = scoreCatalogAgainstPreference(
      { ...listing, title: "Front End Angular Engineer" },
      prefs
    );
    expect(r.passed).toBe(true);
    expect(r.reasons.join(" ")).toMatch(/title keywords/i);
  });

  it("falls back to categories as title needles when roleKeywords are empty", () => {
    const categoryOnly = {
      ...prefs,
      roleKeywords: [],
      categories: ["frontend" as const]
    };
    expect(
      scoreCatalogAgainstPreference(
        { ...listing, title: "Front End Angular Engineer" },
        categoryOnly
      ).passed
    ).toBe(true);
    expect(
      scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, categoryOnly).passed
    ).toBe(false);
  });

  it("fails without a title keyword hit", () => {
    const r = scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, prefs);
    expect(r.passed).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/title/i);
  });

  it("passes a title hit when remote listing mismatches hybrid+cairo prefs (mode/place are later gates)", () => {
    const r = scoreCatalogAgainstPreference(listing, {
      ...prefs,
      workModes: ["hybrid"],
      cities: ["Cairo"]
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.join(" ")).not.toMatch(/work mode|location match|location mismatch/i);
  });

  it("adds the structured skill bonus for role keyword skills", () => {
    const hit = scoreCatalogAgainstPreference(listing, prefs);
    const miss = scoreCatalogAgainstPreference({ ...listing, skills: ["graphql"] }, prefs);
    expect(hit.score).toBeGreaterThan(miss.score);
    expect(hit.reasons).toContain("structured skill hit");
  });

  it("scores the skill bonus for underscored category slugs against normalized skills", () => {
    const categoryOnly = {
      ...prefs,
      roleKeywords: [],
      categories: ["data_engineering" as const]
    };
    const r = scoreCatalogAgainstPreference(
      {
        title: "Senior Data Engineering Manager",
        companyName: "Acme",
        location: "Remote",
        workMode: "remote" as const,
        skills: ["data engineering", "postgres"],
        salaryMin: null,
        salaryCurrency: null,
        experienceYearsMin: null
      },
      categoryOnly
    );
    expect(r.passed).toBe(true);
    expect(r.reasons).toContain("structured skill hit");
  });

  it("caps the score via applyYearsCap when the listing wants more years than the seeker has", () => {
    const noBound = scoreCatalogAgainstPreference(
      { ...listing, title: "Senior Frontend React Engineer", skills: [] },
      prefs
    );
    expect(noBound.score).toBe(75);

    const capped = scoreCatalogAgainstPreference(
      { ...listing, title: "Senior Frontend React Engineer", skills: [], experienceYearsMin: 8 },
      { ...prefs, experienceYearsMin: 3 }
    );
    expect(capped.passed).toBe(true);
    expect(capped.score).toBe(65);
    expect(capped.reasons).toContain("years cap");
  });

  it("does not use description text for title hits", () => {
    const r = scoreCatalogAgainstPreference({ ...listing, title: "Staff Nurse" }, prefs);
    expect(r.passed).toBe(false);
  });
});

describe("hasValidRoleQuery", () => {
  it("is true with a trimmed non-empty roleKeywords entry", () => {
    expect(hasValidRoleQuery({ roleKeywords: ["react"], categories: null })).toBe(true);
    expect(hasValidRoleQuery({ roleKeywords: [" "], categories: null })).toBe(false);
  });

  it("is true with non-empty categories even without keywords", () => {
    expect(hasValidRoleQuery({ roleKeywords: [], categories: ["backend"] })).toBe(true);
  });

  it("is false when both are empty or blank", () => {
    expect(hasValidRoleQuery({ roleKeywords: [], categories: null })).toBe(false);
    expect(hasValidRoleQuery({ roleKeywords: [], categories: [] })).toBe(false);
    expect(hasValidRoleQuery({ roleKeywords: ["  "], categories: [] })).toBe(false);
  });
});
