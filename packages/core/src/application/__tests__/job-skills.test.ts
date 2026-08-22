import { describe, expect, it } from "vitest";

import {
  buildJobSkillLinkPrompt,
  canonicalizeListingSkillNames,
  canonicalizeListingSkillToken,
  extractSkillMentions,
  LinkedJobSkillsPayloadSchema,
  resolveJobSkillTags,
  sanitizeLinkedJobSkills
} from "#@/application/job-skills";

const stacks = [
  { id: "stack-react", name: "React" },
  { id: "stack-ts", name: "TypeScript" },
  { id: "stack-react-dupe", name: "react" }
];

describe("resolveJobSkillTags", () => {
  it("matches stack id case-insensitively and preserves band", () => {
    expect(
      resolveJobSkillTags(
        [
          { name: "React", band: "required" },
          { name: "typescript", band: "preferred" }
        ],
        stacks
      )
    ).toEqual([
      { name: "React", stackId: "stack-react", band: "required" },
      { name: "typescript", stackId: "stack-ts", band: "preferred" }
    ]);
  });

  it("returns stackId null for unmatched skills (no auto-create)", () => {
    expect(resolveJobSkillTags([{ name: "Katalon", band: "required" }], stacks)).toEqual([
      { name: "Katalon", stackId: null, band: "required" }
    ]);
  });

  it("normalizes trim, case, and collapsed spaces for matching", () => {
    expect(
      resolveJobSkillTags(
        [{ name: "  Type   Script  ", band: "preferred" }],
        [
          { id: "stack-ts", name: "TypeScript" },
          { id: "stack-spaced", name: "  type script " }
        ]
      )
    ).toEqual([{ name: "  Type   Script  ", stackId: "stack-spaced", band: "preferred" }]);
  });

  it("uses first stack when normalized names collide", () => {
    expect(resolveJobSkillTags([{ name: "REACT", band: "required" }], stacks)).toEqual([
      { name: "REACT", stackId: "stack-react", band: "required" }
    ]);
  });
});

describe("extractSkillMentions", () => {
  it("maps JD spellings onto canonical display names", () => {
    const skills = extractSkillMentions(
      "Utilize React.js, Next.js, React Query, Styled Components and Tailwind."
    );
    expect(skills.required).toEqual(
      expect.arrayContaining([
        "React",
        "Next.js",
        "TanStack Query",
        "Styled Components",
        "Tailwind CSS"
      ])
    );
    expect(skills.required).not.toEqual(expect.arrayContaining(["React.js", "React Query"]));
  });

  it("matches caller extras that are outside the product catalog", () => {
    const skills = extractSkillMentions(
      "Required: Kafka, Terraform, and React. Nice to have: Figma.",
      ["Kafka", "Terraform", "Figma"]
    );
    expect(skills.required).toEqual(expect.arrayContaining(["Kafka", "Terraform", "React"]));
    expect(skills.preferred).toEqual(["Figma"]);
  });

  it("does not invent skills that are not in the catalog", () => {
    const skills = extractSkillMentions("We use COBOL, Fortran, and a supermarket POS terminal.");
    expect(skills.required).toEqual([]);
    expect(skills.preferred).toEqual([]);
  });

  it("keeps a user stack spelling when it overlaps a canonical alias", () => {
    const skills = extractSkillMentions("Experience with React Query and Next.js.", [
      "React Query"
    ]);
    expect(skills.required).toEqual(expect.arrayContaining(["React Query", "Next.js"]));
    expect(skills.required).not.toContain("TanStack Query");
  });
});

describe("canonicalizeListingSkillToken", () => {
  it("keeps React.js as React via canonical aliases", () => {
    expect(canonicalizeListingSkillToken("React.js")).toEqual({ keep: true, display: "React" });
  });
  it("keeps Tailwind CSS and Postman and HTTP and CI/CD", () => {
    expect(canonicalizeListingSkillToken("Tailwind CSS").keep).toBe(true);
    expect(canonicalizeListingSkillToken("postman")).toEqual({ keep: true, display: "Postman" });
    expect(canonicalizeListingSkillToken("HTTP")).toEqual({ keep: true, display: "HTTP" });
    expect(canonicalizeListingSkillToken("CI/CD").keep).toBe(true);
  });
  it("keeps a held accessibility alias", () => {
    expect(
      canonicalizeListingSkillToken("a11y", [{ name: "Accessibility", aliases: ["a11y"] }])
    ).toEqual({ keep: true, display: "Accessibility" });
  });
  it("drops role and duty phrases", () => {
    for (const token of [
      "frontend development",
      "ui/ux design",
      "responsive ui",
      "accessibility",
      "api building and testing",
      "strong communication skills",
      "cobol"
    ]) {
      expect(canonicalizeListingSkillToken(token)).toEqual({ keep: false });
    }
  });
});

describe("canonicalizeListingSkillNames", () => {
  it("drops phrases and does not count them in the remaining list", () => {
    expect(
      canonicalizeListingSkillNames(
        [
          "react",
          "javascript",
          "typescript",
          "frontend development",
          "ui/ux design",
          "postman",
          "http"
        ],
        [{ name: "React" }, { name: "JavaScript" }, { name: "TypeScript" }]
      )
    ).toEqual(["React", "JavaScript", "TypeScript", "Postman", "HTTP"]);
  });
});

describe("sanitizeLinkedJobSkills", () => {
  it("keeps only stack ids from the provided catalog", () => {
    expect(
      sanitizeLinkedJobSkills(
        {
          skills: [
            { name: "React Query", band: "required", stackId: "stack-ts" },
            { name: "Invented", band: "required", stackId: "not-a-stack" },
            { name: "shadcn/ui", band: "preferred", stackId: null }
          ]
        },
        stacks
      )
    ).toEqual([
      { name: "React Query", stackId: "stack-ts", band: "required" },
      { name: "Invented", stackId: null, band: "required" },
      { name: "shadcn/ui", stackId: null, band: "preferred" }
    ]);
  });

  it("builds a catalog-aware prompt that forbids inventing stack ids", () => {
    const prompt = buildJobSkillLinkPrompt({
      title: "Senior Frontend Engineer",
      companyName: "intella",
      listingUrl: "https://www.linkedin.com/jobs/view/4452452790",
      description: "Stack: Next.js, TypeScript, React Query.",
      stacks: [{ id: "stack-tq", name: "TanStack Query" }]
    });
    expect(prompt).toContain("stack-tq | TanStack Query");
    expect(prompt).toContain("Do not invent stack ids");
  });

  it("drops invalid rows and dedupes by band + normalized name", () => {
    expect(
      sanitizeLinkedJobSkills(
        [
          { name: "React", band: "required", stackId: "stack-react" },
          { name: "react", band: "required", stackId: "stack-react" },
          { name: "", band: "required", stackId: null },
          { name: "Go", band: "maybe", stackId: null }
        ],
        stacks
      )
    ).toEqual([{ name: "React", stackId: "stack-react", band: "required" }]);
  });

  it("parses LLM payloads that omit band or use aliases", () => {
    const parsed = LinkedJobSkillsPayloadSchema.parse({
      skills: [
        { name: "React", stackId: null },
        { name: "TypeScript", band: "must-have", stackId: "stack-ts" },
        { name: "Figma", band: "nice-to-have", stackId: null }
      ]
    });
    expect(parsed.skills).toHaveLength(3);
    expect(sanitizeLinkedJobSkills(parsed, stacks)).toEqual([
      { name: "React", stackId: null, band: "required" },
      { name: "TypeScript", stackId: "stack-ts", band: "required" },
      { name: "Figma", stackId: null, band: "preferred" }
    ]);
  });
});
