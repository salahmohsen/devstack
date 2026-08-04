import { describe, expect, it } from "vitest";

import {
  ApplyPackageDraftSchema,
  isThinJobDescription,
  THIN_JD_DESCRIPTION_CHARS
} from "#@/application/apply-package";

describe("ApplyPackageDraftSchema", () => {
  it("accepts a minimal valid draft", () => {
    const parsed = ApplyPackageDraftSchema.safeParse({
      applicationId: "app1",
      generatedAt: new Date().toISOString(),
      jobContext: {
        title: "FE",
        companyName: "Acme",
        descriptionUsed: "x".repeat(50),
        listingFetched: false
      },
      proposedRecruiterEmail: null,
      professionalSummary: "Summary",
      experiences: [],
      projects: [],
      stacks: [],
      coverLetterBody: "Dear team...",
      outreachSubject: "Application",
      outreachBody: "Hi..."
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a full draft with portfolio selections", () => {
    const parsed = ApplyPackageDraftSchema.safeParse({
      applicationId: "app1",
      generatedAt: "2026-08-04T12:00:00.000Z",
      jobContext: {
        title: "Senior Frontend",
        companyName: "Acme",
        descriptionUsed: "Build React apps",
        listingFetched: true,
        listingUrl: "https://example.com/jobs/1"
      },
      proposedRecruiterEmail: "recruiter@acme.com",
      professionalSummary: "Frontend engineer",
      experiences: [
        {
          experienceId: "exp1",
          include: true,
          companyName: "Prev Co",
          title: "Engineer",
          rewrittenBullets: ["Shipped features"]
        }
      ],
      projects: [
        {
          projectId: "proj1",
          include: true,
          name: "Hub",
          rewrittenSummary: "Career hub",
          rewrittenBullets: ["Built CRM"]
        }
      ],
      stacks: [{ stackId: "st1", include: true, name: "React" }],
      coverLetterBody: "Dear hiring team...",
      outreachSubject: "Application for Senior Frontend",
      outreachBody: "Hi, I am interested...",
      notes: "Emphasize React Native"
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required cover / outreach fields", () => {
    const parsed = ApplyPackageDraftSchema.safeParse({
      applicationId: "app1",
      generatedAt: new Date().toISOString(),
      jobContext: {
        title: "FE",
        companyName: "Acme",
        descriptionUsed: "desc",
        listingFetched: false
      },
      proposedRecruiterEmail: null,
      professionalSummary: null,
      experiences: [],
      projects: [],
      stacks: []
    });
    expect(parsed.success).toBe(false);
  });
});

describe("isThinJobDescription", () => {
  it("exposes thin JD threshold", () => {
    expect(THIN_JD_DESCRIPTION_CHARS).toBe(400);
  });

  it("treats null / undefined / empty as thin", () => {
    expect(isThinJobDescription(null)).toBe(true);
    expect(isThinJobDescription(undefined)).toBe(true);
    expect(isThinJobDescription("")).toBe(true);
    expect(isThinJobDescription("   ")).toBe(true);
  });

  it("is thin when trimmed length is below threshold", () => {
    expect(isThinJobDescription("x".repeat(THIN_JD_DESCRIPTION_CHARS - 1))).toBe(true);
    expect(isThinJobDescription(`  ${"x".repeat(THIN_JD_DESCRIPTION_CHARS - 1)}  `)).toBe(true);
  });

  it("is not thin at or above threshold", () => {
    expect(isThinJobDescription("x".repeat(THIN_JD_DESCRIPTION_CHARS))).toBe(false);
    expect(isThinJobDescription("x".repeat(THIN_JD_DESCRIPTION_CHARS + 50))).toBe(false);
  });
});
