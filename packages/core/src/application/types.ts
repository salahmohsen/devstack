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

/** Discovery channel + listing platform chips (multi). */
export const ApplicationSourceTagSchema = z.enum([
  "mail",
  "hub",
  "manual",
  "discovery",
  "linkedin",
  "indeed",
  "company_website",
  "referral",
  "recruiter",
  "other"
]);
export type ApplicationSourceTag = z.infer<typeof ApplicationSourceTagSchema>;

export const ApplicationTrackingStatusSchema = z.enum(["inbox", "tracked", "dismissed"]);
export type ApplicationTrackingStatus = z.infer<typeof ApplicationTrackingStatusSchema>;

export const ApplicationActivityKindSchema = z.enum([
  "discovered",
  "promoted",
  "dismissed",
  "restored",
  "note",
  "stage_changed",
  "outcome_set",
  "package_generated"
]);
export type ApplicationActivityKind = z.infer<typeof ApplicationActivityKindSchema>;

export const ApplicationApplyMethodSchema = z.enum(["easy_apply", "external", "email", "unknown"]);
export type ApplicationApplyMethod = z.infer<typeof ApplicationApplyMethodSchema>;

export const EmploymentTypeSchema = z.enum([
  "unknown",
  "full_time",
  "part_time",
  "contract",
  "internship"
]);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

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
  /** Free-text when platform is `other` (e.g. "Jack & Jill"). */
  sourceLabel: z.string().nullable(),
  sourceTags: z.array(z.string()),
  location: z.string().nullable(),
  salaryRange: z.string().nullable(),
  employmentType: EmploymentTypeSchema,
  description: z.string().nullable(),
  notes: z.string().nullable(),
  agentTake: z.string().nullable(),
  sourceMessageId: z.string().nullable(),
  trackingStatus: ApplicationTrackingStatusSchema,
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
  updatedAt: z.coerce.date(),
  /** Computed from job_posting.closedAt join — not a DB column on application. */
  listingClosed: z.boolean().default(false)
}) satisfies z.ZodType<
  Omit<ApplicationSchemaSelect, "userId"> & {
    listingClosed: boolean;
  }
>;

export const ApplicationListOutputSchema = z.array(ApplicationOutputSchema);

export const ApplicationActivityOutputSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  kind: ApplicationActivityKindSchema,
  body: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  actorUserId: z.string().nullable(),
  createdAt: z.coerce.date()
});
export type ApplicationActivityOutput = z.infer<typeof ApplicationActivityOutputSchema>;

export const CreateApplicationInputSchema = z.object({
  companyName: z.string().min(1),
  title: z.string().min(1),
  url: optionalUrl,
  applyUrl: optionalUrl,
  applyMethod: ApplicationApplyMethodSchema.optional(),
  matchScore: optionalMatchScore,
  source: optionalSource,
  sourceLabel: optionalText,
  sourceTags: z.array(ApplicationSourceTagSchema).optional(),
  location: optionalText,
  salaryRange: optionalText,
  employmentType: EmploymentTypeSchema.optional(),
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

export const PromoteApplicationInputSchema = z.object({ id: z.string().min(1) });
export const DismissApplicationInputSchema = z.object({ id: z.string().min(1) });
export const RestoreApplicationInputSchema = z.object({ id: z.string().min(1) });
/** Bulk soft-dismiss inbox jobs (New jobs multi-select). */
export const BatchDismissApplicationsInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100)
});
/** Bulk restore dismissed jobs to New jobs inbox. */
export const BatchRestoreApplicationsInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100)
});
export const ListApplicationActivityInputSchema = z.object({
  applicationId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional()
});
export const AddApplicationNoteInputSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().min(1).max(10_000)
});
export const ListApplicationsInputSchema = z.object({
  trackingStatus: ApplicationTrackingStatusSchema.optional()
});

export const CountApplicationsInputSchema = z.object({
  trackingStatus: ApplicationTrackingStatusSchema
});

export const RegenerateAgentTakeInputSchema = z.object({
  id: z.string().min(1)
});

/** Fix posting URL + re-fetch/extract job details (New jobs). */
export const RefreshApplicationFromUrlInputSchema = z.object({
  id: z.string().min(1),
  url: z.string().url().max(2_000)
});

/** Manual “Scan job alerts” — re-harvest recent job_notifier digests. */
export const ScanJobAlertsInputSchema = z
  .object({
    /** Max digests to enqueue (default 20). */
    limit: z.number().int().min(1).max(40).optional()
  })
  .optional();

export const ScanJobAlertsOutputSchema = z.object({
  digestsFound: z.number().int().nonnegative(),
  enqueued: z.number().int().nonnegative(),
  /** True when REDIS/BullMQ harvest queue is not registered. */
  queueUnavailable: z.boolean()
});

/** Manual “Find jobs now” — enqueue discovery + optional ingest. */
export const FindJobsNowInputSchema = z.object({}).optional();
export const FindJobsNowOutputSchema = z.object({
  enqueued: z.boolean(),
  ingestTriggered: z.boolean(),
  seats: z.number().int().nonnegative(),
  reason: z.enum(["ok", "title_required", "inbox_full", "queue_unavailable"])
});

/** Body-field patch only — never stage/outcome (use dedicated procedures). */
export const UpdateApplicationInputSchema = z.object({
  companyName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  url: optionalUrl,
  applyUrl: optionalUrl,
  applyMethod: ApplicationApplyMethodSchema.optional(),
  matchScore: optionalMatchScore,
  source: optionalSource,
  sourceLabel: optionalText,
  location: optionalText,
  salaryRange: optionalText,
  employmentType: EmploymentTypeSchema.optional(),
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
export type PromoteApplicationInput = z.infer<typeof PromoteApplicationInputSchema>;
export type DismissApplicationInput = z.infer<typeof DismissApplicationInputSchema>;
export type RestoreApplicationInput = z.infer<typeof RestoreApplicationInputSchema>;
export type BatchDismissApplicationsInput = z.infer<typeof BatchDismissApplicationsInputSchema>;
export type BatchRestoreApplicationsInput = z.infer<typeof BatchRestoreApplicationsInputSchema>;
export type ListApplicationActivityInput = z.infer<typeof ListApplicationActivityInputSchema>;
export type AddApplicationNoteInput = z.infer<typeof AddApplicationNoteInputSchema>;
export type ListApplicationsInput = z.infer<typeof ListApplicationsInputSchema>;
export type CountApplicationsInput = z.infer<typeof CountApplicationsInputSchema>;
export type RegenerateAgentTakeInput = z.infer<typeof RegenerateAgentTakeInputSchema>;
export type RefreshApplicationFromUrlInput = z.infer<typeof RefreshApplicationFromUrlInputSchema>;
export type ScanJobAlertsInput = z.infer<typeof ScanJobAlertsInputSchema>;
export type ScanJobAlertsOutput = z.infer<typeof ScanJobAlertsOutputSchema>;
export type FindJobsNowInput = z.infer<typeof FindJobsNowInputSchema>;
export type FindJobsNowOutput = z.infer<typeof FindJobsNowOutputSchema>;
