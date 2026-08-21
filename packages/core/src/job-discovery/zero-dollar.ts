import { type WorkMode } from "#@/job-preference/types";

import { normalizeHiringRegion, resolveRemoteListingSlug } from "./hiring-region";

export type ZeroDollarCandidate = {
  workMode: WorkMode | null;
  hiringRegion: string | null;
  location: string | null;
  employmentType: string | null;
  description: string | null;
  skills: string[];
};

const EMPLOYMENT_PHRASES: readonly { re: RegExp; value: string }[] = [
  { re: /\bfull[\s_-]*time\b/i, value: "full_time" },
  { re: /\bpart[\s_-]*time\b/i, value: "part_time" },
  { re: /\binternships?\b/i, value: "internship" },
  { re: /\bintern\b/i, value: "internship" },
  { re: /\bcontract(?:or|ing)?\b/i, value: "contract" }
];

/** Layer 3: JD / location prose. Not written to the catalog. */
export function inferWorkModeFromText(text: string | null | undefined): WorkMode | null {
  const blob = text?.trim() ?? "";
  if (!blob) return null;
  if (/\bhybrid\b/i.test(blob)) return "hybrid";
  if (
    /\b(?:100\s*%\s*)?remote\b/i.test(blob) ||
    /\btelecommute\b/i.test(blob) ||
    /\bwfh\b/i.test(blob)
  ) {
    return "remote";
  }
  if (/\bon[\s-]?site\b/i.test(blob)) return "onsite";
  return null;
}

/** Layer 3: Full-time / Contract / etc. from candidate text. */
export function inferEmploymentFromText(text: string | null | undefined): string | null {
  const blob = text?.trim() ?? "";
  if (!blob) return null;
  for (const phrase of EMPLOYMENT_PHRASES) {
    if (phrase.re.test(blob)) return phrase.value;
  }
  return null;
}

function firstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

/**
 * Fill missing workplace fields from location + JD dictionaries.
 * Never invents workMode when no $0 signal exists (unknown stays drop).
 */
export function applyZeroDollarCandidate(input: ZeroDollarCandidate): ZeroDollarCandidate {
  const blob = [input.location, input.description].filter(Boolean).join("\n");
  const workMode = input.workMode ?? inferWorkModeFromText(blob);
  const resolved = resolveRemoteListingSlug(input.hiringRegion, input.location);
  const hiringRegion = firstNonBlank(
    resolved.specificUnknown ? null : resolved.slug,
    workMode === "remote" ? normalizeHiringRegion(input.description) : null,
    input.hiringRegion
  );
  const employmentType = firstNonBlank(input.employmentType, inferEmploymentFromText(blob));
  const skills = input.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0);

  return {
    workMode,
    hiringRegion,
    location: firstNonBlank(input.location),
    employmentType,
    description: input.description,
    skills
  };
}
