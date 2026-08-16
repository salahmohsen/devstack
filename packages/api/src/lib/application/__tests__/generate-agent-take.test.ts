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
  it("emits exclude, level, salary, remoteRegions, evidence, and brief as narrative", () => {
    const summary = prefsSummaryFromRow(
      {
        ...defaultJobPreference(),
        excludeKeywords: ["react native"],
        levelFloor: "senior",
        salaryMin: 4000,
        salaryCurrency: "USD",
        remoteRegions: ["mena"]
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
    expect(columns.excludeKeywords).toEqual(["react native"]);
    expect(columns.levelFloor).toBe("senior");
    expect(columns.salaryMin).toBe(4000);
    expect(columns.salaryCurrency).toBe("USD");
    expect(columns.remoteRegions).toEqual(["mena"]);
    expect(columns).not.toHaveProperty("searchBriefMarkdown");
    expect(JSON.stringify(columns)).not.toContain(BRIEF);

    expect(summary).toContain("Frontend Engineer");
    expect(summary).toContain("Search brief (narrative only — flavor, not law)");
    expect(summary).toContain(BRIEF);
    expect(summary).toContain("JobPreference columns (law)");
  });
});
