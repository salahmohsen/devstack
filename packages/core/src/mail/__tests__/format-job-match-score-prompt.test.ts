import { describe, expect, it } from "vitest";

import { defaultJobPreference } from "#@/job-preference/utils";
import { formatJobMatchScorePrompt } from "#@/mail/job-harvest";

const BRIEF = "I build React web apps. Exclusions restated in lists only.";

function preferenceJson(prompt: string): Record<string, unknown> {
  const match = prompt.match(/JobPreference \(JSON\):\n(\{[\s\S]*?\n\})/);
  if (!match?.[1]) throw new Error("missing JobPreference JSON");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

describe("formatJobMatchScorePrompt", () => {
  it("emits exclude, level, salary, remoteRegions, evidence, and brief as narrative", () => {
    const prompt = formatJobMatchScorePrompt({
      prefs: {
        ...defaultJobPreference(),
        excludeKeywords: ["react native"],
        levelFloor: "senior",
        salaryMin: 4000,
        salaryCurrency: "USD",
        remoteRegions: ["mena"]
      },
      evidence: {
        roleTitles: ["Frontend Engineer"],
        organizations: ["Acme"],
        featuredStackNames: ["React"],
        stackNames: ["React", "TypeScript"],
        projectTitles: ["Hub"]
      },
      jobs: [{ listingUrl: "https://example.com/jobs/1", title: "Senior React Engineer" }],
      minScore: 60,
      searchBriefMarkdown: BRIEF
    });

    const columns = preferenceJson(prompt);
    expect(columns.excludeKeywords).toEqual(["react native"]);
    expect(columns.levelFloor).toBe("senior");
    expect(columns.salaryMin).toBe(4000);
    expect(columns.salaryCurrency).toBe("USD");
    expect(columns.remoteRegions).toEqual(["mena"]);
    expect(columns).not.toHaveProperty("searchBriefMarkdown");
    expect(JSON.stringify(columns)).not.toContain(BRIEF);

    expect(prompt).toContain("Frontend Engineer");
    expect(prompt).toContain("Search brief (narrative only — flavor, not law)");
    expect(prompt).toContain(BRIEF);
    expect(prompt).toContain("Column hard-fails are law");
    expect(prompt).toContain("flavor only");
    expect(prompt).toContain("land/evaluate");
  });
});
