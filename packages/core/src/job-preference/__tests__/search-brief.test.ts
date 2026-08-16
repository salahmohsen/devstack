import { describe, expect, it } from "vitest";

import {
  buildSearchBriefSource,
  hashSearchBriefSource,
  previousMarkdownAfterInvalidate,
  renderSearchBriefMarkdown,
  searchBriefPrefsFromPreference,
  type SearchBriefSource
} from "#@/job-preference/search-brief";
import { defaultJobPreference, emptySeekerMatchEvidence } from "#@/job-preference/utils";

const profile = { name: "Ada", summary: "Builds tools" };

function sourceWith(prefs = defaultJobPreference()): SearchBriefSource {
  return buildSearchBriefSource({
    prefs,
    evidence: emptySeekerMatchEvidence(),
    profile
  });
}

describe("search brief source hash", () => {
  it("ignores jobsPerRun, minMatchScore, and importFromEmail", () => {
    const base = sourceWith(defaultJobPreference());
    const ignored = sourceWith({
      ...defaultJobPreference(),
      jobsPerRun: 40,
      minMatchScore: 99,
      importFromEmail: true
    });
    expect(hashSearchBriefSource(base)).toBe(hashSearchBriefSource(ignored));
  });

  it("is stable across object key order", () => {
    const source = sourceWith({
      ...defaultJobPreference(),
      excludeKeywords: ["php"],
      levelFloor: "senior"
    });
    const shuffled = {
      profile: source.profile,
      evidence: source.evidence,
      prefs: {
        customTitle: source.prefs.customTitle,
        salaryCurrency: source.prefs.salaryCurrency,
        workModes: source.prefs.workModes,
        titleId: source.prefs.titleId,
        remoteRegions: source.prefs.remoteRegions,
        excludeKeywords: source.prefs.excludeKeywords,
        locations: source.prefs.locations,
        salaryMin: source.prefs.salaryMin,
        roleKeywords: source.prefs.roleKeywords,
        levelFloor: source.prefs.levelFloor
      }
    } satisfies SearchBriefSource;
    expect(hashSearchBriefSource(source)).toBe(hashSearchBriefSource(shuffled));
  });

  it("changes when prefs, evidence, or profile change", () => {
    const base = hashSearchBriefSource(sourceWith());
    expect(
      hashSearchBriefSource(sourceWith({ ...defaultJobPreference(), excludeKeywords: ["php"] }))
    ).not.toBe(base);
    expect(
      hashSearchBriefSource(
        buildSearchBriefSource({
          prefs: defaultJobPreference(),
          evidence: { ...emptySeekerMatchEvidence(), projectTitles: ["Hub"] },
          profile
        })
      )
    ).not.toBe(base);
    expect(
      hashSearchBriefSource(
        buildSearchBriefSource({
          prefs: defaultJobPreference(),
          evidence: emptySeekerMatchEvidence(),
          profile: { name: "Ada", summary: "Different" }
        })
      )
    ).not.toBe(base);
  });
});

describe("lists-only search brief renderer", () => {
  it("renders default columns without unused headings or prose", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference(defaultJobPreference())
    });
    expect(markdown.startsWith("## Target jobs")).toBe(true);
    expect(markdown).toContain("- Level floor: none");
    expect(markdown).toContain("- Exclusions: none");
    expect(markdown).toContain("- Modes: any");
    expect(markdown).toContain("- On-site / hybrid places: none — onsite/hybrid will not land");
    expect(markdown).toContain("- Remote regions: worldwide");
    expect(markdown).toContain("- Minimum monthly: none");
    expect(markdown).not.toContain("Target sectors");
    expect(markdown).not.toContain("Target companies");
    expect(markdown).not.toContain("Fit calibration");
    expect(markdown).not.toContain("Example titles:");
  });

  it("restates stored columns and pack label", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference({
        ...defaultJobPreference(),
        titleId: "frontend",
        levelFloor: "senior",
        excludeKeywords: ["react native"],
        workModes: ["remote"],
        locations: ["Cairo"],
        remoteRegions: ["mena"],
        salaryMin: 4000,
        salaryCurrency: "USD"
      })
    });
    expect(markdown).toContain("- Example titles: Frontend Engineer");
    expect(markdown).toContain("- Level floor: senior");
    expect(markdown).toContain("- Exclusions: react native");
    expect(markdown).toContain("- Modes: remote");
    expect(markdown).toContain("- On-site / hybrid places: Cairo");
    expect(markdown).toContain("- Remote regions: mena");
    expect(markdown).toContain("- Minimum monthly: 4000 USD");
    expect(markdown.startsWith("## Target jobs")).toBe(true);
  });
});

describe("invalidate previous markdown", () => {
  it("copies current markdown, or keeps previous when current is already null", () => {
    expect(previousMarkdownAfterInvalidate("# now", "# old")).toBe("# now");
    expect(previousMarkdownAfterInvalidate(null, "# old")).toBe("# old");
    expect(previousMarkdownAfterInvalidate(null, null)).toBe(null);
  });
});
