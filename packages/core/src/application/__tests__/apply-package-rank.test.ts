import { describe, expect, it } from "vitest";

import { type ApplyPackageDraft } from "#@/application/apply-package";
import {
  APPLY_PACKAGE_ONE_PAGE_BULLET_BUDGET,
  APPLY_PACKAGE_ONE_PAGE_CHAR_BUDGET,
  rankApplyPackageItems,
  resolveApplyPackagePdfDraft
} from "#@/application/apply-package-rank";

function draft(overrides: Partial<ApplyPackageDraft> = {}): ApplyPackageDraft {
  return {
    applicationId: "app1",
    generatedAt: "2026-08-22T00:00:00.000Z",
    jobContext: {
      title: "Engineer",
      companyName: "Acme",
      descriptionUsed: "React TypeScript",
      listingFetched: false
    },
    proposedRecruiterEmail: null,
    professionalSummary: "Summary",
    headline: "",
    experiences: [],
    projects: [],
    stacks: [],
    coverLetterBody: "Cover",
    outreachSubject: "Sub",
    outreachBody: "Body",
    ...overrides
  };
}

describe("rankApplyPackageItems", () => {
  it("never lists the current role as a hide-candidate", () => {
    const ranked = rankApplyPackageItems({
      now: new Date("2026-08-01T00:00:00.000Z"),
      jobSkills: [{ name: "React" }, { name: "Go" }],
      experiences: [
        {
          experienceId: "current",
          title: "Staff",
          companyName: "Now Co",
          fromDate: "2024-01-01",
          isPresent: true,
          rewrittenBullets: ["Writes Go services"]
        },
        {
          experienceId: "old-react",
          title: "Engineer",
          companyName: "Old Co",
          fromDate: "2016-01-01",
          isPresent: false,
          rewrittenBullets: ["Shipped React apps"]
        },
        {
          experienceId: "mid",
          title: "Engineer",
          companyName: "Mid Co",
          fromDate: "2020-01-01",
          isPresent: false,
          rewrittenBullets: ["Ops work"]
        }
      ],
      projects: [
        {
          projectId: "hub",
          name: "Hub",
          rewrittenSummary: "Career OS in React"
        }
      ]
    });

    expect(ranked.hideCandidateExperienceIds).not.toContain("current");
    expect(ranked.rankedExperienceIds[0]).toBe("current");
    expect(ranked.hideCandidateExperienceIds).toContain("old-react");
    expect(ranked.hideCandidateExperienceIds).toContain("mid");
  });

  it("combines recency and JD overlap, hiding the lowest-scored first", () => {
    const ranked = rankApplyPackageItems({
      now: new Date("2026-08-01T00:00:00.000Z"),
      jobSkills: ["React"],
      experiences: [
        {
          experienceId: "react-old",
          fromDate: "2018-01-01",
          isPresent: false,
          rewrittenBullets: ["Built React dashboards"]
        },
        {
          experienceId: "ops-recent",
          fromDate: "2024-01-01",
          isPresent: false,
          rewrittenBullets: ["On-call rotations"]
        }
      ],
      projects: []
    });
    expect(ranked.hideCandidateExperienceIds[0]).toBe("react-old");
    expect(ranked.rankedExperienceIds).toContain("ops-recent");
  });
});

describe("resolveApplyPackagePdfDraft", () => {
  const longBullet = "x".repeat(Math.ceil(APPLY_PACKAGE_ONE_PAGE_CHAR_BUDGET / 2));

  it("leaves human include flags unchanged when Review is on", () => {
    const source = draft({
      experiences: [
        {
          experienceId: "keep",
          include: true,
          companyName: "Now",
          title: "Staff",
          rewrittenBullets: [longBullet, longBullet, longBullet]
        },
        {
          experienceId: "old",
          include: true,
          companyName: "Old",
          title: "Intern",
          rewrittenBullets: [longBullet, longBullet]
        }
      ]
    });
    const result = resolveApplyPackagePdfDraft({
      draft: source,
      reviewApplyKit: true,
      experiences: [
        {
          experienceId: "keep",
          rewrittenBullets: source.experiences[0]!.rewrittenBullets,
          isPresent: true
        },
        {
          experienceId: "old",
          rewrittenBullets: source.experiences[1]!.rewrittenBullets,
          isPresent: false
        }
      ],
      jobSkills: []
    });
    expect(result.draft.experiences.map((e) => e.include)).toEqual([true, true]);
    expect(result.hiddenExperienceCount).toBe(0);
    expect(result.pageBudget).toBeNull();
  });

  it("keeps a normal multi-item draft on two pages instead of collapsing to one role", () => {
    const prose =
      "Shipped production React TypeScript features across hiring workflows with measurable impact on latency and conversion for enterprise customers worldwide.";
    const bullets = Array.from({ length: 4 }, (_, i) => `${prose} (${i + 1})`);
    const source = draft({
      professionalSummary:
        "Senior engineer with deep React and TypeScript experience building career products end to end for multi-tenant SaaS.",
      headline: "Senior Frontend Engineer",
      experiences: [
        {
          experienceId: "e1",
          include: true,
          companyName: "Now Co",
          title: "Staff Engineer",
          rewrittenBullets: bullets
        },
        {
          experienceId: "e2",
          include: true,
          companyName: "Mid Co",
          title: "Senior Engineer",
          rewrittenBullets: bullets
        },
        {
          experienceId: "e3",
          include: true,
          companyName: "Old Co",
          title: "Engineer",
          rewrittenBullets: bullets
        }
      ],
      projects: [
        {
          projectId: "p1",
          include: true,
          name: "Hub",
          rewrittenSummary: prose,
          rewrittenBullets: bullets.slice(0, 2)
        },
        {
          projectId: "p2",
          include: true,
          name: "Radar",
          rewrittenSummary: prose,
          rewrittenBullets: bullets.slice(0, 2)
        },
        {
          projectId: "p3",
          include: true,
          name: "Inbox",
          rewrittenSummary: prose,
          rewrittenBullets: bullets.slice(0, 2)
        },
        {
          projectId: "p4",
          include: true,
          name: "CRM",
          rewrittenSummary: prose,
          rewrittenBullets: bullets.slice(0, 2)
        }
      ]
    });

    const result = resolveApplyPackagePdfDraft({
      draft: source,
      reviewApplyKit: false,
      experiences: [
        {
          experienceId: "e1",
          rewrittenBullets: bullets,
          fromDate: "2024-01-01",
          isPresent: true
        },
        {
          experienceId: "e2",
          rewrittenBullets: bullets,
          fromDate: "2021-01-01",
          isPresent: false
        },
        {
          experienceId: "e3",
          rewrittenBullets: bullets,
          fromDate: "2018-01-01",
          isPresent: false
        }
      ],
      jobSkills: ["React", "TypeScript"]
    });

    expect(result.draft.experiences.filter((e) => e.include).map((e) => e.experienceId)).toEqual([
      "e1",
      "e2",
      "e3"
    ]);
    expect(result.draft.projects.filter((p) => p.include).map((p) => p.projectId)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4"
    ]);
    expect(result.hiddenExperienceCount).toBe(0);
    expect(result.hiddenProjectCount).toBe(0);
    expect(result.pageBudget).toBe(2);
  });

  it("hides lowest-ranked whole items only when over the two-page budget, never the current role", () => {
    const huge = "x".repeat(APPLY_PACKAGE_ONE_PAGE_CHAR_BUDGET);
    const bullets = Array.from({ length: APPLY_PACKAGE_ONE_PAGE_BULLET_BUDGET }, (_, i) => 
      `Bullet ${i} ${huge}`
    );
    const source = draft({
      experiences: [
        {
          experienceId: "current",
          include: true,
          companyName: "Now",
          title: "Staff",
          rewrittenBullets: bullets
        },
        {
          experienceId: "old",
          include: true,
          companyName: "Old",
          title: "Intern",
          rewrittenBullets: bullets
        }
      ],
      projects: [
        {
          projectId: "side",
          include: true,
          name: "Side",
          rewrittenSummary: huge,
          rewrittenBullets: bullets
        }
      ]
    });
    const result = resolveApplyPackagePdfDraft({
      draft: source,
      reviewApplyKit: false,
      experiences: [
        {
          experienceId: "current",
          rewrittenBullets: bullets,
          fromDate: "2024-01-01",
          isPresent: true
        },
        {
          experienceId: "old",
          rewrittenBullets: bullets,
          fromDate: "2015-01-01",
          isPresent: false
        }
      ],
      jobSkills: []
    });
    const current = result.draft.experiences.find((e) => e.experienceId === "current");
    expect(current?.include).toBe(true);
    expect(result.hiddenExperienceCount + result.hiddenProjectCount).toBeGreaterThan(0);
    expect(result.pageBudget).toBe(2);
  });
});
