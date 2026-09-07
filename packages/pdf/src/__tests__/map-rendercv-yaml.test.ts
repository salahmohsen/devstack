import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { contactHref } from "#@/contacts";
import { extractBullets } from "#@/html";
import { toRenderCvYaml } from "#@/map-rendercv-yaml";
import { type ResumePdfInput } from "#@/types";

type RenderCvDoc = {
  cv: {
    name?: string;
    headline?: string;
    email?: string | string[];
    phone?: string | string[];
    location?: string;
    website?: string | string[];
    photo?: unknown;
    social_networks?: Array<{ network: string; username: string }>;
    sections?: {
      summary?: string[];
      experience?: Array<{
        company: string;
        position: string;
        start_date?: string;
        end_date?: string;
        highlights?: string[];
      }>;
      education?: Array<{
        institution: string;
        studyType: string;
        area?: string;
        location?: string;
        start_date?: string;
        end_date?: string;
        highlights?: string[];
      }>;
      projects?: Array<{ name: string; location?: string; highlights?: string[] }>;
      skills?: Array<{ label: string; details: string }>;
      certifications?: string[];
    };
  };
  design: { theme: string; page: { size: string } };
  locale: { language: string };
};

function parseYaml(input: ResumePdfInput): { yaml: string; doc: RenderCvDoc } {
  const yaml = toRenderCvYaml(input);
  return { yaml, doc: parse(yaml) as RenderCvDoc };
}

function baseInput(overrides: Partial<ResumePdfInput> = {}): ResumePdfInput {
  return {
    profile: overrides.profile ?? { name: "Salah Mohsen", email: "salah@example.com" },
    summary: overrides.summary ?? "I build typed products.",
    professionalSummary: overrides.professionalSummary,
    headline: overrides.headline,
    portfolio: {
      experiences: [],
      projects: [],
      stacks: [],
      contacts: [],
      ...overrides.portfolio
    }
  };
}

describe("toRenderCvYaml design and locale", () => {
  it("uses engineeringresumes on A4 with English locale", () => {
    const { doc, yaml } = parseYaml(baseInput());
    expect(doc.design.theme).toBe("engineeringresumes");
    expect(doc.design.page.size).toBe("a4");
    expect(doc.locale.language).toBe("english");
    expect(doc.cv.name).toBe("Salah Mohsen");
    expect(yaml).not.toMatch(/^\s*photo:/m);
    expect(doc.cv.photo).toBeUndefined();
  });

  it("skips empty sections", () => {
    const { doc } = parseYaml(baseInput({ summary: "   " }));
    expect(doc.cv.sections?.summary).toBeUndefined();
    expect(doc.cv.sections?.experience).toBeUndefined();
    expect(doc.cv.sections?.projects).toBeUndefined();
    expect(doc.cv.sections?.skills).toBeUndefined();
  });
});

describe("headline", () => {
  it("picks the latest fromDate among isPresent experiences", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [
            {
              organization: "Old Co",
              title: "Staff Engineer",
              fromDate: "2024-06-01",
              toDate: "2025-01-01",
              isPresent: false,
              description: "",
              includedInPortfolio: true
            },
            {
              organization: "Earlier Current",
              title: "Advisor",
              fromDate: "2023-01-01",
              toDate: null,
              isPresent: true,
              description: "",
              includedInPortfolio: true
            },
            {
              organization: "Acme",
              title: "Senior Frontend Engineer",
              fromDate: "2024-01-01",
              toDate: null,
              isPresent: true,
              description: "",
              includedInPortfolio: true
            }
          ],
          projects: [],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(doc.cv.headline).toBe("Senior Frontend Engineer");
  });

  it("falls back to latest fromDate overall when none are present", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [
            {
              organization: "A",
              title: "Junior",
              fromDate: "2020-05-01",
              toDate: "2021-01-01",
              isPresent: false,
              description: "",
              includedInPortfolio: true
            },
            {
              organization: "B",
              title: "Lead",
              fromDate: "2022-03-01",
              toDate: "2023-12-01",
              isPresent: false,
              description: "",
              includedInPortfolio: true
            }
          ],
          projects: [],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(doc.cv.headline).toBe("Lead");
  });

  it("omits headline when there are no experiences", () => {
    const { doc, yaml } = parseYaml(baseInput());
    expect(doc.cv.headline).toBeUndefined();
    expect(yaml).not.toMatch(/^\s*headline:/m);
  });

  it("uses draft.headline when present and non-empty", () => {
    const { doc } = parseYaml(
      baseInput({
        headline: "Senior Frontend Engineer",
        portfolio: {
          experiences: [
            {
              organization: "Acme",
              title: "Staff Engineer",
              fromDate: "2024-01-01",
              toDate: null,
              isPresent: true,
              description: "",
              includedInPortfolio: true
            }
          ],
          projects: [],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(doc.cv.headline).toBe("Senior Frontend Engineer");
  });

  it("falls back to resumeHeadline when draft.headline is empty", () => {
    const { doc } = parseYaml(
      baseInput({
        headline: "   ",
        portfolio: {
          experiences: [
            {
              organization: "Acme",
              title: "Staff Engineer",
              fromDate: "2024-01-01",
              toDate: null,
              isPresent: true,
              description: "",
              includedInPortfolio: true
            }
          ],
          projects: [],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(doc.cv.headline).toBe("Staff Engineer");
  });
});

describe("summary", () => {
  it("stripHtml of professionalSummary when trimmed non-empty", () => {
    const { doc } = parseYaml(
      baseInput({
        summary: "<p>Profile blurb</p>",
        professionalSummary: "<p>Tailored <strong>pitch</strong>.</p>"
      })
    );
    expect(doc.cv.sections?.summary).toEqual(["Tailored pitch."]);
  });

  it("falls back to profile summary when professionalSummary is empty", () => {
    const { doc } = parseYaml(
      baseInput({
        summary: "<p>Profile blurb</p>",
        professionalSummary: "   "
      })
    );
    expect(doc.cv.sections?.summary).toEqual(["Profile blurb"]);
  });
});

describe("extractBullets", () => {
  it("parses li items and multi-paragraph fallbacks", () => {
    expect(extractBullets("<ul><li>One</li><li>Two</li></ul>")).toEqual(["One", "Two"]);
    expect(extractBullets("<p>First paragraph.</p><p>Second paragraph.</p>")).toEqual([
      "First paragraph.",
      "Second paragraph."
    ]);
  });

  it("maps experience highlights from list items, not flattened HTML", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [
            {
              organization: "Acme",
              title: "Engineer",
              fromDate: "2024-01-01",
              toDate: null,
              isPresent: true,
              description: "<ul><li>Shipped apps</li><li>Led design systems</li></ul>",
              includedInPortfolio: true
            }
          ],
          projects: [],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(doc.cv.sections?.experience?.[0]?.highlights).toEqual([
      "Shipped apps",
      "Led design systems"
    ]);
  });
});

describe("experience dates", () => {
  it("emits YYYY-MM and present from ISO, not display month names", () => {
    const { yaml, doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [
            {
              organization: "Acme",
              title: "Engineer",
              fromDate: "2024-01-01",
              toDate: null,
              isPresent: true,
              description: "",
              includedInPortfolio: true
            },
            {
              organization: "Beta",
              title: "Intern",
              fromDate: "2020",
              toDate: "2021-06-15",
              isPresent: false,
              description: "",
              includedInPortfolio: true
            }
          ],
          projects: [],
          stacks: [],
          contacts: []
        }
      })
    );
    const current = doc.cv.sections?.experience?.[0];
    expect(current).toMatchObject({
      company: "Acme",
      position: "Engineer",
      start_date: "2024-01",
      end_date: "present"
    });
    expect(doc.cv.sections?.experience?.[1]).toMatchObject({
      company: "Beta",
      start_date: "2020",
      end_date: "2021-06"
    });
    expect(yaml).toContain("start_date: 2024-01");
    expect(yaml).toContain("end_date: present");
    expect(yaml).not.toContain("Jan 2024");
  });
});

describe("education", () => {
  it("omits education section when no rows", () => {
    const { doc } = parseYaml(baseInput({}));
    expect(doc.cv.sections?.education).toBeUndefined();
    expect(Object.keys(doc.cv.sections ?? {})).not.toContain("education");
  });

  it("renders education entries when present (order: experience → education → projects)", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          ...baseInput().portfolio,
          experiences: [
            {
              organization: "Acme",
              title: "Engineer",
              fromDate: "2024-01-01",
              toDate: null,
              isPresent: true,
              description: "",
              includedInPortfolio: true
            }
          ],
          projects: [
            {
              title: "Dev-Hub",
              summary: null,
              stacks: [],
              includedInPortfolio: true,
              isArchived: false
            }
          ],
          educations: [
            {
              school: "Cairo University",
              degree: "Bachelor of Science in Computer Science",
              field: "Computer Science",
              location: "Cairo, Egypt",
              fromDate: "2015-09-01",
              toDate: "2019-06-30",
              isPresent: false,
              description:
                "<ul><li>Graduated Magna Cum Laude</li><li>Relevant coursework: Algorithms</li></ul>",
              gpa: "3.8/4.0"
            }
          ]
        }
      })
    );
    const education = doc.cv.sections?.education;
    expect(education).toBeDefined();
    expect(education?.[0]).toMatchObject({
      institution: "Cairo University",
      studyType: "Bachelor of Science in Computer Science",
      area: "Computer Science",
      location: "Cairo, Egypt",
      start_date: "2015-09",
      end_date: "2019-06"
    });
    expect(education?.[0]?.highlights).toEqual([
      "Graduated Magna Cum Laude",
      "Relevant coursework: Algorithms",
      "GPA: 3.8/4.0"
    ]);
    const keys = Object.keys(doc.cv.sections ?? {});
    expect(keys.indexOf("education")).toBeGreaterThan(keys.indexOf("experience"));
    expect(keys.indexOf("education")).toBeLessThan(keys.indexOf("projects"));
  });

  it("education isPresent renders open-ended end date (RenderCV 'present', same as experience)", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          ...baseInput().portfolio,
          educations: [
            {
              school: "Cairo University",
              degree: "BSc",
              field: null,
              location: null,
              fromDate: "2024-09-01",
              toDate: null,
              isPresent: true,
              description: null,
              gpa: null
            }
          ]
        }
      })
    );
    expect(doc.cv.sections?.education?.[0]?.end_date).toBe("present");
  });
});

describe("projects and skills", () => {
  it("appends Stack: a · b as the last project highlight", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [
            {
              title: "Dev-Hub",
              summary: "Short teaser only.",
              description:
                "<ul><li>Built multi-tenant career OS</li><li>Integrated Mastra agents</li></ul>",
              stacks: [
                {
                  name: "Next.js",
                  type: "framework",
                  includedInPortfolio: true,
                  sortOrder: 1
                },
                {
                  name: "oxlint",
                  type: "tooling",
                  includedInPortfolio: false,
                  sortOrder: 2
                },
                {
                  name: "TypeScript",
                  type: "language",
                  includedInPortfolio: true,
                  sortOrder: 0
                }
              ],
              includedInPortfolio: true,
              isArchived: false
            }
          ],
          stacks: [
            { name: "React", type: "ui", includedInPortfolio: true, sortOrder: 0 },
            { name: "TypeScript", type: "language", includedInPortfolio: true, sortOrder: 2 },
            { name: "Next.js", type: "framework", includedInPortfolio: true, sortOrder: 3 }
          ],
          contacts: []
        }
      })
    );
    const highlights = doc.cv.sections?.projects?.[0]?.highlights ?? [];
    expect(highlights[0]).toBe("Built multi-tenant career OS");
    expect(highlights.at(-1)).toBe("Stack: TypeScript · Next.js");
    expect(highlights.join(" ")).not.toContain("oxlint");
    expect(doc.cv.sections?.skills?.map((s) => s.label)).toEqual(["Language", "Framework", "UI"]);
  });

  it("links the project title to demoUrl only, never a repo URL", () => {
    const demo = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [
            {
              title: "Dev-Hub",
              summary: "Career OS",
              demoUrl: "https://hub.example.com",
              stacks: [],
              includedInPortfolio: true,
              isArchived: false
            }
          ],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(demo.doc.cv.sections?.projects?.[0]?.name).toBe("[Dev-Hub](https://hub.example.com/)");

    const noDemo = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [
            {
              title: "Dev-Hub",
              summary: "Career OS",
              demoUrl: "not a url",
              stacks: [],
              includedInPortfolio: true,
              isArchived: false
            }
          ],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(noDemo.doc.cv.sections?.projects?.[0]?.name).toBe("Dev-Hub");
    expect(noDemo.doc.cv.sections?.projects?.[0]?.location).toBeUndefined();
  });

  it("puts the url in location when the title cannot be a markdown link", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [
            {
              title: "Hub [beta]",
              summary: "Career OS",
              demoUrl: "https://hub.example.com",
              stacks: [],
              includedInPortfolio: true,
              isArchived: false
            }
          ],
          stacks: [],
          contacts: []
        }
      })
    );
    expect(doc.cv.sections?.projects?.[0]?.name).toBe("Hub [beta]");
    expect(doc.cv.sections?.projects?.[0]?.location).toBe("https://hub.example.com/");
  });
});

describe("certifications", () => {
  it("renders certifications as one-liners with link and dates", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          ...baseInput().portfolio,
          certifications: [
            {
              name: "AWS Certified Solutions Architect - Associate",
              issuer: "Amazon Web Services",
              issuedAt: "2025-03-01",
              expiresAt: "2028-03-01",
              credentialUrl: "https://credverify.example.com/abc",
              description: null
            },
            {
              name: "Project Management Professional (PMP)",
              issuer: "Project Management Institute",
              issuedAt: "2024-06-01",
              expiresAt: null,
              credentialUrl: null,
              description: null
            }
          ]
        }
      })
    );
    expect(doc.cv.sections?.certifications).toEqual([
      "[AWS Certified Solutions Architect - Associate](https://credverify.example.com/abc) — Amazon Web Services, Mar 2025 · Expires Mar 2028",
      "Project Management Professional (PMP) — Project Management Institute, Jun 2024"
    ]);
  });

  it("omits certifications section when no rows", () => {
    const { doc } = parseYaml(baseInput({}));
    expect(doc.cv.sections?.certifications).toBeUndefined();
  });
});

describe("contacts", () => {
  it("omits Discord and unknown networks, and maps YouTube @foo to foo", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [],
          stacks: [],
          contacts: [
            { type: "github", value: "salah", sortOrder: 0 },
            { type: "youtube", value: "@foo", sortOrder: 1 },
            { type: "discord", value: "user#1234", sortOrder: 2 },
            { type: "unknown", value: "nope", sortOrder: 3 }
          ]
        }
      })
    );
    expect(doc.cv.social_networks).toEqual([
      { network: "GitHub", username: "salah" },
      { network: "YouTube", username: "foo" }
    ]);
  });

  it("omits invalid phone and website, keeps extra emails as a list", () => {
    const { doc, yaml } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [],
          stacks: [],
          contacts: [
            { type: "phone", value: "n/a", sortOrder: 0 },
            { type: "website", value: "not a url", sortOrder: 1 },
            { type: "email", value: "work@example.com", sortOrder: 2 },
            { type: "email", value: "invalid", sortOrder: 3 }
          ]
        }
      })
    );
    expect(doc.cv.phone).toBeUndefined();
    expect(yaml).not.toMatch(/^\s*phone:/m);
    expect(doc.cv.website).toBeUndefined();
    expect(doc.cv.email).toEqual(["salah@example.com", "work@example.com"]);
  });

  it("preserves contact sortOrder in cv field order", () => {
    const { doc } = parseYaml(
      baseInput({
        portfolio: {
          experiences: [],
          projects: [],
          stacks: [],
          contacts: [
            { type: "github", value: "salah", sortOrder: 0 },
            { type: "email", value: "salah@example.com", sortOrder: 1 },
            { type: "phone", value: "+14155551234", sortOrder: 2 },
            { type: "website", value: "https://salah.dev", sortOrder: 3 }
          ]
        }
      })
    );
    expect(Object.keys(doc.cv)).toEqual([
      "name",
      "social_networks",
      "email",
      "phone",
      "website",
      "sections"
    ]);
    expect(doc.cv.phone).toBe("+14155551234");
  });

  it("allows tel: hrefs for phone on the contact line", () => {
    expect(contactHref("phone", "+14155551234")).toBe("tel:+14155551234");
    expect(contactHref("email", "me@example.com")).toBe("mailto:me@example.com");
  });
});
