import { describe, expect, it } from "vitest";

import { type ApplyPackageDraft } from "@tsu-stack/core";

import {
  applyPackageDraftToResumePdfInput,
  buildApplyPackageDocPreview,
  keptApplyPackageRows,
  type ApplyPackageLiveRows
} from "./apply-doc-preview-model";

/** Review ON (resolver passthrough) — gate-focused tests stay budget-free. */
const OPTIONS = { reviewApplyKit: true, jobSkills: [] as Array<{ name: string }> };

function makeDraft(overrides: Partial<ApplyPackageDraft> = {}): ApplyPackageDraft {
  return {
    applicationId: "app-1",
    generatedAt: "2026-09-09T00:00:00.000Z",
    jobContext: {
      title: "Senior Engineer",
      companyName: "Acme",
      descriptionUsed: "Build things",
      listingFetched: false
    },
    proposedRecruiterEmail: null,
    professionalSummary: "Tailored summary",
    headline: "Senior TypeScript Engineer",
    // Stale identity on purpose: draft carries old names, live rows must win.
    experiences: [
      {
        experienceId: "exp-1",
        include: true,
        companyName: "Old Co",
        title: "Old title",
        rewrittenBullets: ["Rewrote the hub", "Cut p95 in half"]
      },
      {
        experienceId: "exp-2",
        include: true,
        companyName: "Early Co",
        title: "Older title",
        rewrittenBullets: ["Kept earlier win"]
      },
      {
        experienceId: "exp-3",
        include: true,
        companyName: "No Entry",
        title: "Hidden role",
        rewrittenBullets: ["Should not render"]
      }
    ],
    projects: [
      {
        projectId: "proj-1",
        include: true,
        name: "Omen-old",
        rewrittenSummary: "Tailored agent paragraph",
        rewrittenBullets: ["Agent rewrite"]
      },
      {
        projectId: "proj-2",
        include: true,
        name: "Old thing",
        rewrittenSummary: "Archived rewrite"
      }
    ],
    stacks: [
      { stackId: "stack-1", include: true, name: "TS-old-name" },
      { stackId: "stack-2", include: false, name: "React" }
    ],
    coverLetterBody: "Hello",
    outreachSubject: "Hi",
    outreachBody: "Body",
    ...overrides
  };
}

function makeLive(overrides: Partial<ApplyPackageLiveRows> = {}): ApplyPackageLiveRows {
  return {
    profile: { name: "Salah Mohsen", email: "salah@example.com", summary: "Full-stack engineer" },
    contacts: [
      { type: "email", value: "salah@example.com", sortOrder: 0, includedInPortfolio: true },
      { type: "github", value: "salah", sortOrder: 1, includedInPortfolio: false }
    ],
    experiences: [
      {
        id: "exp-1",
        title: "Senior Engineer",
        organization: "Devhub",
        fromDate: "2024-01-01",
        toDate: null,
        isPresent: true,
        description: "<p>Shipped the hub</p>",
        portfolioEntryId: "pe-1"
      },
      {
        id: "exp-2",
        title: "Engineer",
        organization: "Early Co",
        fromDate: "2022-01-01",
        toDate: "2023-12-31",
        isPresent: false,
        description: "<p>Earlier role</p>",
        portfolioEntryId: "pe-2"
      },
      {
        id: "exp-3",
        title: "Hidden role",
        organization: "No Entry",
        fromDate: null,
        toDate: null,
        isPresent: false,
        description: "<p>Never rendered</p>",
        portfolioEntryId: null
      }
    ],
    projects: [
      {
        id: "proj-1",
        title: "Omen",
        summary: "Agent helper",
        description: "<p>Built an agent</p>",
        demoUrl: null,
        isArchived: false,
        portfolioEntryId: "pp-1",
        stacks: [
          { name: "Mastra", type: "ai", portfolioEntryId: "ps-1", isFeatured: true, sortOrder: 0 }
        ]
      },
      {
        id: "proj-2",
        title: "Old thing",
        summary: "Archived",
        description: "",
        demoUrl: null,
        isArchived: true,
        portfolioEntryId: "pp-2",
        stacks: []
      }
    ],
    stacks: [
      { id: "stack-1", name: "TypeScript", type: "language", sortOrder: 0, isFeatured: true },
      { id: "stack-2", name: "React", type: "ui", sortOrder: 1, isFeatured: false }
    ],
    educations: [
      {
        school: "Cairo University",
        degree: "BSc",
        field: "Computer Science",
        location: "Cairo",
        fromDate: "2015-09",
        toDate: "2019-06",
        isPresent: false,
        description: null,
        gpa: null
      }
    ],
    certifications: [
      {
        name: "AWS SAA",
        issuer: "Amazon",
        issuedAt: "2023-05-01",
        expiresAt: null,
        credentialUrl: null,
        description: null
      }
    ],
    ...overrides
  };
}

function section(model: ReturnType<typeof buildApplyPackageDocPreview>["model"], id: string) {
  return model.sections.find((s) => s.id === id);
}

function pdfInput(draft: ApplyPackageDraft = makeDraft(), live: ApplyPackageLiveRows = makeLive()) {
  return applyPackageDraftToResumePdfInput({
    resolvedDraft: draft,
    kept: keptApplyPackageRows(draft, live),
    live
  });
}

describe("keptApplyPackageRows", () => {
  it("keeps only include && portfolioEntryId rows; archived projects excluded", () => {
    const kept = keptApplyPackageRows(makeDraft(), makeLive());

    expect(kept.experiences.map((keptExp) => keptExp.draftRow.experienceId)).toEqual([
      "exp-1",
      "exp-2"
    ]);
    expect(kept.projects.map((keptProj) => keptProj.draftRow.projectId)).toEqual(["proj-1"]);
  });
});

describe("applyPackageDraftToResumePdfInput", () => {
  it("mirrors accept gates: only kept rows land in the portfolio", () => {
    const input = pdfInput();

    expect(input.portfolio.experiences.map((exp) => exp.organization)).toEqual([
      "Devhub",
      "Early Co"
    ]);
    expect(input.portfolio.projects.map((proj) => proj.title)).toEqual(["Omen"]);
    expect(input.portfolio.stacks).toHaveLength(1);
  });

  it("rewritten text from the draft wins; identity from live rows", () => {
    const input = pdfInput();

    expect(input.portfolio.experiences[0]).toMatchObject({
      organization: "Devhub",
      title: "Senior Engineer",
      fromDate: "2024-01-01",
      isPresent: true,
      includedInPortfolio: true,
      bullets: ["Rewrote the hub", "Cut p95 in half"]
    });
    // Stale draft identity must never leak onto the paper.
    expect(JSON.stringify(input.portfolio.experiences)).not.toContain("Old Co");
    expect(JSON.stringify(input.portfolio.experiences)).not.toContain("Old title");

    expect(input.portfolio.projects[0]).toMatchObject({
      title: "Omen",
      summary: "Tailored agent paragraph",
      isArchived: false,
      includedInPortfolio: true,
      bullets: ["Agent rewrite"]
    });
    expect(JSON.stringify(input.portfolio.projects)).not.toContain("Omen-old");

    // Project stacks: identity from live join rows, included = portfolio entry.
    expect(input.portfolio.projects[0]?.stacks).toEqual([
      { name: "Mastra", type: "ai", includedInPortfolio: true, isFeatured: true, sortOrder: 0 }
    ]);
  });

  it("falls back to live summary when rewritten summary is empty", () => {
    const draft = makeDraft({
      projects: [
        { projectId: "proj-1", include: true, name: "Omen-old", rewrittenSummary: "" },
        { projectId: "proj-2", include: false, name: "Old thing", rewrittenSummary: "Archived" }
      ]
    });
    const input = pdfInput(draft);

    expect(input.portfolio.projects[0]?.summary).toBe("Agent helper");
  });

  it("live stack names/types win over draft names; included stacks only", () => {
    const input = pdfInput();

    expect(input.portfolio.stacks).toEqual([
      {
        name: "TypeScript",
        type: "language",
        includedInPortfolio: true,
        isFeatured: true,
        sortOrder: 0
      }
    ]);
    expect(JSON.stringify(input.portfolio.stacks)).not.toContain("TS-old-name");
  });

  it("contacts come from opted-in live rows only", () => {
    const input = pdfInput();

    expect(input.portfolio.contacts).toEqual([
      { type: "email", value: "salah@example.com", sortOrder: 0 }
    ]);
  });

  it("educations and certifications include-when-present (all live rows)", () => {
    const input = pdfInput();

    expect(input.portfolio.educations).toEqual([
      {
        school: "Cairo University",
        degree: "BSc",
        field: "Computer Science",
        location: "Cairo",
        fromDate: "2015-09",
        toDate: "2019-06",
        isPresent: false,
        description: null,
        gpa: null
      }
    ]);
    expect(input.portfolio.certifications).toEqual([
      {
        name: "AWS SAA",
        issuer: "Amazon",
        issuedAt: "2023-05-01",
        expiresAt: null,
        credentialUrl: null,
        description: null
      }
    ]);
  });

  it("headline: trimmed non-empty draft headline passed top-level (not in profile)", () => {
    const input = pdfInput();

    expect(input.headline).toBe("Senior TypeScript Engineer");
    expect(input.profile).toEqual({ name: "Salah Mohsen", email: "salah@example.com" });
  });

  it("headline: empty/blank draft headline omits the field (mapper falls back)", () => {
    const input = pdfInput(makeDraft({ headline: "   " }));

    expect(input.headline).toBeUndefined();
  });
});

describe("buildApplyPackageDocPreview", () => {
  it("renders the tailored paper: rewritten bullets, live identity, headline", () => {
    const { model } = buildApplyPackageDocPreview(makeDraft(), makeLive(), OPTIONS);

    expect(model.name).toBe("Salah Mohsen");
    expect(model.headline).toBe("Senior TypeScript Engineer");

    const experience = section(model, "experience");
    expect(experience?.count).toBe(2);
    expect(experience?.experience?.[0]).toMatchObject({
      clientId: "exp-1",
      company: "Devhub",
      position: "Senior Engineer",
      highlights: ["Rewrote the hub", "Cut p95 in half"]
    });
    expect(experience?.experience?.[1]).toMatchObject({ clientId: "exp-2" });

    const projects = section(model, "projects");
    expect(projects?.count).toBe(1);
    expect(projects?.projects?.[0]).toMatchObject({ clientId: "proj-1" });
    expect(JSON.stringify(projects?.projects?.[0])).toContain("Agent rewrite");
  });

  it("headline falls back to the latest included experience title when blank", () => {
    const { model } = buildApplyPackageDocPreview(makeDraft({ headline: "" }), makeLive(), OPTIONS);

    expect(model.headline).toBe("Senior Engineer");
  });

  it("educations and certifications render (include-when-present)", () => {
    const { model } = buildApplyPackageDocPreview(makeDraft(), makeLive(), OPTIONS);

    const education = section(model, "education");
    expect(education?.present).toBe(true);
    expect(education?.count).toBe(1);
    expect(education?.education?.[0]).toMatchObject({
      institution: "Cairo University",
      studyType: "BSc"
    });

    const certifications = section(model, "certifications");
    expect(certifications?.present).toBe(true);
    expect(certifications?.count).toBe(1);
    expect(certifications?.certifications?.[0]).toMatchObject({
      text: "AWS SAA — Amazon, May 2023"
    });
  });

  it("evidence map: kept rows with live text; dropped rows excluded", () => {
    const { evidenceByClientId } = buildApplyPackageDocPreview(makeDraft(), makeLive(), OPTIONS);

    expect(evidenceByClientId).toEqual({
      "exp-1": "<p>Shipped the hub</p>",
      "exp-2": "<p>Earlier role</p>",
      "proj-1": "Agent helper\n<p>Built an agent</p>"
    });
  });

  it("project summary rides the zip: rewritten summary wins over live", () => {
    const { model } = buildApplyPackageDocPreview(makeDraft(), makeLive(), OPTIONS);

    const projects = section(model, "projects");
    expect(projects?.count).toBe(1);
    expect(projects?.projects?.[0]).toMatchObject({
      clientId: "proj-1",
      summary: "Tailored agent paragraph"
    });
  });

  it("project summary falls back to live summary when the rewrite is empty (model zip)", () => {
    const draft = makeDraft({
      projects: [{ projectId: "proj-1", include: true, name: "Omen-old", rewrittenSummary: "" }]
    });
    const { model } = buildApplyPackageDocPreview(draft, makeLive(), OPTIONS);

    expect(section(model, "projects")?.projects?.[0]).toMatchObject({
      clientId: "proj-1",
      summary: "Agent helper"
    });
  });

  it("dropped first row does not misalign the zip: second included row keeps its own id/evidence", () => {
    const live = makeLive();
    // First INCLUDED draft row (exp-1) loses its portfolio entry — accept would drop it.
    live.experiences[0] = { ...live.experiences[0]!, portfolioEntryId: null };
    const { model, evidenceByClientId } = buildApplyPackageDocPreview(makeDraft(), live, OPTIONS);

    const experience = section(model, "experience");
    expect(experience?.count).toBe(1);
    expect(experience?.experience?.[0]).toMatchObject({
      clientId: "exp-2",
      company: "Early Co",
      position: "Engineer"
    });
    expect(Object.keys(evidenceByClientId)).not.toContain("exp-1");
    expect(evidenceByClientId["exp-2"]).toBe("<p>Earlier role</p>");
  });

  it("dropped first project does not misalign the zip: second kept project keeps its own summary", () => {
    const live = makeLive();
    // First INCLUDED draft project loses its portfolio entry; the archived
    // proj-2 becomes renderable so the zip has a second row to pair.
    live.projects[0] = { ...live.projects[0]!, portfolioEntryId: null };
    live.projects[1] = { ...live.projects[1]!, isArchived: false };
    const { model, evidenceByClientId } = buildApplyPackageDocPreview(makeDraft(), live, OPTIONS);

    const projects = section(model, "projects");
    expect(projects?.count).toBe(1);
    // Draft pairing, not a live fallback: proj-2's rewrite must land on proj-2.
    expect(projects?.projects?.[0]).toMatchObject({
      clientId: "proj-2",
      summary: "Archived rewrite"
    });
    expect(evidenceByClientId["proj-2"]).toBe("Archived");
  });

  it("kept row with empty live text gets no evidence entry", () => {
    const live = makeLive();
    live.experiences[1] = { ...live.experiences[1]!, description: "" };
    const { evidenceByClientId } = buildApplyPackageDocPreview(makeDraft(), live, OPTIONS);

    expect(evidenceByClientId["exp-2"]).toBeUndefined();
    expect(evidenceByClientId["exp-1"]).toBe("<p>Shipped the hub</p>");
  });

  it("experience with include:false is absent from sections and evidence", () => {
    const draft = makeDraft({
      experiences: [
        { ...makeDraft().experiences[0]!, include: false },
        { ...makeDraft().experiences[1]!, include: true }
      ]
    });
    const { model, evidenceByClientId } = buildApplyPackageDocPreview(draft, makeLive(), OPTIONS);

    const experience = section(model, "experience");
    expect(experience?.count).toBe(1);
    expect(experience?.experience?.[0]?.clientId).toBe("exp-2");
    expect(evidenceByClientId["exp-1"]).toBeUndefined();
  });

  it("draft row referencing a deleted live experience is absent", () => {
    const draft = makeDraft({
      experiences: [
        {
          experienceId: "exp-deleted",
          include: true,
          companyName: "Ghost Co",
          title: "Gone",
          rewrittenBullets: ["Orphan"]
        },
        {
          experienceId: "exp-1",
          include: true,
          companyName: "Old Co",
          title: "Old title",
          rewrittenBullets: ["Rewrote the hub"]
        }
      ]
    });
    const { model, evidenceByClientId } = buildApplyPackageDocPreview(draft, makeLive(), OPTIONS);

    const experience = section(model, "experience");
    expect(experience?.count).toBe(1);
    expect(experience?.experience?.[0]?.clientId).toBe("exp-1");
    expect(evidenceByClientId["exp-deleted"]).toBeUndefined();
  });

  it("project with empty summary and description has no evidence entry", () => {
    const live = makeLive();
    live.projects[0] = { ...live.projects[0]!, summary: "", description: "" };
    const draft = makeDraft({
      projects: [{ projectId: "proj-1", include: true, name: "Omen-old", rewrittenSummary: "" }]
    });
    const { model, evidenceByClientId } = buildApplyPackageDocPreview(draft, live, OPTIONS);

    expect(section(model, "projects")?.count).toBe(1);
    expect(evidenceByClientId["proj-1"]).toBeUndefined();
  });

  // Body budget math (TWO_PAGE = 6400 chars): 6250 filler summary + 26 headline
  // + exp-1 (45) + exp-2 (35) + proj-1 (45) = 6401 chars → over budget by 1.
  // Hiding exp-2 (35 chars) brings it back under; exp-1 is `isPresent` so it is
  // never a hide candidate, and proj-1 only hides after experiences run out.
  function makeBudgetDraft(): ApplyPackageDraft {
    return makeDraft({
      professionalSummary: "x".repeat(6250),
      experiences: [
        {
          experienceId: "exp-1",
          include: true,
          companyName: "Old Co",
          title: "Old title",
          rewrittenBullets: ["Rewrote the hub", "Cut p95 in half"]
        },
        {
          experienceId: "exp-2",
          include: true,
          companyName: "Early Co",
          title: "Older title",
          rewrittenBullets: ["Kept earlier win"]
        }
      ],
      projects: [
        {
          projectId: "proj-1",
          include: true,
          name: "Omen-old",
          rewrittenSummary: "Tailored agent paragraph",
          rewrittenBullets: ["Agent rewrite"]
        }
      ]
    });
  }

  it("review OFF mirrors page-budget hiding: hidden row absent from sections and evidence", () => {
    const preview = buildApplyPackageDocPreview(makeBudgetDraft(), makeLive(), {
      reviewApplyKit: false,
      jobSkills: []
    });

    const experience = section(preview.model, "experience");
    expect(experience?.count).toBe(1);
    expect(experience?.experience?.map((entry) => entry.clientId)).toEqual(["exp-1"]);
    expect(experience?.experience?.[0]?.highlights).toEqual(["Rewrote the hub", "Cut p95 in half"]);

    expect(Object.keys(preview.evidenceByClientId)).not.toContain("exp-2");
    expect(preview.evidenceByClientId["exp-1"]).toBe("<p>Shipped the hub</p>");

    // Projects were never hidden (only 1 char over, experiences hide first).
    expect(section(preview.model, "projects")?.count).toBe(1);

    expect(preview.hiddenExperienceCount).toBe(1);
    expect(preview.hiddenProjectCount).toBe(0);
    expect(preview.pageBudget).toBe(2);
  });

  it("review ON renders the same over-budget draft fully (human include flags win)", () => {
    const preview = buildApplyPackageDocPreview(makeBudgetDraft(), makeLive(), OPTIONS);

    const experience = section(preview.model, "experience");
    expect(experience?.count).toBe(2);
    expect(experience?.experience?.map((entry) => entry.clientId)).toEqual(["exp-1", "exp-2"]);
    expect(preview.evidenceByClientId["exp-2"]).toBe("<p>Earlier role</p>");
    expect(preview.hiddenExperienceCount).toBe(0);
    expect(preview.pageBudget).toBeNull();
  });

  it("sparse draft (nothing included) renders an empty paper", () => {
    const draft = makeDraft({
      professionalSummary: null,
      headline: "",
      experiences: [],
      projects: [],
      stacks: []
    });
    const live = makeLive({
      profile: { name: "Salah Mohsen", email: "salah@example.com", summary: null },
      educations: [],
      certifications: [],
      contacts: [
        { type: "email", value: "salah@example.com", sortOrder: 0, includedInPortfolio: true }
      ]
    });
    const { model } = buildApplyPackageDocPreview(draft, live, OPTIONS);

    expect(model.headline).toBeNull();
    for (const s of model.sections) {
      expect(s.present).toBe(false);
      expect(s.count).toBe(0);
    }
  });

  describe("excluded-item stubs", () => {
    it("include:false rows with kept-capable live rows appear as stubs; others do not", () => {
      const draft = makeDraft({
        experiences: [
          { ...makeDraft().experiences[0]!, include: false },
          { ...makeDraft().experiences[1]!, include: true },
          // include:false but no portfolioEntryId → not toggleable, no stub.
          { ...makeDraft().experiences[2]!, include: false }
        ],
        projects: [
          {
            projectId: "proj-1",
            include: true,
            name: "Omen-old",
            rewrittenSummary: "Tailored agent paragraph",
            rewrittenBullets: ["Agent rewrite"]
          },
          { projectId: "proj-2", include: false, name: "Old thing", rewrittenSummary: "Archived" }
        ],
        stacks: [
          { stackId: "stack-1", include: true, name: "TS-old-name" },
          // Live name wins over the stale draft name in the stub chip.
          { stackId: "stack-2", include: false, name: "React-old" },
          { stackId: "stack-ghost", include: false, name: "Ghost" }
        ]
      });
      const live = makeLive();
      live.projects[1] = { ...live.projects[1]!, isArchived: false };
      const { model } = buildApplyPackageDocPreview(draft, live, OPTIONS);

      const experience = section(model, "experience");
      expect(experience?.count).toBe(1);
      expect(experience?.excluded).toEqual([
        { clientId: "exp-1", label: "Senior Engineer, Devhub" }
      ]);

      const projects = section(model, "projects");
      expect(projects?.count).toBe(1);
      expect(projects?.excluded).toEqual([{ clientId: "proj-2", label: "Old thing" }]);

      const skills = section(model, "skills");
      expect(skills?.excludedSkills).toEqual(["React"]);
    });

    it("archived project with include:false is not a stub (never renders even re-included)", () => {
      const draft = makeDraft({
        projects: [
          {
            projectId: "proj-1",
            include: true,
            name: "Omen-old",
            rewrittenSummary: "Tailored agent paragraph",
            rewrittenBullets: ["Agent rewrite"]
          },
          { projectId: "proj-2", include: false, name: "Old thing", rewrittenSummary: "Archived" }
        ]
      });
      const { model } = buildApplyPackageDocPreview(draft, makeLive(), OPTIONS);

      expect(section(model, "projects")?.excluded).toEqual([]);
    });

    it("section with only excluded rows stays absent but carries the stubs", () => {
      const draft = makeDraft({
        experiences: [{ ...makeDraft().experiences[0]!, include: false }],
        projects: []
      });
      const { model } = buildApplyPackageDocPreview(draft, makeLive(), OPTIONS);

      const experience = section(model, "experience");
      expect(experience?.present).toBe(false);
      expect(experience?.count).toBe(0);
      expect(experience?.excluded?.[0]).toMatchObject({ clientId: "exp-1" });
    });

    it("draft row referencing a deleted live row is not a stub", () => {
      const draft = makeDraft({
        experiences: [
          {
            experienceId: "exp-deleted",
            include: false,
            companyName: "Ghost Co",
            title: "Gone",
            rewrittenBullets: []
          },
          ...makeDraft().experiences
        ]
      });
      const { model } = buildApplyPackageDocPreview(draft, makeLive(), OPTIONS);

      expect(section(model, "experience")?.excluded?.map((stub) => stub.clientId)).toEqual([]);
    });

    it("budget-hidden rows are not stubs (include was true pre-resolve)", () => {
      const preview = buildApplyPackageDocPreview(makeBudgetDraft(), makeLive(), {
        reviewApplyKit: false,
        jobSkills: []
      });

      expect(preview.hiddenExperienceCount).toBe(1);
      expect(section(preview.model, "experience")?.excluded).toEqual([]);
      expect(section(preview.model, "projects")?.excluded).toEqual([]);
      // Stacks are never budget-hidden — the user-excluded stub stays.
      expect(section(preview.model, "skills")?.excludedSkills).toEqual(["React"]);
    });

    it("review ON leaves no stubs for a fully-included draft", () => {
      const { model } = buildApplyPackageDocPreview(makeDraft(), makeLive(), OPTIONS);

      expect(section(model, "experience")?.excluded).toEqual([]);
      expect(section(model, "projects")?.excluded).toEqual([]);
      expect(section(model, "skills")?.excludedSkills).toEqual(["React"]);
    });
  });
});
