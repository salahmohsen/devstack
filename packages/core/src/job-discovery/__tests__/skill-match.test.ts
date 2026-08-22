import { describe, expect, it } from "vitest";

import { classifyJobSkills, preselectHeldSkillForAlias } from "#@/job-discovery/skill-match";

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

describe("preselectHeldSkillForAlias", () => {
  it("returns null for an empty catalog", () => {
    expect(preselectHeldSkillForAlias("React", [])).toBeNull();
  });

  it("does not preselect JavaScript for Java", () => {
    expect(preselectHeldSkillForAlias("Java", [{ id: "js", name: "JavaScript" }])).toBeNull();
  });

  it("does not preselect TypeScript for Type", () => {
    expect(preselectHeldSkillForAlias("Type", [{ id: "ts", name: "TypeScript" }])).toBeNull();
  });

  it("does not preselect Kubernetes for net", () => {
    expect(preselectHeldSkillForAlias("net", [{ id: "k8s", name: "Kubernetes" }])).toBeNull();
  });

  it("preselects unique canonical React.js / ReactJS onto held React", () => {
    const held = [{ id: "react", name: "React", aliases: [] as const }];
    expect(preselectHeldSkillForAlias("React.js", held)).toBe("react");
    expect(preselectHeldSkillForAlias("ReactJS", held)).toBe("react");
  });

  it("preselects on an exact alias match", () => {
    expect(
      preselectHeldSkillForAlias("Amazon Web Services", [
        { id: "aws", name: "AWS", aliases: ["Amazon Web Services"] }
      ])
    ).toBe("aws");
  });

  it("preselects on an exact name match ignoring case", () => {
    expect(preselectHeldSkillForAlias("go", [{ id: "go", name: "Go" }])).toBe("go");
  });

  it("returns null when two catalog rows collide", () => {
    expect(
      preselectHeldSkillForAlias("ReactJS", [
        { id: "a", name: "React" },
        { id: "b", name: "React.js" }
      ])
    ).toBeNull();
  });
});
