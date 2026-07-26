import { z } from "zod";

import { contactTypeSchema } from "#@/profile/types";

export const ResumeImportContactSchema = z.object({
  type: contactTypeSchema,
  value: z.string().min(1),
  /** Filled by `withContactDefaultIcons` when missing; never required from extract. */
  icon: z.string().optional()
});

export type ResumeImportContact = z.infer<typeof ResumeImportContactSchema>;

export const ResumeImportExperienceDraftSchema = z.object({
  title: z.string(),
  organization: z.string(),
  description: z.string(),
  fromDate: z.string().nullable().optional(),
  toDate: z.string().nullable().optional(),
  isPresent: z.boolean().optional(),
  clientId: z.string().min(1),
  selected: z.boolean().default(true),
  includedInPortfolio: z.boolean().default(true)
});

export type ResumeImportExperienceDraft = z.infer<typeof ResumeImportExperienceDraftSchema>;

export const ResumeImportProjectDraftSchema = z.object({
  title: z.string(),
  year: z.number().int(),
  summary: z.string(),
  description: z.string(),
  experienceClientId: z.string().nullable().optional(),
  stackNames: z.array(z.string()).default([]),
  clientId: z.string().min(1),
  selected: z.boolean().default(true),
  includedInPortfolio: z.boolean().default(true)
});

export type ResumeImportProjectDraft = z.infer<typeof ResumeImportProjectDraftSchema>;

export const ResumeImportStackDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  selected: z.boolean().default(true),
  includedInPortfolio: z.boolean().default(true)
});

export type ResumeImportStackDraft = z.infer<typeof ResumeImportStackDraftSchema>;

export const ResumeImportDraftMetaSchema = z.object({
  warnings: z.array(z.string()).optional(),
  sourceFilename: z.string().optional()
});

export type ResumeImportDraftMeta = z.infer<typeof ResumeImportDraftMetaSchema>;

export const ResumeImportProfileDraftSchema = z.object({
  /** Required after normalize; Apply enforces min length 2. */
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  /** Omit/empty → keep existing user.email on Apply. */
  email: z.string().trim().nullable().optional(),
  summary: z.string().nullable().optional(),
  /**
   * Omit, undefined, or `[]` → contact merge no-op (leave existing contacts).
   * Non-empty → merge by type (update/insert; never wipe missing types).
   */
  contacts: z.array(ResumeImportContactSchema).default([])
});

export type ResumeImportProfileDraft = z.infer<typeof ResumeImportProfileDraftSchema>;

/**
 * Client-held resume import draft (review → Apply).
 *
 * **EMPTY_DRAFT:** Reject Apply only when there are no selected experiences,
 * projects, or stacks **and** the profile is a no-op (name/email/summary/contacts
 * all effectively unchanged vs the current user). Profile-only meaningful updates
 * (real name/summary/contact change) are allowed.
 */
export const ResumeImportDraftSchema = z.object({
  profile: ResumeImportProfileDraftSchema,
  experiences: z.array(ResumeImportExperienceDraftSchema).default([]),
  projects: z.array(ResumeImportProjectDraftSchema).default([]),
  stacks: z.array(ResumeImportStackDraftSchema).default([]),
  meta: ResumeImportDraftMetaSchema.optional()
});

export type ResumeImportDraft = z.infer<typeof ResumeImportDraftSchema>;

/** Client → extract streaming procedure. */
export const ResumeImportExtractClientInputSchema = z.object({
  objectKey: z.string().min(1),
  filename: z.string().optional()
});

export type ResumeImportExtractClientInput = z.infer<typeof ResumeImportExtractClientInputSchema>;

/**
 * API-enriched payload for the Mastra resume-import workflow
 * (PDF text + existing profile/stack snapshot).
 */
export const ResumeImportWorkflowInputSchema = z.object({
  resumeText: z.string().min(1),
  sourceFilename: z.string().optional(),
  existingProfile: z.object({
    name: z.string(),
    email: z.string().optional(),
    summary: z.string().nullable().optional()
  }),
  existingStacks: z.array(
    z.object({
      id: z.string(),
      name: z.string()
    })
  )
});

export type ResumeImportWorkflowInput = z.infer<typeof ResumeImportWorkflowInputSchema>;

export const OnboardingStatusOutputSchema = z.object({
  onboardingCompletedAt: z.coerce.date().nullable()
});

export type OnboardingStatusOutput = z.infer<typeof OnboardingStatusOutputSchema>;

/**
 * Reviewed draft + optional session PDF key for post-commit best-effort delete.
 *
 * **EMPTY_DRAFT:** same rule as {@link ResumeImportDraftSchema} — reject only when
 * no selected exp/project/stack **and** profile is effectively a no-op.
 */
export const OnboardingApplyInputSchema = ResumeImportDraftSchema.extend({
  objectKey: z.string().optional()
});

export type OnboardingApplyInput = z.infer<typeof OnboardingApplyInputSchema>;

export const OnboardingSkipInputSchema = z.object({
  objectKey: z.string().optional()
});

export type OnboardingSkipInput = z.infer<typeof OnboardingSkipInputSchema>;

export const OnboardingDiscardSourceInputSchema = z.object({
  objectKey: z.string().min(1)
});

export type OnboardingDiscardSourceInput = z.infer<typeof OnboardingDiscardSourceInputSchema>;
