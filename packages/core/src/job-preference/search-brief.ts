import { z } from "zod";

import { CategoryFacetSchema, RegionFacetSchema } from "#@/job-discovery/facets";

import {
  JobPreferenceFieldsSchema,
  SeekerMatchEvidenceSchema,
  type JobPreference,
  type JobPreferenceFacetFields,
  type SeekerMatchEvidence
} from "./types";

export const SearchBriefPrefsSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  roleKeywords: true,
  salaryMin: true,
  salaryCurrency: true
}).extend({
  categories: z.array(CategoryFacetSchema).nullable(),
  regions: z.array(RegionFacetSchema).nullish(),
  countries: z.array(z.string()).nullish(),
  cities: z.array(z.string()).nullish()
});
export type SearchBriefPrefs = z.infer<typeof SearchBriefPrefsSchema>;

export const SearchBriefSourceSchema = z.object({
  prefs: SearchBriefPrefsSchema,
  evidence: SeekerMatchEvidenceSchema,
  profile: z.object({
    name: z.string(),
    summary: z.string()
  })
});
export type SearchBriefSource = z.infer<typeof SearchBriefSourceSchema>;

export const SearchBriefStructuredSchema = SearchBriefSourceSchema.pick({
  prefs: true,
  profile: true
});
export type SearchBriefStructured = z.infer<typeof SearchBriefStructuredSchema>;

export const GetSearchBriefOutputSchema = z.object({
  markdown: z.string().nullable(),
  hash: z.string(),
  structured: SearchBriefStructuredSchema,
  proseSkipped: z.boolean(),
  previousMarkdown: z.string().nullable().optional(),
  /** True only on the ensure that rebuilt. File Diff uses this call, not later cache hits. */
  rebuilt: z.boolean().optional()
});
export type GetSearchBriefOutput = z.infer<typeof GetSearchBriefOutputSchema>;

type BriefPrefsSource = Pick<
  JobPreference & Partial<JobPreferenceFacetFields>,
  keyof SearchBriefPrefs
>;

export function searchBriefPrefsFromPreference(prefs: BriefPrefsSource): SearchBriefPrefs {
  return {
    workModes: prefs.workModes,
    roleKeywords: prefs.roleKeywords,
    salaryMin: prefs.salaryMin,
    salaryCurrency: prefs.salaryCurrency,
    categories: prefs.categories ?? null,
    regions: prefs.regions ?? null,
    countries: prefs.countries ?? null,
    cities: prefs.cities ?? null
  };
}

function fingerprintStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.toSorted((a, b) => a.localeCompare(b));
}

export function buildSearchBriefSource(input: {
  prefs: BriefPrefsSource;
  evidence: SeekerMatchEvidence;
  profile: { name: string; summary: string };
}): SearchBriefSource {
  return {
    prefs: searchBriefPrefsFromPreference(input.prefs),
    evidence: {
      roleTitles: fingerprintStrings(input.evidence.roleTitles),
      organizations: fingerprintStrings(input.evidence.organizations),
      stackNames: fingerprintStrings(input.evidence.stackNames),
      featuredStackNames: fingerprintStrings(input.evidence.featuredStackNames),
      projectTitles: fingerprintStrings(input.evidence.projectTitles)
    },
    profile: {
      name: input.profile.name,
      summary: input.profile.summary
    }
  };
}

function stableValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stableValue);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).toSorted()) {
    out[key] = stableValue(obj[key]);
  }
  return out;
}

export function stableSearchBriefSourceJson(source: SearchBriefSource): string {
  return JSON.stringify(stableValue(source));
}

export function previousMarkdownAfterInvalidate(
  currentMarkdown: string | null | undefined,
  storedPreviousMarkdown: string | null | undefined
): string | null {
  return currentMarkdown ?? storedPreviousMarkdown ?? null;
}

function joinOr(values: readonly string[], empty: string): string {
  return values.length > 0 ? values.join(", ") : empty;
}

/** Facet geography lines; empty lists are omitted. */
function locationLines(prefs: SearchBriefPrefs): string[] {
  const lines: string[] = [];
  const regions = prefs.regions ?? [];
  const countries = prefs.countries ?? [];
  const cities = prefs.cities ?? [];
  if (regions.length > 0) lines.push(`- Regions: ${joinOr(regions, "none")}`);
  if (countries.length > 0) lines.push(`- Countries: ${joinOr(countries, "none")}`);
  if (cities.length > 0) lines.push(`- Cities: ${joinOr(cities, "none")}`);
  return lines;
}

function exampleTitlesLine(prefs: SearchBriefPrefs): string | null {
  const keywords = prefs.roleKeywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) return keywords.join(", ");
  const categories = prefs.categories ?? [];
  if (categories.length > 0) return categories.join(", ");
  return null;
}

function formatSalaryFloor(prefs: SearchBriefPrefs): string {
  if (prefs.salaryMin == null) return "none";
  const currency = prefs.salaryCurrency?.trim();
  return currency ? `${prefs.salaryMin} ${currency}` : String(prefs.salaryMin);
}

export function renderSearchBriefLists(
  prefs: SearchBriefPrefs,
  skillsParagraph?: string | null
): string {
  const targetJobs: string[] = [];
  const titles = exampleTitlesLine(prefs);
  if (titles) targetJobs.push(`- Example titles: ${titles}`);
  targetJobs.push(`- Modes: ${joinOr(prefs.workModes, "any")}`);

  const geography = locationLines(prefs);

  const skills: string[] = [];
  const paragraph = skillsParagraph?.trim();
  if (paragraph) skills.push(paragraph);

  const sections = [
    "## Target jobs",
    ...targetJobs,
    "",
    ...(geography.length > 0 ? ["## Location", ...geography, ""] : []),
    "## Compensation",
    `- Minimum monthly: ${formatSalaryFloor(prefs)}`,
    "",
    "## Skills",
    ...skills
  ];

  return sections.join("\n");
}

export function renderSearchBriefMarkdown(input: {
  prefs: SearchBriefPrefs;
  opening?: string | null;
  skillsParagraph?: string | null;
}): string {
  const lists = renderSearchBriefLists(input.prefs, input.skillsParagraph);
  const opening = input.opening?.trim();
  return opening ? `${opening}\n\n${lists}` : lists;
}
