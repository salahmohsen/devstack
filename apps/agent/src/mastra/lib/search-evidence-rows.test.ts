import { describe, expect, it } from "vitest";

import { toEvidenceSearchRow, toEvidenceSearchRows } from "./search-evidence-rows";

describe("toEvidenceSearchRow", () => {
  it("maps an experience row title as role @ organization", () => {
    const hit = toEvidenceSearchRow("experience", {
      id: "exp_raya",
      title: "Senior Frontend",
      organization: "RAYA",
      description: "Led the web platform.\n\nLong body that must not appear in the one-liner."
    });

    expect(hit.title).toBe("Senior Frontend @ RAYA");
    expect(hit.id).toBe("exp_raya");
    expect(hit.kind).toBe("experience");
    expect(hit.oneLiner).toBe("Led the web platform.");
    expect(hit.oneLiner).not.toContain("Long body");
  });

  it("maps project title and summary, stack name and description-or-type", () => {
    expect(
      toEvidenceSearchRows("project", [{ id: "p1", title: "Dev-Hub", summary: "Personal hub" }])
    ).toEqual([{ id: "p1", title: "Dev-Hub", oneLiner: "Personal hub", kind: "project" }]);

    expect(
      toEvidenceSearchRow("stack", {
        id: "s1",
        name: "TypeScript",
        description: null,
        type: "language"
      })
    ).toEqual({ id: "s1", title: "TypeScript", oneLiner: "language", kind: "stack" });
  });
});
