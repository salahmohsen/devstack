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

export function createInputFromJdProposal(
  input: ProposeApplicationFromJdCardInput
): CreateApplicationInput {
  const url = emptyToNull(input.url);
  const applyUrl = emptyToNull(input.applyUrl);
  const platform = url ? inferApplicationSource(url) : null;
  return {
    title: input.title.trim().length > 0 ? input.title.trim() : "Untitled role",
    companyName: input.companyName.trim().length > 0 ? input.companyName.trim() : "Unknown company",
    description: emptyToNull(input.description),
    url,
    applyUrl,
    location: emptyToNull(input.location),
    matchScore: input.matchScore ?? null,
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
    requiredSkills: (input.requiredSkills ?? []).map((name) => {
      return { name, stackId: null as string | null, band: "required" as const };
    }),
    preferredSkills: (input.preferredSkills ?? []).map((name) => {
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

/** Prefer the richer listing extract when the model only copied a teaser. */
export function mergeJdProposalWithListingPreview(
  input: ProposeApplicationFromJdCardInput,
  preview: PreviewListingOutput | null | undefined
): ProposeApplicationFromJdCardInput {
  const previewDesc = preview?.description?.trim() ?? "";
  const inputDesc = input.description.trim();
  const description =
    previewDesc.length > inputDesc.length + 80 ? previewDesc : inputDesc || previewDesc;
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
  const workMode =
    input.workMode ?? refineWorkModeFromDescription(preview?.workMode ?? null, description);
  const salaryFromInput = input.salaryRange?.trim() ?? "";
  const salaryRange = salaryFromInput.length > 0 ? salaryFromInput : (preview?.salaryRange ?? null);
  const titleFromInput = input.title.trim();
  const companyFromInput = input.companyName.trim();
  const previewCompany = preview?.companyName?.trim() ?? "";
  const previewTitle = preview?.title?.trim() ?? "";
  const locationFromInput = input.location?.trim() ?? "";
  const departmentFromInput = input.department?.trim() ?? "";
  const datePostedFromInput = input.datePosted?.trim() ?? "";
  const experienceFromInput = input.experience?.trim() ?? "";
  const experienceFromPreview = preview?.experience?.trim() ?? "";
  const experience =
    experienceFromInput.length > 0
      ? experienceFromInput
      : experienceFromPreview.length > 0
        ? experienceFromPreview
        : extractExperienceFromDescription(description);
  const inputEmployment =
    input.employmentType && input.employmentType !== "unknown" ? input.employmentType : null;
  const previewLooksReal =
    preview?.ok === true &&
    previewCompany.length > 0 &&
    !isGarbageCompany(previewCompany) &&
    previewDesc.length > 200;
  const inputScore = typeof input.matchScore === "number" ? input.matchScore : null;
  const previewScore = typeof preview?.matchScore === "number" ? preview.matchScore : null;
  const matchScore =
    inputScore != null && inputScore > 0 ? inputScore : (previewScore ?? inputScore);
  const notes =
    previewLooksReal && isStaleFetchFailureNote(input.notes) ? null : (input.notes ?? null);
  const url = canonicalizeJobUrl(input.url ?? "") ?? input.url;
  const applyUrl = canonicalizeJobUrl(input.applyUrl ?? "") ?? input.applyUrl;
  return {
    ...input,
    url,
    applyUrl,
    title:
      !isWeakProposalTitle(titleFromInput) && titleFromInput.length > 0
        ? titleFromInput
        : previewTitle || input.title,
    companyName: !isWeakProposalCompany(companyFromInput)
      ? companyFromInput
      : previewCompany || input.companyName,
    location:
      locationFromInput.length > 0 ? locationFromInput : (preview?.location ?? input.location),
    description,
    workMode,
    salaryRange,
    employmentType: inputEmployment ?? preview?.employmentType ?? null,
    department:
      departmentFromInput.length > 0
        ? departmentFromInput
        : (preview?.department ?? input.department),
    datePosted:
      datePostedFromInput.length > 0
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
