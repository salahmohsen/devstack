import {
  buildApplicationSourceTags,
  canGenerateAgentTake,
  canonicalizeJobUrl,
  extractExperienceFromDescription,
  extractSkillsFromJobDescription,
  inferApplicationSource,
  isGarbageCompany,
  isGarbageJobTitle,
  refineWorkModeFromDescription,
  type CreateApplicationInput,
  type PreviewListingOutput,
  type ProposeApplicationFromJdOutput
} from "@tsu-stack/core";

import { type ProposeApplicationFromJdCardInput } from "@/features/agent-hub/lib/hub-tool-names";

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** LLM / extract often emit "None", "n/a", or bare hosts — drop anything that is not http(s). */
export function sanitizeOptionalHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) return null;
  if (/^(none|null|undefined|n\/?a|nil|-)$/i.test(trimmed)) return null;
  const canonical = canonicalizeJobUrl(trimmed);
  if (canonical) return canonical;
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function coerceCreateMatchScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function createInputFromJdProposal(
  input: ProposeApplicationFromJdCardInput
): CreateApplicationInput {
  const url = sanitizeOptionalHttpUrl(input.url);
  const applyUrl = sanitizeOptionalHttpUrl(input.applyUrl);
  const platform = url ? inferApplicationSource(url) : null;
  return {
    title: input.title.trim().length > 0 ? input.title.trim() : "Untitled role",
    companyName: input.companyName.trim().length > 0 ? input.companyName.trim() : "Unknown company",
    description: emptyToNull(input.description),
    url,
    applyUrl,
    location: emptyToNull(input.location),
    matchScore: coerceCreateMatchScore(input.matchScore),
    notes: emptyToNull(input.notes),
    applyMethod: input.applyMethod ?? undefined,
    source: input.source ?? platform,
    sourceLabel: null,
    sourceTags: buildApplicationSourceTags({
      channel: "hub",
      platform: input.source ?? platform
    }),
    salaryRange: emptyToNull(input.salaryRange),
    workMode: input.workMode ?? undefined,
    employmentType:
      input.employmentType && input.employmentType !== "unknown" ? input.employmentType : undefined,
    requiredSkills: (input.requiredSkills ?? [])
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => {
        return { name, stackId: null as string | null, band: "required" as const };
      }),
    preferredSkills: (input.preferredSkills ?? [])
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => {
        return { name, stackId: null as string | null, band: "preferred" as const };
      }),
    stage: "saved",
    hiringUrgency: "unknown"
  };
}

export function jdProposalOutput(
  action: ProposeApplicationFromJdOutput["action"],
  applicationId?: string
): ProposeApplicationFromJdOutput {
  if (!applicationId) return { action };
  return { action, applicationId };
}

function listingKeys(url: string | null | undefined): string[] {
  const trimmed = url?.trim() ?? "";
  if (trimmed.length === 0) return [];
  const canon = canonicalizeJobUrl(trimmed) ?? trimmed;
  return [...new Set([trimmed, canon])];
}

function urlsOverlap(
  left: { url?: string | null; applyUrl?: string | null },
  right: { url?: string | null; applyUrl?: string | null }
): boolean {
  const a = new Set([...listingKeys(left.url), ...listingKeys(left.applyUrl)]);
  if (a.size === 0) return false;
  for (const key of [...listingKeys(right.url), ...listingKeys(right.applyUrl)]) {
    if (a.has(key)) return true;
  }
  return false;
}

type CrmListingRow = {
  url?: string | null;
  applyUrl?: string | null;
};

function isWeakProposalCompany(company: string): boolean {
  const trimmed = company.trim();
  return trimmed.length === 0 || isGarbageCompany(trimmed);
}

function isWeakProposalTitle(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length === 0 || isGarbageJobTitle(trimmed);
}

export function isStaleFetchFailureNote(notes: string | null | undefined): boolean {
  if (!notes?.trim()) return false;
  return /\b(login wall|requires login|presented a login|sign[- ]?in (to|instantly)|auth wall|could not be evaluated|couldn'?t (fetch|open|load|read)|blocked (the )?page|empty page)\b/i.test(
    notes
  );
}

/** True when the hydrated card is ready for a take and the model did not write a real one. */
export function shouldGenerateJdProposalTake(input: ProposeApplicationFromJdCardInput): boolean {
  const notes = input.notes?.trim() ?? "";
  if (notes.length > 0 && !isStaleFetchFailureNote(notes)) return false;
  return canGenerateAgentTake({
    title: input.title,
    companyName: input.companyName,
    location: input.location,
    employmentType: input.employmentType,
    salaryRange: input.salaryRange,
    description: input.description
  });
}

/**
 * Hydrate the GenUI card from `previewListing` for the proposed URL.
 * When the preview extract looks real, it is authoritative for identity + body —
 * the model often invents a different job from thread context.
 */
export function mergeJdProposalWithListingPreview(
  input: ProposeApplicationFromJdCardInput,
  preview: PreviewListingOutput | null | undefined
): ProposeApplicationFromJdCardInput {
  const previewDesc = preview?.description?.trim() ?? "";
  const inputDesc = input.description.trim();
  const previewCompany = preview?.companyName?.trim() ?? "";
  const previewTitle = preview?.title?.trim() ?? "";
  const previewLooksReal =
    preview?.ok === true &&
    previewCompany.length > 0 &&
    !isGarbageCompany(previewCompany) &&
    previewDesc.length > 200;

  // Real preview wins the body. Otherwise keep the longer of teaser vs extract.
  const description = previewLooksReal
    ? previewDesc
    : previewDesc.length > inputDesc.length + 80
      ? previewDesc
      : inputDesc || previewDesc;

  const fromDesc = extractSkillsFromJobDescription(description);
  const previewRequired = preview?.requiredSkills ?? [];
  const previewPreferred = preview?.preferredSkills ?? [];
  const requiredSkills =
    fromDesc.required.length > 0
      ? fromDesc.required
      : previewRequired.length > 0
        ? previewRequired
        : (input.requiredSkills ?? []);
  const preferredSkills =
    fromDesc.preferred.length > 0
      ? fromDesc.preferred
      : previewPreferred.length > 0
        ? previewPreferred
        : (input.preferredSkills ?? []);

  const titleFromInput = input.title.trim();
  const companyFromInput = input.companyName.trim();
  const locationFromInput = input.location?.trim() ?? "";
  const departmentFromInput = input.department?.trim() ?? "";
  const datePostedFromInput = input.datePosted?.trim() ?? "";
  const experienceFromInput = input.experience?.trim() ?? "";
  const experienceFromPreview = preview?.experience?.trim() ?? "";
  const experience = previewLooksReal
    ? experienceFromPreview || experienceFromInput || extractExperienceFromDescription(description)
    : experienceFromInput.length > 0
      ? experienceFromInput
      : experienceFromPreview.length > 0
        ? experienceFromPreview
        : extractExperienceFromDescription(description);

  const inputEmployment =
    input.employmentType && input.employmentType !== "unknown" ? input.employmentType : null;
  const workMode = previewLooksReal
    ? (refineWorkModeFromDescription(preview?.workMode ?? null, description) ??
      input.workMode ??
      null)
    : (input.workMode ?? refineWorkModeFromDescription(preview?.workMode ?? null, description));
  const salaryFromInput = input.salaryRange?.trim() ?? "";
  const salaryRange = previewLooksReal
    ? (preview?.salaryRange ?? (salaryFromInput.length > 0 ? salaryFromInput : null))
    : salaryFromInput.length > 0
      ? salaryFromInput
      : (preview?.salaryRange ?? null);

  const inputScore = typeof input.matchScore === "number" ? input.matchScore : null;
  const heuristic = typeof preview?.matchScore === "number" ? preview.matchScore : null;
  const rawScore = heuristic ?? inputScore;
  const matchScore =
    typeof rawScore === "number" && Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : null;
  const notes =
    previewLooksReal && isStaleFetchFailureNote(input.notes) ? null : (input.notes ?? null);
  const url = sanitizeOptionalHttpUrl(input.url);
  const applyUrl = sanitizeOptionalHttpUrl(input.applyUrl);

  // Identity: real preview always wins (LLM often swaps jobs from chat history).
  const title = previewLooksReal
    ? previewTitle || titleFromInput || input.title
    : !isWeakProposalTitle(titleFromInput) && titleFromInput.length > 0
      ? titleFromInput
      : previewTitle || input.title;
  const companyName = previewLooksReal
    ? previewCompany || companyFromInput || input.companyName
    : !isWeakProposalCompany(companyFromInput)
      ? companyFromInput
      : previewCompany || input.companyName;
  const location = previewLooksReal
    ? (preview?.location ?? (locationFromInput.length > 0 ? locationFromInput : null))
    : locationFromInput.length > 0
      ? locationFromInput
      : (preview?.location ?? input.location);

  return {
    ...input,
    url,
    applyUrl,
    title,
    companyName,
    location,
    description,
    workMode,
    salaryRange,
    employmentType: previewLooksReal
      ? (preview?.employmentType ?? inputEmployment)
      : (inputEmployment ?? preview?.employmentType ?? null),
    department: previewLooksReal
      ? (preview?.department ?? (departmentFromInput.length > 0 ? departmentFromInput : null))
      : departmentFromInput.length > 0
        ? departmentFromInput
        : (preview?.department ?? input.department),
    datePosted: previewLooksReal
      ? (preview?.datePosted ?? (datePostedFromInput.length > 0 ? datePostedFromInput : null))
      : datePostedFromInput.length > 0
        ? datePostedFromInput
        : (preview?.datePosted ?? input.datePosted),
    experience,
    requiredSkills,
    preferredSkills,
    matchScore,
    notes
  };
}

/** Remount: recover dismiss from CRM when Mastra omitted the tool output. */
export function inferJdCardActionFromCrm(
  input: ProposeApplicationFromJdCardInput,
  lists: { dismissed?: readonly CrmListingRow[] }
): ProposeApplicationFromJdOutput["action"] | null {
  if (lists.dismissed?.some((row) => urlsOverlap(input, row))) return "dismiss";
  return null;
}
