import { describe, expect, it } from "vitest";

import {
  buildJobSkillLinkPrompt,
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
});
