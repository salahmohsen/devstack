import { z } from "zod";

import { type ApplicationSchemaInsert, type ApplicationSchemaSelect } from "@tsu-stack/db/types";

export const ApplicationStageSchema = z.enum([
  "saved",
  "applied",
  "screening",
  "interview",
  "offer"
]);
export type ApplicationStage = z.infer<typeof ApplicationStageSchema>;

export const ApplicationOutcomeSchema = z.enum(["rejected", "withdrawn", "ghosted", "accepted"]);
export type ApplicationOutcome = z.infer<typeof ApplicationOutcomeSchema>;

export const HiringUrgencySchema = z.enum(["unknown", "immediate", "soon", "flexible"]);
export type HiringUrgency = z.infer<typeof HiringUrgencySchema>;

export const ApplicationSourceSchema = z.enum([
  "linkedin",
  "indeed",
  "company_website",
  "referral",
  "recruiter",
  "other"
]);
export type ApplicationSource = z.infer<typeof ApplicationSourceSchema>;

export const ApplicationApplyMethodSchema = z.enum(["easy_apply", "external", "email", "unknown"]);
export type ApplicationApplyMethod = z.infer<typeof ApplicationApplyMethodSchema>;

const optionalText = z
  .union([z.string(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

const optionalUrl = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

const optionalSource = z
  .union([ApplicationSourceSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

/** 0–100 score, or null to clear; omit to leave unchanged on update. */
const optionalMatchScore = z.number().int().min(0).max(100).nullable().optional();

const optionalEmail = z
  .union([z.string().email(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

export const ApplicationOutputSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  applyUrl: z.string().nullable(),
  applyMethod: ApplicationApplyMethodSchema,
  matchScore: z.number().int().min(0).max(100).nullable(),
  source: ApplicationSourceSchema.nullable(),
  location: z.string().nullable(),
  salaryRange: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  stage: ApplicationStageSchema,
  // coerce: JSON transport may string-serialize timestamps
  stageChangedAt: z.coerce.date(),
  outcome: ApplicationOutcomeSchema.nullable(),
  outcomeAt: z.coerce.date().nullable(),
  hiringUrgency: HiringUrgencySchema,
  resumeId: z.string().nullable(),
  recruiterEmail: z.string().nullable(),
  coverLetterBody: z.string().nullable(),
  coverLetterR2Key: z.string().nullable(),
  coverLetterFilename: z.string().nullable(),
  outreachSubject: z.string().nullable(),
  outreachBody: z.string().nullable(),
  outreachSentAt: z.coerce.date().nullable(),
  outreachProviderMessageId: z.string().nullable(),
  /** Structured draft JSON; validated at generate/accept, not on every list read. */
  applyPackageDraft: z.unknown().nullable(),
  applyPackageDraftedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
}) satisfies z.ZodType<Omit<ApplicationSchemaSelect, "userId">>;

export const ApplicationListOutputSchema = z.array(ApplicationOutputSchema);

export const CreateApplicationInputSchema = z.object({
  companyName: z.string().min(1),
  title: z.string().min(1),
  url: optionalUrl,
  applyUrl: optionalUrl,
  applyMethod: ApplicationApplyMethodSchema.optional(),
  matchScore: optionalMatchScore,
  source: optionalSource,
  location: optionalText,
  salaryRange: optionalText,
  description: optionalText,
  notes: optionalText,
  stage: ApplicationStageSchema.optional(),
  hiringUrgency: HiringUrgencySchema.optional(),
  resumeId: z.string().nullable().optional()
}) satisfies z.ZodType<
  Partial<
    Omit<
      ApplicationSchemaInsert,
      "id" | "userId" | "createdAt" | "updatedAt" | "stageChangedAt" | "outcome" | "outcomeAt"
    >
  > & {
    companyName: string;
    title: string;
  }
>;

/** Body-field patch only — never stage/outcome (use dedicated procedures). */
export const UpdateApplicationInputSchema = z.object({
  companyName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  url: optionalUrl,
  applyUrl: optionalUrl,
  applyMethod: ApplicationApplyMethodSchema.optional(),
  matchScore: optionalMatchScore,
  source: optionalSource,
  location: optionalText,
  salaryRange: optionalText,
  description: optionalText,
  notes: optionalText,
  hiringUrgency: HiringUrgencySchema.optional(),
  resumeId: z.string().nullable().optional(),
  /** Editable after Accept (Review materials). */
  recruiterEmail: optionalEmail,
  coverLetterBody: optionalText,
  outreachSubject: optionalText,
  outreachBody: optionalText
});

export const UpdateStageInputSchema = z.object({
  id: z.string().min(1),
  stage: ApplicationStageSchema
});

export const SetOutcomeInputSchema = z.object({
  id: z.string().min(1),
  outcome: ApplicationOutcomeSchema
});

export const DeleteApplicationsInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export type ApplicationOutput = z.infer<typeof ApplicationOutputSchema>;
export type ApplicationListOutput = z.infer<typeof ApplicationListOutputSchema>;
export type CreateApplicationInput = z.infer<typeof CreateApplicationInputSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationInputSchema>;
export type UpdateStageInput = z.infer<typeof UpdateStageInputSchema>;
export type SetOutcomeInput = z.infer<typeof SetOutcomeInputSchema>;
export type DeleteApplicationsInput = z.infer<typeof DeleteApplicationsInputSchema>;
