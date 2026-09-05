import { describe, expect, it } from "vitest";

import {
  applyHardJobPreferencePatch,
  ProposeHardPreferenceChangeInputSchema
} from "#@/job-preference/list-patch";
import {
  buildSearchBriefSource,
  previousMarkdownAfterInvalidate,
  renderSearchBriefMarkdown,
  searchBriefPrefsFromPreference,
  stableSearchBriefSourceJson,
  type SearchBriefSource
} from "#@/job-preference/search-brief";
import { defaultJobPreference, emptySeekerMatchEvidence } from "#@/job-preference/utils";

const profile = { name: "Ada", summary: "Builds tools" };

function defaultBriefPrefs() {
  return { ...defaultJobPreference(), categories: null };
}

function sourceWith(prefs = defaultBriefPrefs()): SearchBriefSource {
  return buildSearchBriefSource({
    prefs,
    evidence: emptySeekerMatchEvidence(),
    profile
  });
}

describe("search brief source payload", () => {
  it("ignores dailyBoardScoreCap, minMatchScore, importFromEmail, and reviewApplyKit", () => {
    const base = sourceWith();
    const ignored = sourceWith({
      ...defaultBriefPrefs(),
      dailyBoardScoreCap: 80,
      minMatchScore: 99,
      importFromEmail: true,
      reviewApplyKit: false
    });
    expect(stableSearchBriefSourceJson(base)).toBe(stableSearchBriefSourceJson(ignored));
  });

  it("is stable across object key order", () => {
    const source = sourceWith({
      ...defaultBriefPrefs()
    });
    const shuffled = {
      profile: source.profile,
      evidence: source.evidence,
      prefs: {
        salaryCurrency: source.prefs.salaryCurrency,
        workModes: source.prefs.workModes,
        salaryMin: source.prefs.salaryMin,
        roleKeywords: source.prefs.roleKeywords,
        categories: source.prefs.categories,
        regions: source.prefs.regions,
        countries: source.prefs.countries,
        cities: source.prefs.cities
      }
    } satisfies SearchBriefSource;
    expect(stableSearchBriefSourceJson(source)).toBe(stableSearchBriefSourceJson(shuffled));
  });

  it("changes when prefs, evidence, or profile change", () => {
    const base = stableSearchBriefSourceJson(sourceWith());
    expect(
      stableSearchBriefSourceJson(sourceWith({ ...defaultBriefPrefs(), roleKeywords: ["react"] }))
    ).not.toBe(base);
    expect(
      stableSearchBriefSourceJson(
        buildSearchBriefSource({
          prefs: defaultBriefPrefs(),
          evidence: { ...emptySeekerMatchEvidence(), projectTitles: ["Hub"] },
          profile
        })
      )
    ).not.toBe(base);
    expect(
      stableSearchBriefSourceJson(
        buildSearchBriefSource({
          prefs: defaultBriefPrefs(),
          evidence: emptySeekerMatchEvidence(),
          profile: { name: "Ada", summary: "Different" }
        })
      )
    ).not.toBe(base);
  });

  it("does not change when evidence arrays are reordered", () => {
    const empty = emptySeekerMatchEvidence();
    const a = buildSearchBriefSource({
      prefs: defaultBriefPrefs(),
      evidence: { ...empty, roleTitles: ["Backend", "Frontend"], projectTitles: ["Hub", "Mail"] },
      profile
    });
    const b = buildSearchBriefSource({
      prefs: defaultBriefPrefs(),
      evidence: { ...empty, roleTitles: ["Frontend", "Backend"], projectTitles: ["Mail", "Hub"] },
      profile
    });
    expect(stableSearchBriefSourceJson(a)).toBe(stableSearchBriefSourceJson(b));
  });
});

describe("lists-only search brief renderer", () => {
  it("renders default columns without unused headings or prose", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference(defaultBriefPrefs())
    });
    expect(markdown.startsWith("## Target jobs")).toBe(true);
    expect(markdown).toContain("- Modes: any");
    expect(markdown).toContain("- Minimum monthly: none");
    expect(markdown).not.toContain("Level floor");
    expect(markdown).not.toContain("Exclusions");
    expect(markdown).not.toContain("On-site / hybrid places");
    expect(markdown).not.toContain("Remote regions");
    expect(markdown).not.toContain("Target sectors");
    expect(markdown).not.toContain("Target companies");
    expect(markdown).not.toContain("Fit calibration");
    expect(markdown).not.toContain("Example titles:");
  });

  it("restates stored columns and role keywords", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference({
        ...defaultBriefPrefs(),
        roleKeywords: ["react", "go"],
        categories: ["backend"],
        workModes: ["remote"],
        salaryMin: 4000,
        salaryCurrency: "USD"
      })
    });
    expect(markdown).toContain("- Example titles: react, go");
    expect(markdown).toContain("- Modes: remote");
    expect(markdown).toContain("- Minimum monthly: 4000 USD");
    expect(markdown.startsWith("## Target jobs")).toBe(true);
  });

  it("falls back to categories for example titles when roleKeywords are empty", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference({
        ...defaultBriefPrefs(),
        categories: ["backend", "frontend"]
      })
    });
    expect(markdown).toContain("- Example titles: backend, frontend");
  });

  it("renders facet geography as a Location section", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference({
        ...defaultBriefPrefs(),
        regions: ["eu", "mena"],
        countries: ["Germany"],
        cities: ["Cairo"],
        workModes: ["remote"]
      })
    });
    expect(markdown).toContain("## Location");
    expect(markdown).toContain("- Regions: eu, mena");
    expect(markdown).toContain("- Countries: Germany");
    expect(markdown).toContain("- Cities: Cairo");
    expect(markdown).toContain("- Modes: remote");
  });

  it("omits the Location section when no facet geography is set", () => {
    const markdown = renderSearchBriefMarkdown({
      prefs: searchBriefPrefsFromPreference({
        ...defaultBriefPrefs(),
        roleKeywords: ["react"]
      })
    });
    expect(markdown).not.toContain("## Location");
  });

  it("changes when the salary floor is patched", () => {
    const current = {
      ...defaultBriefPrefs(),
      salaryMin: 3000,
      salaryCurrency: "USD"
    };
    const currentPrefs = searchBriefPrefsFromPreference(current);
    const currentMd = renderSearchBriefMarkdown({ prefs: currentPrefs });

    const proposed = (patch: unknown) => {
      const nextPrefs = applyHardJobPreferencePatch(
        { salaryMin: current.salaryMin ?? null, salaryCurrency: current.salaryCurrency ?? null },
        ProposeHardPreferenceChangeInputSchema.parse(patch)
      );
      return renderSearchBriefMarkdown({
        prefs: {
          ...currentPrefs,
          salaryMin:
            nextPrefs.salaryMin !== undefined ? nextPrefs.salaryMin : currentPrefs.salaryMin,
          salaryCurrency:
            nextPrefs.salaryCurrency !== undefined
              ? nextPrefs.salaryCurrency
              : currentPrefs.salaryCurrency
        }
      });
    };

    const salaryMd = proposed({ salaryMin: 4000, salaryCurrency: "usd" });

    expect(salaryMd).not.toBe(currentMd);
    expect(currentMd).toContain("- Minimum monthly: 3000 USD");
    expect(salaryMd).toContain("- Minimum monthly: 4000 USD");
  });
});

describe("invalidate previous markdown", () => {
  it("copies current markdown, or keeps previous when current is already null", () => {
    expect(previousMarkdownAfterInvalidate("# now", "# old")).toBe("# now");
    expect(previousMarkdownAfterInvalidate(null, "# old")).toBe("# old");
    expect(previousMarkdownAfterInvalidate(null, null)).toBe(null);
  });
});
