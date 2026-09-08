import { describe, expect, it } from "vitest";

import { type ResumeImportDraft } from "@tsu-stack/core";

import { buildDocPreviewModel, bulletsToDescription, entryDateRange } from "./doc-preview-model";

function makeDraft(overrides: Partial<ResumeImportDraft> = {}): ResumeImportDraft {
  return {
    profile: {
      name: "Salah Mohsen",
      email: null,
      summary: "Full-stack engineer",
      contacts: []
    },
    experiences: [
      {
        title: "Senior Engineer",
        organization: "Devhub",
        description: "<p>Shipped the hub</p><p>Cut p95 latency</p>",
        fromDate: "2024-01-01",
        toDate: null,
        isPresent: true,
        clientId: "exp-1",
        selected: true,
        includedInPortfolio: true
      },
      {
        title: "Engineer",
        organization: "Portfolio",
        description: "<p>Earlier role</p>",
        clientId: "exp-2",
        selected: true,
        includedInPortfolio: false
      }
    ],
    projects: [
      {
        title: "Omen",
        year: 2025,
        summary: "",
        description: "<p>Built an agent</p>",
        stackNames: [],
        clientId: "proj-1",
        selected: true,
        includedInPortfolio: true
      }
    ],
    stacks: [{ name: "TypeScript", type: "language", selected: true, includedInPortfolio: true }],
    educations: [
      {
        clientId: "edu-1",
        selected: true,
        school: "Cairo University",
        degree: "BSc",
        field: "Computer Science"
      }
    ],
    certifications: [
      {
        clientId: "cert-1",
        selected: true,
        name: "AWS SAA",
        issuer: "Amazon",
        issuedAt: "2023-05-01"
      },
      {
        clientId: "cert-2",
        selected: false,
        name: "Draft cert",
        issuer: "Nobody"
      }
    ],
    ...overrides
  };
}

describe("bulletsToDescription", () => {
  it("rewrites lines as one flat <p> per bullet", () => {
    expect(bulletsToDescription(["Shipped the hub", "Cut p95 latency"])).toBe(
      "<p>Shipped the hub</p><p>Cut p95 latency</p>"
    );
  });

  it("escapes HTML in committed lines", () => {
    expect(bulletsToDescription(["Used <b> and & symbols"])).toBe(
      "<p>Used &lt;b&gt; and &amp; symbols</p>"
    );
  });

  it("collapses whitespace and drops empty lines (delete-a-bullet)", () => {
    expect(bulletsToDescription(["  Kept line  ", "", "   "])).toBe("<p>Kept line</p>");
    expect(bulletsToDescription([])).toBe("");
  });
});

describe("buildDocPreviewModel — clientIds", () => {
  it("attaches clientIds matching the filtered draft rows", () => {
    const model = buildDocPreviewModel(makeDraft());

    const experience = model.sections.find((section) => section.id === "experience");
    expect(experience?.count).toBe(1);
    expect(experience?.experience?.[0]).toMatchObject({
      clientId: "exp-1",
      position: "Senior Engineer",
      company: "Devhub"
    });

    const education = model.sections.find((section) => section.id === "education");
    expect(education?.education?.[0]).toMatchObject({ clientId: "edu-1" });

    const certifications = model.sections.find((section) => section.id === "certifications");
    expect(certifications?.count).toBe(1);
    expect(certifications?.certifications?.[0]).toMatchObject({
      clientId: "cert-1",
      text: "AWS SAA — Amazon, May 2023",
      rest: ""
    });

    const projects = model.sections.find((section) => section.id === "projects");
    expect(projects?.projects?.[0]).toMatchObject({ clientId: "proj-1" });
  });

  it("deselected rows vanish from the paper instantly", () => {
    const model = buildDocPreviewModel(
      makeDraft({
        experiences: [
          {
            title: "Senior Engineer",
            organization: "Devhub",
            description: "<p>Shipped the hub</p>",
            clientId: "exp-1",
            selected: false,
            includedInPortfolio: false
          }
        ]
      })
    );

    const experience = model.sections.find((section) => section.id === "experience");
    expect(experience?.present).toBe(false);
    expect(experience?.experience).toHaveLength(0);
  });
});

describe("entryDateRange", () => {
  it("renders RenderCV month names with an en dash", () => {
    expect(entryDateRange("2024-01-01", "2025-02-01")).toBe("Jan 2024 – Feb 2025");
    expect(entryDateRange("2024-01", "present")).toBe("Jan 2024 – present");
  });

  it("tolerates null and undefined ends", () => {
    expect(entryDateRange("2024-01-01", null)).toBe("Jan 2024");
    expect(entryDateRange(null, null)).toBeNull();
  });
});
