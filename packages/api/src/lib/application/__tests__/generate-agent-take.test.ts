import { describe, expect, it } from "vitest";

import { defaultJobPreference } from "@tsu-stack/core";

import { prefsSummaryFromRow } from "#@/lib/application/generate-agent-take";

const BRIEF = "I build React web apps. Exclusions restated in lists only.";

function columnsJson(summary: string): Record<string, unknown> {
  const match = summary.match(/JobPreference columns \(law\):\n(\{[\s\S]*?\n\})/);
  if (!match?.[1]) throw new Error("missing JobPreference columns JSON");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

describe("prefsSummaryFromRow", () => {
  it("emits roleKeywords, salary, evidence, and brief as narrative", () => {
    const summary = prefsSummaryFromRow(
      {
        ...defaultJobPreference(),
        roleKeywords: ["react"],
        salaryMin: 4000,
        salaryCurrency: "USD"
      },
      {
        roleTitles: ["Frontend Engineer"],
        organizations: ["Acme"],
        featuredStackNames: ["React"],
        stackNames: ["React", "TypeScript"],
        projectTitles: ["Hub"]
      },
      BRIEF
    );

    expect(summary).toBeTruthy();
    const columns = columnsJson(summary!);
    expect(columns.roleKeywords).toEqual(["react"]);
    expect(columns.salaryMin).toBe(4000);
    expect(columns.salaryCurrency).toBe("USD");
    expect(columns).not.toHaveProperty("excludeKeywords");
    expect(columns).not.toHaveProperty("levelFloor");
    expect(columns).not.toHaveProperty("searchBriefMarkdown");
    expect(JSON.stringify(columns)).not.toContain(BRIEF);

    expect(summary).toContain("Frontend Engineer");
    expect(summary).toContain("Search brief (narrative only — flavor, not law)");
    expect(summary).toContain(BRIEF);
    expect(summary).toContain("JobPreference columns (law)");
  });
});
