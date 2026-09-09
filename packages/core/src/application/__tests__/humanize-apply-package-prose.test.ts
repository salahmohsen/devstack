import { describe, expect, it } from "vitest";

import { assembleApplyPackageDraft } from "#@/application/apply-package";
import {
  humanizeApplyPackageBullets,
  humanizeApplyPackageProse,
  stripAiDashes
} from "#@/application/humanize-apply-package-prose";

describe("stripAiDashes / humanizeApplyPackageProse", () => {
  it("replaces em and en dashes with commas", () => {
    expect(stripAiDashes("React — TypeScript – Next.js")).toBe("React, TypeScript, Next.js");
  });

  it("replaces spaced double hyphens but keeps end-to-end compounds", () => {
    expect(humanizeApplyPackageProse("Shipped end-to-end -- including SSR -- for ops")).toBe(
      "Shipped end-to-end, including SSR, for ops"
    );
  });

  it("cleans bullet lists", () => {
    expect(humanizeApplyPackageBullets(["Built dashboards — React", "  ", "Kept facts"])).toEqual([
      "Built dashboards, React",
      "Kept facts"
    ]);
  });
});

describe("assembleApplyPackageDraft humanizes prose", () => {
  it("strips dashes from summary, letters, and bullets", () => {
    const draft = assembleApplyPackageDraft({
      applicationId: "app1",
      jobContext: {
        title: "FE",
        companyName: "Acme",
        descriptionUsed: "Build things",
        listingFetched: false,
        listingUrl: null
      },
      portfolio: {
        profile: { name: "Sam", email: "sam@example.com", summary: null },
        contacts: [],
        experiences: [
          {
            id: "e1",
            title: "Eng",
            organization: "Co",
            description: "Did work",
            fromDate: null,
            toDate: null,
            isPresent: false
          }
        ],
        projects: [
          {
            id: "p1",
            title: "Hub",
            summary: "s",
            description: "d",
            analysis: null,
            year: 2024
          }
        ],
        stacks: [{ id: "s1", name: "React" }]
      },
      experienceRewrites: [
        { experienceId: "e1", rewrittenBullets: ["Shipped React — TypeScript dashboards"] }
      ],
      projectRewrites: [
        {
          projectId: "p1",
          rewrittenSummary: "Career OS -- typed end-to-end",
          rewrittenBullets: ["Multi-tenant — RBAC"]
        }
      ],
      letters: {
        professionalSummary: "Senior engineer — React focus",
        coverLetterBody: "I am writing — briefly — about fit.",
        outreachSubject: "FE role — Acme",
        outreachBody: "Hi — interested in the role.",
        proposedRecruiterEmail: null,
        headline: "Senior Frontend — Remote"
      }
    });

    expect(draft.professionalSummary).toBe("Senior engineer, React focus");
    expect(draft.headline).toBe("Senior Frontend, Remote");
    expect(draft.coverLetterBody).toBe("I am writing, briefly, about fit.");
    expect(draft.outreachSubject).toBe("FE role, Acme");
    expect(draft.outreachBody).toBe("Hi, interested in the role.");
    expect(draft.experiences[0]?.rewrittenBullets).toEqual([
      "Shipped React, TypeScript dashboards"
    ]);
    expect(draft.projects[0]?.rewrittenSummary).toBe("Career OS, typed end-to-end");
    expect(draft.projects[0]?.rewrittenBullets).toEqual(["Multi-tenant, RBAC"]);
  });
});
