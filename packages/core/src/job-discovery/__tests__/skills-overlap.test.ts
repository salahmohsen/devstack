import { describe, expect, it } from "vitest";

import { skillsOverlap } from "#@/job-discovery/skills-overlap";

describe("skillsOverlap", () => {
  it("is unavailable when the job lists no skills", () => {
    expect(skillsOverlap({ jobSkills: [], stackNames: ["React"] })).toEqual({
      available: false,
      matched: [],
      missing: [],
      percent: null
    });
  });

  it("matches stack names case-insensitively", () => {
    const result = skillsOverlap({
      jobSkills: ["React", "Go", "PostgreSQL"],
      stackNames: ["react", "TypeScript"]
    });
    expect(result.available).toBe(true);
    expect(result.matched).toEqual(["React"]);
    expect(result.missing).toEqual(["Go", "PostgreSQL"]);
    expect(result.percent).toBe(33);
  });

  it("is 100 when every job skill is in stacks", () => {
    expect(skillsOverlap({ jobSkills: ["Go"], stackNames: ["Go", "Rust"] })).toMatchObject({
      available: true,
      percent: 100,
      matched: ["Go"],
      missing: []
    });
  });
});
