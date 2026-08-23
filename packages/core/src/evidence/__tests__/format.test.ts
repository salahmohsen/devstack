import { describe, expect, it } from "vitest";

import {
  formatEvidenceDeleteMarkdown,
  formatEvidenceMarkdown as formatMd
} from "#@/evidence/format";

describe("formatEvidenceMarkdown", () => {
  it("renders a full project view", () => {
    const md = formatMd("project", {
      title: "Dev-Hub",
      year: 2026,
      includedInPortfolio: true,
      summary: "Career inbox",
      description: "Longer"
    });
    expect(md).toContain("# Project: Dev-Hub");
    expect(md).toContain("Year: 2026");
    expect(md).toContain("Portfolio: yes");
    expect(md).toContain("## Summary");
  });

  it("renders a short delete view", () => {
    expect(formatEvidenceDeleteMarkdown("project", { title: "Dev-Hub" })).toBe(
      "# Project: Dev-Hub\n\n(This row will be deleted.)"
    );
    expect(formatEvidenceDeleteMarkdown("stack", { name: "React" })).toBe(
      "# Stack: React\n\n(This row will be deleted.)"
    );
  });
});
