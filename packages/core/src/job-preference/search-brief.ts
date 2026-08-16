import { createHash } from "node:crypto";

import { z } from "zod";

import { TITLE_PACKS } from "#@/job-discovery/constants";

import {
  JobPreferenceFieldsSchema,
  SeekerMatchEvidenceSchema,
  type JobPreference,
  type SeekerMatchEvidence
} from "./types";

export const SearchBriefPrefsSchema = JobPreferenceFieldsSchema.pick({
  workModes: true,
  locations: true,
  remoteRegions: true,
  roleKeywords: true,
  excludeKeywords: true,
  salaryMin: true,
  salaryCurrency: true,
  levelFloor: true,
  titleId: true,
  customTitle: true
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
  previousMarkdown: z.string().nullable().optional()
});
export type GetSearchBriefOutput = z.infer<typeof GetSearchBriefOutputSchema>;

export function searchBriefPrefsFromPreference(
  prefs: Pick<JobPreference, keyof SearchBriefPrefs>
): SearchBriefPrefs {
  return {
    workModes: prefs.workModes,
    locations: prefs.locations,
    remoteRegions: prefs.remoteRegions,
    roleKeywords: prefs.roleKeywords,
    excludeKeywords: prefs.excludeKeywords,
    salaryMin: prefs.salaryMin,
    salaryCurrency: prefs.salaryCurrency,
    levelFloor: prefs.levelFloor,
    titleId: prefs.titleId,
    customTitle: prefs.customTitle
  };
}

export function buildSearchBriefSource(input: {
  prefs: Pick<JobPreference, keyof SearchBriefPrefs>;
  evidence: SeekerMatchEvidence;
  profile: { name: string; summary: string };
}): SearchBriefSource {
  return {
    prefs: searchBriefPrefsFromPreference(input.prefs),
    evidence: {
      roleTitles: input.evidence.roleTitles,
      organizations: input.evidence.organizations,
      stackNames: input.evidence.stackNames,
      featuredStackNames: input.evidence.featuredStackNames,
      projectTitles: input.evidence.projectTitles
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

export function hashSearchBriefSource(source: SearchBriefSource): string {
  return createHash("sha256").update(stableSearchBriefSourceJson(source)).digest("hex");
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

function exampleTitlesLine(prefs: SearchBriefPrefs): string | null {
  if (prefs.titleId != null && prefs.titleId !== "custom") {
    return TITLE_PACKS[prefs.titleId].label;
  }
  const custom = prefs.customTitle?.trim();
  if (custom) return custom;
  if (prefs.roleKeywords.length > 0) return prefs.roleKeywords.join(", ");
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
  targetJobs.push(`- Level floor: ${prefs.levelFloor ?? "none"}`);
  targetJobs.push(`- Exclusions: ${joinOr(prefs.excludeKeywords, "none")}`);

  const skills: string[] = [];
  const paragraph = skillsParagraph?.trim();
  if (paragraph) skills.push(paragraph);
  skills.push(`- Exclusions: ${joinOr(prefs.excludeKeywords, "none")}`);

  return [
    "## Target jobs",
    ...targetJobs,
    "",
    "## Location",
    `- Modes: ${joinOr(prefs.workModes, "any")}`,
    `- On-site / hybrid places: ${joinOr(prefs.locations, "none — onsite/hybrid will not land")}`,
    `- Remote regions: ${joinOr(prefs.remoteRegions, "worldwide")}`,
    "",
    "## Compensation",
    `- Minimum monthly: ${formatSalaryFloor(prefs)}`,
    "",
    "## Skills",
    ...skills
  ].join("\n");
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
