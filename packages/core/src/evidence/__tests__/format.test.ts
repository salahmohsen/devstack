import { describe, expect, it } from "vitest";

import { formatEvidenceMarkdown as formatMd } from "#@/evidence/format";

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
});
