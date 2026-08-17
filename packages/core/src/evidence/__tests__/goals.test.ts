import { describe, expect, it } from "vitest";

import { evidenceGoalsReady, missingRequiredEvidenceGoals } from "#@/evidence/goals";

describe("evidenceGoalsReady", () => {
  it("create project missing title is not ready", () => {
    expect(evidenceGoalsReady("project", { summary: "x", year: 2026 })).toBe(false);
    expect(missingRequiredEvidenceGoals("project", { summary: "x", year: 2026 })).toEqual([
      "title"
    ]);
  });

  it("edit project with title + summary + year is ready", () => {
    expect(evidenceGoalsReady("project", { title: "Dev-Hub", summary: "ops", year: 2026 })).toBe(
      true
    );
  });

  it("stack name only is ready", () => {
    expect(evidenceGoalsReady("stack", { name: "React" })).toBe(true);
  });

  it("experience needs title, organization, description", () => {
    expect(evidenceGoalsReady("experience", { title: "FE", organization: "RAYA" })).toBe(false);
    expect(
      evidenceGoalsReady("experience", {
        title: "FE",
        organization: "RAYA",
        description: "Shipped hub"
      })
    ).toBe(true);
  });
});
