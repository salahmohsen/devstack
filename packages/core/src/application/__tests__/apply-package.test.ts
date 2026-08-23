import { describe, expect, it } from "vitest";

import {
  APPLY_PACKAGE_REWRITE_CHUNK_SIZE,
  ApplyPackageDraftSchema,
  ApplyPackageExperienceRewriteChunkSchema,
  ApplyPackageProjectRewriteChunkSchema,
  ApplyPackageSummaryAndLettersSchema,
  assembleApplyPackageDraft,
  chunkArray,
  isThinJobDescription,
  SCORER_JOB_DESCRIPTION_CHARS,
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
    expect(parsed.data?.headline).toBe("");
  });

  it("accepts a full draft with experiences, projects, and stacks", () => {
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

  it("lets the scorer read more than a teaser", () => {
    expect(SCORER_JOB_DESCRIPTION_CHARS).toBeGreaterThan(THIN_JD_DESCRIPTION_CHARS);
    expect(SCORER_JOB_DESCRIPTION_CHARS).toBeGreaterThanOrEqual(4_000);
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

  it("is not thin at or above threshold without stub markers", () => {
    expect(isThinJobDescription("x".repeat(THIN_JD_DESCRIPTION_CHARS))).toBe(false);
    expect(isThinJobDescription("x".repeat(THIN_JD_DESCRIPTION_CHARS + 50))).toBe(false);
  });

  it("treats Jack & Jill / sign-in wall harvest stubs as thin", () => {
    expect(
      isThinJobDescription(
        "Senior Front-End Engineer role at Exequt. Remote position with US Eastern Time overlap. The full posting details were unavailable behind the Jack & Jill AI sign-in wall."
      )
    ).toBe(true);
    expect(
      isThinJobDescription(
        "Speak to Jack and Jill and get matched with roles or candidates in a deeply personalised way."
      )
    ).toBe(true);
  });

  it("treats long descriptions that contain stub markers as thin", () => {
    const padded =
      "Senior role overview. ".repeat(30) +
      "The full posting details were unavailable behind the Jack & Jill AI sign-in wall.";
    expect(padded.trim().length).toBeGreaterThanOrEqual(THIN_JD_DESCRIPTION_CHARS);
    expect(isThinJobDescription(padded)).toBe(true);
  });

  it("treats an og:description ellipsis teaser as thin even when long", () => {
    const teaser = `${"Senior Front-End Developer. ".repeat(20)}THIS IS A HYBRID ROL...`;
    expect(teaser.length).toBeGreaterThan(THIN_JD_DESCRIPTION_CHARS);
    expect(isThinJobDescription(teaser)).toBe(true);
  });
});

describe("chunkArray", () => {
  it("chunks by 3", () => {
    expect(chunkArray([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
  it("handles empty", () => {
    expect(chunkArray([], 3)).toEqual([]);
  });
  it("handles fewer than size", () => {
    expect(chunkArray(["a"], 3)).toEqual([["a"]]);
  });
});

describe("rewrite chunk schemas", () => {
  it("accepts experience rewrite chunk", () => {
    const p = ApplyPackageExperienceRewriteChunkSchema.safeParse({
      items: [{ experienceId: "e1", rewrittenBullets: ["Did X"] }]
    });
    expect(p.success).toBe(true);
  });
  it("coerces bare experience array to items object", () => {
    const p = ApplyPackageExperienceRewriteChunkSchema.safeParse([
      { experienceId: "e1", rewrittenBullets: ["Did X"] },
      { experienceId: "e2", rewrittenBullets: ["Did Y"] }
    ]);
    expect(p.success).toBe(true);
    expect(p.data?.items).toHaveLength(2);
    expect(p.data?.items[0]?.experienceId).toBe("e1");
  });
  it("accepts project rewrite chunk", () => {
    const p = ApplyPackageProjectRewriteChunkSchema.safeParse({
      items: [{ projectId: "p1", rewrittenSummary: "App", rewrittenBullets: ["Built"] }]
    });
    expect(p.success).toBe(true);
  });
  it("coerces bare project array to items object", () => {
    const p = ApplyPackageProjectRewriteChunkSchema.safeParse([
      { projectId: "p1", rewrittenSummary: "App" }
    ]);
    expect(p.success).toBe(true);
    expect(p.data?.items[0]?.projectId).toBe("p1");
  });
  it("accepts summary and letters", () => {
    const p = ApplyPackageSummaryAndLettersSchema.safeParse({
      professionalSummary: "x",
      coverLetterBody: "Dear...",
      outreachSubject: "Re:",
      outreachBody: "Hi",
      proposedRecruiterEmail: null
    });
    expect(p.success).toBe(true);
  });

  it("coerces null optional LLM fields (atsVendor, notes, headline) to undefined", () => {
    const p = ApplyPackageSummaryAndLettersSchema.safeParse({
      professionalSummary: "x",
      coverLetterBody: "Dear...",
      outreachSubject: "Re:",
      outreachBody: "Hi",
      proposedRecruiterEmail: null,
      notes: null,
      headline: null,
      keywordDualForms: null,
      jdBuckets: null,
      atsVendor: null
    });
    expect(p.success).toBe(true);
    expect(p.data?.atsVendor).toBeUndefined();
    expect(p.data?.notes).toBeUndefined();
    expect(p.data?.headline).toBeUndefined();
    expect(p.data?.keywordDualForms).toBeUndefined();
    expect(p.data?.jdBuckets).toBeUndefined();
  });
});

describe("APPLY_PACKAGE_REWRITE_CHUNK_SIZE", () => {
  it("is 3", () => {
    expect(APPLY_PACKAGE_REWRITE_CHUNK_SIZE).toBe(3);
  });
});

describe("assembleApplyPackageDraft", () => {
  const portfolio = {
    profile: { name: "Sam" },
    contacts: [],
    experiences: [
      { id: "e1", title: "Eng", organization: "Co", description: "Did work" },
      { id: "e2", title: "Sr", organization: "Co2", description: "More" }
    ],
    projects: [{ id: "p1", title: "Hub", summary: "s", description: "d" }],
    stacks: [{ id: "s1", name: "React" }]
  };

  const jobContext = {
    title: "FE",
    companyName: "Acme",
    descriptionUsed: "Build things",
    listingFetched: false as const,
    listingUrl: null
  };

  it("fills names, include true, snapshot order", () => {
    const draft = assembleApplyPackageDraft({
      applicationId: "app1",
      jobContext,
      portfolio,
      experienceRewrites: [
        { experienceId: "e2", rewrittenBullets: ["B2"] },
        { experienceId: "e1", rewrittenBullets: ["B1"] }
      ],
      projectRewrites: [
        { projectId: "p1", rewrittenSummary: "Tailored hub", rewrittenBullets: ["X"] }
      ],
      letters: {
        professionalSummary: "Sum",
        coverLetterBody: "Cover",
        outreachSubject: "Sub",
        outreachBody: "Body",
        proposedRecruiterEmail: null
      }
    });
    expect(draft.experiences.map((e) => e.experienceId)).toEqual(["e1", "e2"]);
    expect(draft.experiences[0]).toMatchObject({
      companyName: "Co",
      title: "Eng",
      include: true,
      rewrittenBullets: ["B1"]
    });
    expect(draft.stacks).toEqual([{ stackId: "s1", include: true, name: "React" }]);
    expect(draft.jobContext.descriptionUsed).toBe("Build things");
    expect(draft.headline).toBe("");
  });

  it("copies headline from letters when present", () => {
    const draft = assembleApplyPackageDraft({
      applicationId: "app1",
      jobContext,
      portfolio,
      experienceRewrites: [
        { experienceId: "e1", rewrittenBullets: ["B1"] },
        { experienceId: "e2", rewrittenBullets: ["B2"] }
      ],
      projectRewrites: [{ projectId: "p1", rewrittenSummary: "ok" }],
      letters: {
        professionalSummary: null,
        coverLetterBody: "C",
        outreachSubject: "S",
        outreachBody: "B",
        proposedRecruiterEmail: null,
        headline: "Senior Frontend Engineer"
      }
    });
    expect(draft.headline).toBe("Senior Frontend Engineer");
  });

  it("throws if experience rewrite missing", () => {
    expect(() =>
      assembleApplyPackageDraft({
        applicationId: "app1",
        jobContext,
        portfolio,
        experienceRewrites: [{ experienceId: "e1", rewrittenBullets: ["B1"] }],
        projectRewrites: [{ projectId: "p1", rewrittenSummary: "ok" }],
        letters: {
          professionalSummary: null,
          coverLetterBody: "C",
          outreachSubject: "S",
          outreachBody: "B",
          proposedRecruiterEmail: null
        }
      })
    ).toThrow(/missing rewrite for experience e2/i);
  });
});
