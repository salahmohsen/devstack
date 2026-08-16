import { describe, expect, it } from "vitest";

import {
  ProposeApplicationFromJdInputSchema,
  ProposeApplicationFromJdOutputSchema
} from "#@/application/propose-from-jd";

describe("ProposeApplicationFromJdInputSchema", () => {
  it("accepts a minimal valid input", () => {
    const parsed = ProposeApplicationFromJdInputSchema.safeParse({
      title: "Senior Frontend",
      companyName: "Acme",
      description: "Build React apps"
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts required and preferred skill names", () => {
    const parsed = ProposeApplicationFromJdInputSchema.safeParse({
      title: "Senior Frontend",
      companyName: "Acme",
      description: "Build React apps",
      workMode: "hybrid",
      salaryRange: "EGP 80k–120k",
      requiredSkills: ["React", "TypeScript"],
      preferredSkills: ["Vitest"]
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.requiredSkills).toEqual(["React", "TypeScript"]);
    expect(parsed.data?.preferredSkills).toEqual(["Vitest"]);
    expect(parsed.data?.workMode).toBe("hybrid");
  });

  it("rejects empty title", () => {
    const parsed = ProposeApplicationFromJdInputSchema.safeParse({
      title: "",
      companyName: "Acme",
      description: "Build React apps"
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an empty description when a listing url is present", () => {
    const parsed = ProposeApplicationFromJdInputSchema.safeParse({
      title: "Role",
      companyName: "Acme",
      description: "",
      url: "https://www.linkedin.com/jobs/view/4410142951/"
    });
    expect(parsed.success).toBe(true);
  });
});

describe("ProposeApplicationFromJdOutputSchema", () => {
  it("accepts package action without edits", () => {
    const parsed = ProposeApplicationFromJdOutputSchema.safeParse({ action: "package" });
    expect(parsed.success).toBe(true);
  });

  it("accepts save action with partial edits", () => {
    const parsed = ProposeApplicationFromJdOutputSchema.safeParse({
      action: "save",
      edits: { title: "Staff Engineer", companyName: "Acme Corp" }
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown action", () => {
    const parsed = ProposeApplicationFromJdOutputSchema.safeParse({ action: "apply" });
    expect(parsed.success).toBe(false);
  });
});
