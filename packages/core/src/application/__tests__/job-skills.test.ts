import { describe, expect, it } from "vitest";

import { resolveJobSkillTags } from "#@/application/job-skills";

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
