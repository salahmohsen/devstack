import { describe, expect, it } from "vitest";

import { extractSkillMentions, resolveJobSkillTags } from "#@/application/job-skills";

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
