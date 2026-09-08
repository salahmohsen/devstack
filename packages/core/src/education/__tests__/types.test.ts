import { describe, expect, it } from "vitest";

import {
  CreateEducationInputSchema,
  EducationOutputSchema,
  UpdateEducationInputSchema
} from "#@/education/types";

describe("education contracts", () => {
  it("accepts a full entry", () => {
    const parsed = CreateEducationInputSchema.safeParse({
      school: "Cairo University",
      degree: "Bachelor of Science",
      field: "Computer Science",
      location: "Cairo, Egypt",
      fromDate: "2015-09",
      toDate: "2019-06",
      isPresent: false,
      description: "Graduated with honors",
      gpa: "3.8/4.0"
    });
    expect(parsed.success).toBe(true);
  });

  it("requires school and degree, allows the rest empty", () => {
    const parsed = CreateEducationInputSchema.safeParse({ school: "X", degree: "BSc" });
    expect(parsed.success).toBe(true);
    expect(CreateEducationInputSchema.safeParse({ school: "X" }).success).toBe(false);
    expect(CreateEducationInputSchema.safeParse({ degree: "BSc" }).success).toBe(false);
  });

  it("update schema is partial", () => {
    expect(UpdateEducationInputSchema.safeParse({ gpa: "3.9/4.0" }).success).toBe(true);
    expect(UpdateEducationInputSchema.safeParse({}).success).toBe(true);
  });

  it("coerces blank and whitespace dates to null", () => {
    const parsed = CreateEducationInputSchema.parse({
      school: "X",
      degree: "BSc",
      fromDate: "",
      toDate: "  "
    });
    expect(parsed.fromDate).toBeNull();
    expect(parsed.toDate).toBeNull();
  });

  it("output schema validates a row shape", () => {
    const parsed = EducationOutputSchema.safeParse({
      id: "e1",
      school: "Cairo University",
      degree: "Bachelor of Science",
      field: null,
      location: null,
      fromDate: null,
      toDate: null,
      isPresent: false,
      description: null,
      gpa: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    expect(parsed.success).toBe(true);
  });
});
