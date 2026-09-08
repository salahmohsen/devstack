import { describe, expect, it } from "vitest";

import { ResumeExtractOutputSchema, ResumeExtractStackSchema } from "./extract-output.schema";

describe("ResumeExtractStackSchema", () => {
  it("coerces bare skill strings into stack objects", () => {
    expect(ResumeExtractStackSchema.parse("React")).toEqual({ name: "React" });
  });

  it("keeps object stacks intact", () => {
    expect(
      ResumeExtractStackSchema.parse({
        name: "TypeScript",
        description: "Primary language",
        type: "language"
      })
    ).toEqual({
      name: "TypeScript",
      description: "Primary language",
      type: "language"
    });
  });
});

describe("ResumeExtractOutputSchema", () => {
  it("accepts stacks as a mix of strings and objects", () => {
    const parsed = ResumeExtractOutputSchema.parse({
      profile: { name: "Ada", email: null, summary: null, contacts: [] },
      experiences: [],
      projects: [],
      stacks: ["React", { name: "Go", type: "language" }, "TypeScript"]
    });

    expect(parsed.stacks).toEqual([
      { name: "React" },
      { name: "Go", type: "language" },
      { name: "TypeScript" }
    ]);
  });

  it("coerces string stacks via Standard Schema validate (Mastra path)", async () => {
    const result = await ResumeExtractOutputSchema["~standard"].validate({
      profile: { name: "Ada", email: null, summary: null, contacts: [] },
      experiences: [],
      projects: [],
      stacks: ["React", "TypeScript", "PostgreSQL", "Node.js", "Go", "Docker"]
    });

    expect("issues" in result ? result.issues : undefined).toBeUndefined();
    if ("issues" in result && result.issues) {
      throw new Error(`expected validation success, got ${JSON.stringify(result.issues)}`);
    }
    expect(result.value.stacks).toEqual([
      { name: "React" },
      { name: "TypeScript" },
      { name: "PostgreSQL" },
      { name: "Node.js" },
      { name: "Go" },
      { name: "Docker" }
    ]);
  });

  it("parses education and certification arrays with defaults", () => {
    const parsed = ResumeExtractOutputSchema.parse({
      profile: { name: "S" },
      educations: [{ school: "Cairo University", degree: "BSc" }],
      certifications: [
        {
          name: "AWS Certified Solutions Architect - Associate",
          issuer: "Amazon Web Services",
          issuedAt: "2025-03"
        }
      ]
    });

    expect(parsed.educations).toHaveLength(1);
    expect(parsed.educations[0]!.isPresent).toBe(false); // default
    expect(parsed.certifications).toHaveLength(1);
    expect(parsed.certifications[0]!.expiresAt).toBeNull(); // default null
    expect(parsed.projects).toEqual([]);
  });
});
