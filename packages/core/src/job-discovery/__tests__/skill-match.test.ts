import { describe, expect, it } from "vitest";

import { classifyJobSkills } from "#@/job-discovery/skill-match";

describe("classifyJobSkills", () => {
  it("is unavailable when the job lists no skills", () => {
    expect(classifyJobSkills({ jobSkills: [], held: [{ name: "React" }] })).toEqual({
      available: false,
      have: [],
      close: [],
      missing: [],
      percent: null
    });
  });

  it("matches a held name case-insensitively", () => {
    const result = classifyJobSkills({
      jobSkills: ["React", "Go"],
      held: [{ name: "react" }]
    });
    expect(result.have).toEqual(["React"]);
    expect(result.missing).toEqual(["Go"]);
    expect(result.percent).toBe(50);
  });

  it("counts tenant aliases as Have", () => {
    const result = classifyJobSkills({
      jobSkills: ["React.js"],
      held: [{ name: "React", aliases: ["React.js"] }]
    });
    expect(result.have).toEqual(["React.js"]);
    expect(result.close).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("counts canonical aliases as Have", () => {
    const result = classifyJobSkills({
      jobSkills: ["ReactJS"],
      held: [{ name: "React" }]
    });
    expect(result.have).toEqual(["ReactJS"]);
  });

  it("marks JavaScript Close when TypeScript is held", () => {
    const result = classifyJobSkills({
      jobSkills: ["JavaScript"],
      held: [{ name: "TypeScript" }]
    });
    expect(result.have).toEqual([]);
    expect(result.close).toEqual([{ name: "JavaScript", via: "TypeScript" }]);
    expect(result.missing).toEqual([]);
    expect(result.percent).toBe(0);
  });

  it("marks Azure Close when AWS is held", () => {
    const result = classifyJobSkills({
      jobSkills: ["Azure"],
      held: [{ name: "AWS" }]
    });
    expect(result.close).toEqual([{ name: "Azure", via: "AWS" }]);
  });

  it("does not treat Java as JavaScript", () => {
    const result = classifyJobSkills({
      jobSkills: ["Java"],
      held: [{ name: "JavaScript" }]
    });
    expect(result.have).toEqual([]);
    expect(result.close).toEqual([]);
    expect(result.missing).toEqual(["Java"]);
  });

  it("leaves capability phrases in Missing", () => {
    const result = classifyJobSkills({
      jobSkills: ["frontend development"],
      held: [{ name: "React" }]
    });
    expect(result.missing).toEqual(["frontend development"]);
  });
});
