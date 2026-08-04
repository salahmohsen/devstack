import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";
import { ApplicationApplyMethodSchema, ApplicationSourceSchema } from "#@/application/types";

/** Job descriptions shorter than this (after trim) trigger listing page fetch. */
export const THIN_JD_DESCRIPTION_CHARS = 400;

/**
 * True when description is missing or shorter than {@link THIN_JD_DESCRIPTION_CHARS}.
 * Callers also require a fetchable listing/apply URL before fetching.
 */
export function isThinJobDescription(description: string | null | undefined): boolean {
  if (description == null) return true;
  return description.trim().length < THIN_JD_DESCRIPTION_CHARS;
}

const optionalNullableEmail = z
  .union([z.string().email(), z.literal(""), z.null()])
  .transform((value) => (value === "" ? null : value));

export const ApplyPackageJobContextSchema = z.object({
  title: z.string().min(1),
  companyName: z.string().min(1),
  /** Description text used for generation (may include fetched page text). */
  descriptionUsed: z.string(),
  listingFetched: z.boolean(),
  listingUrl: z.string().nullable().optional()
});
export type ApplyPackageJobContext = z.infer<typeof ApplyPackageJobContextSchema>;

export const ApplyPackageExperienceDraftSchema = z.object({
  experienceId: z.string().min(1),
  include: z.boolean(),
  companyName: z.string().min(1),
  title: z.string().min(1),
  /** AI rewrite; grounded in portfolio evidence only. */
  rewrittenBullets: z.array(z.string())
});
export type ApplyPackageExperienceDraft = z.infer<typeof ApplyPackageExperienceDraftSchema>;

export const ApplyPackageProjectDraftSchema = z.object({
  projectId: z.string().min(1),
  include: z.boolean(),
  name: z.string().min(1),
  rewrittenSummary: z.string(),
  rewrittenBullets: z.array(z.string()).optional()
});
export type ApplyPackageProjectDraft = z.infer<typeof ApplyPackageProjectDraftSchema>;

export const ApplyPackageStackDraftSchema = z.object({
  stackId: z.string().min(1),
  include: z.boolean(),
  name: z.string().min(1)
});
export type ApplyPackageStackDraft = z.infer<typeof ApplyPackageStackDraftSchema>;

/**
 * Structured apply package draft persisted on `application.applyPackageDraft`.
 * Cleared on Accept (accepted fields live on dedicated columns).
 */
export const ApplyPackageDraftSchema = z.object({
  applicationId: z.string().min(1),
  generatedAt: z.string().min(1),
  jobContext: ApplyPackageJobContextSchema,
  proposedRecruiterEmail: optionalNullableEmail.nullable(),
  professionalSummary: z.string().nullable(),
  experiences: z.array(ApplyPackageExperienceDraftSchema),
  projects: z.array(ApplyPackageProjectDraftSchema),
  stacks: z.array(ApplyPackageStackDraftSchema),
  coverLetterBody: z.string(),
  outreachSubject: z.string(),
  outreachBody: z.string(),
  /** AI rationale for the human reviewer. */
  notes: z.string().optional()
});
export type ApplyPackageDraft = z.infer<typeof ApplyPackageDraftSchema>;

/** Portfolio snapshot sent into the Mastra apply-package workflow. */
export const ApplyPackagePortfolioSnapshotSchema = z.object({
  profile: z.object({
    name: z.string(),
    email: z.string().optional(),
    summary: z.string().nullable().optional()
  }),
  contacts: z
    .array(
      z.object({
        type: z.string(),
        value: z.string()
      })
    )
    .default([]),
  experiences: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      organization: z.string(),
      description: z.string(),
      fromDate: z.string().nullable().optional(),
      toDate: z.string().nullable().optional(),
      isPresent: z.boolean().optional()
    })
  ),
  projects: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string(),
      summary: z.string(),
      description: z.string(),
      /** Private project analysis when present — signal only for AI. */
      analysis: z.string().nullable().optional(),
      year: z.number().int().optional()
    })
  ),
  stacks: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string()
    })
  )
});
export type ApplyPackagePortfolioSnapshot = z.infer<typeof ApplyPackagePortfolioSnapshotSchema>;

/**
 * Shared API ↔ agent payload for `apply-package-workflow`.
 * Server builds this after preflight + optional thin-JD page fetch.
 */
export const ApplyPackageWorkflowInputSchema = z.object({
  applicationId: z.string().min(1),
  job: z.object({
    title: z.string().min(1),
    companyName: z.string().min(1),
    description: z.string().nullable(),
    url: z.string().nullable().optional(),
    applyUrl: z.string().nullable().optional(),
    applyMethod: ApplicationApplyMethodSchema.optional(),
    matchScore: z.number().int().min(0).max(100).nullable().optional(),
    location: z.string().nullable().optional(),
    salaryRange: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    source: ApplicationSourceSchema.nullable().optional()
  }),
  /** Server-fetched listing page text when JD was thin. */
  listingPageText: z.string().nullable().optional(),
  listingUrl: z.string().nullable().optional(),
  portfolio: ApplyPackagePortfolioSnapshotSchema,
  /** Server-resolved BYO model + key. Never log `llm.apiKey`. */
  llm: RuntimeLlmConfigSchema.optional()
});
export type ApplyPackageWorkflowInput = z.infer<typeof ApplyPackageWorkflowInputSchema>;

export const GenerateApplyPackageInputSchema = z.object({
  applicationId: z.string().min(1)
});
export type GenerateApplyPackageInput = z.infer<typeof GenerateApplyPackageInputSchema>;

/**
 * Accept materializes PDFs + accepted fields.
 * Prefer client-edited `draft`; server falls back to stored draft when omitted.
 */
export const AcceptApplyPackageInputSchema = z.object({
  applicationId: z.string().min(1),
  draft: ApplyPackageDraftSchema.optional()
});
export type AcceptApplyPackageInput = z.infer<typeof AcceptApplyPackageInputSchema>;

export const SendOutreachInputSchema = z.object({
  applicationId: z.string().min(1)
});
export type SendOutreachInput = z.infer<typeof SendOutreachInputSchema>;
