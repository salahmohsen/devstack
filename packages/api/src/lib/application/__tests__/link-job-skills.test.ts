import { describe, expect, it } from "vitest";

import { skillsFromLinkedPayload } from "#@/lib/application/link-job-skills";

const stacks = [
  { id: "stack-react", name: "React" },
  { id: "stack-tq", name: "TanStack Query" }
];

describe("skillsFromLinkedPayload", () => {
  it("reads nested agent object.skills and drops unknown ids", () => {
    expect(
      skillsFromLinkedPayload(
        {
          object: {
            skills: [
              { name: "React Query", band: "required", stackId: "stack-tq" },
              { name: "Vite", band: "preferred", stackId: "nope" }
            ]
          }
        },
        stacks
      )
    ).toEqual({
      requiredSkills: [{ name: "React Query", stackId: "stack-tq", band: "required" }],
      preferredSkills: [{ name: "Vite", stackId: null, band: "preferred" }]
    });
  });
});
