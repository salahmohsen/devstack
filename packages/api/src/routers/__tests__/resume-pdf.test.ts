import { extractText, validatePdfUA } from "pdfnative";
import { describe, expect, it } from "vitest";

import {
  buildContactLine,
  buildResumeDocument,
  contactHref,
  displayContact,
  extractBullets,
  filterPortfolioProjectStacks,
  formatResumeMonthYear,
  formatStackTypeLabel,
  groupStacksByType,
  preventOrphanHeadings,
  projectStackNames,
  renderResumePdfBytes,
  type ResumeBuilderData
} from "#@/routers/resume-pdf";

describe("contactHref", () => {
  it("links email via mailto", () => {
    expect(contactHref("email", "me@example.com")).toBe("mailto:me@example.com");
    expect(contactHref("email", "mailto:me@example.com")).toBe("mailto:me@example.com");
  });

  it("links website and social profiles with https", () => {
    expect(contactHref("website", "https://example.com")).toBe("https://example.com");
    expect(contactHref("website", "example.com/path")).toBe("https://example.com/path");
    expect(contactHref("github", "salah")).toBe("https://github.com/salah");
    expect(contactHref("linkedin", "in/salah")).toBe("https://www.linkedin.com/in/salah");
    expect(contactHref("x", "@salah")).toBe("https://x.com/salah");
  });

  it("does not invent links for phone or location (pdfnative blocks tel:)", () => {
    expect(contactHref("phone", "+201000000000")).toBeNull();
    expect(contactHref("location", "Cairo, Egypt")).toBeNull();
  });
});

describe("displayContact", () => {
  it("strips scheme for websites", () => {
    expect(displayContact("website", "https://www.example.com/")).toBe("example.com");
  });
});

describe("buildContactLine", () => {
  it("puts all contacts on one pipe-separated line", () => {
    const line = buildContactLine(
      [
        { type: "email", value: "a@b.com" },
        { type: "website", value: "https://salah.dev" },
        { type: "phone", value: "+20100" },
        { type: "location", value: "Cairo" }
      ],
      "fallback@x.com"
    );
    // No sortOrder → type-rank fallback (location, phone, email, website).
    expect(line).toBe("Cairo | +20100 | a@b.com | salah.dev");
    expect(line).not.toContain("\n");
  });

  it("preserves contact sortOrder over type rank", () => {
    const line = buildContactLine(
      [
        { type: "github", value: "salah", sortOrder: 0 },
        { type: "email", value: "a@b.com", sortOrder: 1 },
        { type: "phone", value: "+20100", sortOrder: 2 },
        { type: "website", value: "https://salah.dev", sortOrder: 3 }
      ],
      "fallback@x.com"
    );
    expect(line).toBe("github.com/salah | a@b.com | +20100 | salah.dev");
    // Without sortOrder this would prefer phone/email before github.
    expect(line!.indexOf("github.com/salah")).toBeLessThan(line!.indexOf("+20100"));
  });
});

describe("groupStacksByType", () => {
  it("groups and orders skills by type", () => {
    const groups = groupStacksByType([
      { name: "React", type: "ui" },
      { name: "Vite", type: "tooling" },
      { name: "Zustand", type: "state management" },
      { name: "TypeScript", type: "language" },
      { name: "Mystery", type: null }
    ]);
    expect(groups.map((g) => g.type)).toEqual([
      "language",
      "ui",
      "state management",
      "tooling",
      "other"
    ]);
    expect(groups.find((g) => g.type === "ui")?.names).toEqual(["React"]);
    expect(formatStackTypeLabel("state management")).toBe("State Management");
    expect(formatStackTypeLabel("ui")).toBe("UI");
  });
});

describe("formatResumeMonthYear", () => {
  it("formats ISO dates without UTC day-shift", () => {
    expect(formatResumeMonthYear("2024-01-01")).toBe("Jan 2024");
    expect(formatResumeMonthYear("2023-12")).toBe("Dec 2023");
  });
});

describe("projectStackNames / filterPortfolioProjectStacks", () => {
  it("renders every stack name in sortOrder with no cap or type filter", () => {
    const names = projectStackNames([
      { name: "Zustand", sortOrder: 2 },
      { name: "TypeScript", sortOrder: 0 },
      { name: "Next.js", sortOrder: 1 },
      { name: "oxlint", sortOrder: 3 },
      { name: "TypeScript", sortOrder: 4 }
    ]);
    expect(names).toEqual(["TypeScript", "Next.js", "Zustand", "oxlint"]);
  });

  it("keeps only portfolio-included stacks for project lines", () => {
    const filtered = filterPortfolioProjectStacks(
      [
        { name: "React", includedInPortfolio: true, sortOrder: 0 },
        { name: "oxlint", includedInPortfolio: false, sortOrder: 1 },
        { name: "Drizzle", sortOrder: 2 },
        { name: "sharp", includedInPortfolio: false, sortOrder: 3 }
      ],
      [
        { name: "React", includedInPortfolio: true },
        { name: "Drizzle", includedInPortfolio: true },
        { name: "oxlint", includedInPortfolio: false }
      ]
    );
    expect(projectStackNames(filtered)).toEqual(["React", "Drizzle"]);
  });
});

describe("preventOrphanHeadings", () => {
  it("inserts a pageBreak when an H3 would be stranded near the page bottom", () => {
    const margins = { t: 48, r: 48, b: 48, l: 48 };
    // Fill nearly a full page so the next H3 cannot keep body with it.
    const filler: ReturnType<typeof preventOrphanHeadings> = [];
    for (let i = 0; i < 40; i++) {
      filler.push({
        type: "paragraph",
        text: `Filler paragraph number ${i} with enough words to consume vertical space on the page.`,
        fontSize: 10,
        lineHeight: 1.4
      });
    }
    filler.push({ type: "heading", text: "Dev-Hub", level: 3 });
    filler.push({
      type: "list",
      items: ["Built multi-tenant career OS", "Integrated Mastra agents"],
      style: "bullet",
      fontSize: 9
    });
    filler.push({ type: "spacer", height: 10 });

    const result = preventOrphanHeadings(filler, margins);
    const hubIdx = result.findIndex((b) => b.type === "heading" && b.text === "Dev-Hub");
    expect(hubIdx).toBeGreaterThan(0);
    expect(result[hubIdx - 1]?.type).toBe("pageBreak");
  });

  it("keeps a section H2 with its first H3 item instead of orphaning the section title", () => {
    const margins = { t: 48, r: 48, b: 48, l: 48 };
    const blocks: ReturnType<typeof preventOrphanHeadings> = [];
    for (let i = 0; i < 38; i++) {
      blocks.push({
        type: "paragraph",
        text: `Filler paragraph number ${i} with enough words to consume vertical space on the page.`,
        fontSize: 10,
        lineHeight: 1.4
      });
    }
    blocks.push({ type: "heading", text: "PROJECTS", level: 2 });
    blocks.push({ type: "heading", text: "Dev-Hub", level: 3 });
    blocks.push({
      type: "list",
      items: ["Built multi-tenant career OS"],
      style: "bullet",
      fontSize: 9
    });
    blocks.push({ type: "spacer", height: 10 });

    const result = preventOrphanHeadings(blocks, margins);
    const sectionIdx = result.findIndex((b) => b.type === "heading" && b.text === "PROJECTS");
    expect(sectionIdx).toBeGreaterThan(0);
    expect(result[sectionIdx - 1]?.type).toBe("pageBreak");
    // H2 and first project title stay together after the break
    expect(result[sectionIdx + 1]).toMatchObject({ type: "heading", text: "Dev-Hub", level: 3 });
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
});

describe("buildResumeDocument", () => {
  it("uses one-line contacts, project description bullets, curated tech, and skill groups", () => {
    const { params, layout } = buildResumeDocument({
      profile: { name: "Salah", email: "salah@example.com" },
      portfolio: {
        experiences: [
          {
            organization: "Acme",
            title: "Senior Frontend Engineer",
            fromDate: "2024-01-01",
            toDate: null,
            isPresent: true,
            description: "<ul><li>Shipped apps</li><li>Led design systems</li></ul>",
            includedInPortfolio: true
          }
        ],
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
          { name: "Vite", type: "tooling", includedInPortfolio: true, sortOrder: 1 },
          {
            name: "TypeScript",
            type: "language",
            includedInPortfolio: true,
            sortOrder: 2
          },
          {
            name: "Next.js",
            type: "framework",
            includedInPortfolio: true,
            sortOrder: 3
          }
        ],
        contacts: [
          { type: "github", value: "salah", sortOrder: 0 },
          { type: "email", value: "salah@example.com", sortOrder: 1 },
          { type: "website", value: "https://salah.dev", sortOrder: 2 },
          { type: "phone", value: "+201000000000", sortOrder: 3 }
        ]
      }
    });

    expect(layout.tagged).toBe("pdfa2u");
    // No redundant page header title (pdfnative draws params.title on page 0).
    expect(params.title).toBeUndefined();
    expect(params.metadata?.subject).toContain("Salah");
    expect(params.metadata?.author).toBe("Salah");

    // Single contact line in sortOrder (github, email, website, phone).
    const contactPara = params.blocks.find(
      (b): b is Extract<(typeof params.blocks)[number], { type: "paragraph" }> =>
        b.type === "paragraph" && b.text.includes("salah@example.com")
    );
    expect(contactPara).toBeDefined();
    expect(contactPara!.text).toContain("|");
    expect(contactPara!.text).toContain("salah.dev");
    expect(contactPara!.text).not.toContain("\n");
    expect(contactPara!.text.indexOf("github.com/salah")).toBeLessThan(
      contactPara!.text.indexOf("salah@example.com")
    );
    expect(params.blocks.filter((b) => b.type === "link")).toHaveLength(0);

    // Experience: title first, company | dates
    const titles = params.blocks
      .filter((b) => b.type === "heading" && b.level === 3)
      .map((b) => (b.type === "heading" ? b.text : ""));
    expect(titles).toContain("Senior Frontend Engineer");
    expect(titles).toContain("Dev-Hub");

    // Project uses description bullets, not summary teaser
    const lists = params.blocks.filter((b) => b.type === "list");
    const projectList = lists.find(
      (b) =>
        b.type === "list" &&
        b.items.some((i) => typeof i === "string" && i.includes("multi-tenant"))
    );
    expect(projectList).toBeTruthy();

    // Stack label is its own line; names follow without oxlint.
    const stackLabel = params.blocks.find((b) => b.type === "paragraph" && b.text === "Stack");
    expect(stackLabel).toBeTruthy();
    const stackNames = params.blocks.find(
      (b) =>
        b.type === "paragraph" &&
        b.text.includes("TypeScript") &&
        b.text.includes("Next.js") &&
        !b.text.startsWith("Language:")
    );
    expect(stackNames?.type === "paragraph" && stackNames.text).toMatch(/TypeScript/);
    expect(stackNames?.type === "paragraph" && stackNames.text).toMatch(/Next\.js/);
    expect(stackNames?.type === "paragraph" && stackNames.text).not.toMatch(/oxlint/);

    const skillLines = params.blocks
      .filter((b) => b.type === "paragraph")
      .map((b) => (b.type === "paragraph" ? b.text : ""))
      .filter((t) => /Language:|UI:|Tooling:/.test(t));
    expect(skillLines.some((t) => t.startsWith("Language:") && t.includes("TypeScript"))).toBe(
      true
    );
    expect(skillLines.some((t) => t.startsWith("UI:") && t.includes("React"))).toBe(true);
  });
});

function flattenExtractedText(extracted: unknown): string {
  if (typeof extracted === "string") return extracted;
  if (Array.isArray(extracted)) {
    return extracted
      .map((page) => {
        if (typeof page === "string") return page;
        if (page && typeof page === "object" && "text" in page) {
          const text = (page as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("\n");
  }
  throw new Error(`Unexpected extractText shape: ${JSON.stringify(extracted).slice(0, 240)}`);
}

function atsResumeFixture(): ResumeBuilderData {
  return {
    profile: { name: "Salah Mohsen", email: "salah@example.com" },
    portfolio: {
      experiences: [
        {
          organization: "Acme Labs",
          title: "Senior Frontend Engineer",
          fromDate: "2024-01-01",
          toDate: null,
          isPresent: true,
          description: "<ul><li>Shipped typed design systems</li></ul>",
          includedInPortfolio: true
        }
      ],
      projects: [
        {
          title: "Dev-Hub",
          summary: null,
          description: "<ul><li>Built multi-tenant career OS</li></ul>",
          stacks: [{ name: "TypeScript", includedInPortfolio: true, sortOrder: 0 }],
          includedInPortfolio: true,
          isArchived: false
        }
      ],
      stacks: [{ name: "TypeScript", type: "language", includedInPortfolio: true, sortOrder: 0 }],
      contacts: [
        { type: "email", value: "salah@example.com", sortOrder: 0 },
        { type: "github", value: "salah", sortOrder: 1 }
      ]
    }
  };
}

describe("ATS extractText smoke", () => {
  it("preserves heading and bullet reading order in generated resume PDF", async () => {
    const bytes = await renderResumePdfBytes(atsResumeFixture());
    const pdfLatin1 = Buffer.from(bytes).toString("latin1");
    expect(pdfLatin1).toMatch(/\/FontFile2/);

    const ua = validatePdfUA(bytes);
    expect(ua.errors.join("; ")).toBe("");
    expect(ua.valid).toBe(true);

    const extracted = extractText(bytes);
    const text = flattenExtractedText(extracted).replace(/\s+/g, " ");

    expect(text).toContain("Salah Mohsen");
    expect(text).toContain("salah@example.com");
    expect(text).toContain("github.com/salah");

    const experienceAt = text.indexOf("EXPERIENCE");
    const projectsAt = text.indexOf("PROJECTS");
    const skillsAt = text.indexOf("SKILLS");
    expect(experienceAt).toBeGreaterThan(-1);
    expect(projectsAt).toBeGreaterThan(experienceAt);
    expect(skillsAt).toBeGreaterThan(projectsAt);

    expect(text.indexOf("Senior Frontend Engineer")).toBeLessThan(text.indexOf("Acme Labs"));
    expect(text).toContain("Shipped typed design systems");
    expect(text).toContain("Built multi-tenant career OS");
    expect(text).toContain("Language: TypeScript");
  });
});
