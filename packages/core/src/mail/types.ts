import { z } from "zod";

import { ApplicationStageSchema } from "#@/application/types";

/** Hub card categories (system). Smart rules use `rule:{slug}` separately. */
export const MailCategoryIdSchema = z.enum([
  "applications",
  "recruiters",
  "interviews",
  "offers",
  "unsorted",
  "all"
]);
export type MailCategoryId = z.infer<typeof MailCategoryIdSchema>;

/**
 * System career labels stored on `mail_message.labels`.
 * Smart-rule labels use the `rule:` prefix (e.g. `rule:newsletter-noise`).
 */
export const MailSystemLabelSchema = z.enum(["application", "recruiter", "interview", "offer"]);
export type MailSystemLabel = z.infer<typeof MailSystemLabelSchema>;

/**
 * Product purpose. `system_notification` is hidden from default Career Inbox lists
 * (OTP, draft-ready, etc.).
 */
export const MailPurposeSchema = z.enum(["career", "system_notification"]);
export type MailPurpose = z.infer<typeof MailPurposeSchema>;

/** Ingress source for idempotency + debugging. */
export const MailProviderSchema = z.enum(["resend", "gmail", "manual"]);
export type MailProvider = z.infer<typeof MailProviderSchema>;

/** lucide icon keys used by the mail hub UI. */
export const MailCategoryIconSchema = z.enum([
  "briefcase",
  "users",
  "calendar",
  "gift",
  "inbox",
  "mail",
  "sparkles"
]);
export type MailCategoryIcon = z.infer<typeof MailCategoryIconSchema>;

/**
 * List filter category: system id or smart-rule id (`rule:…`).
 * Matches hub drill-in route segments after slug decode.
 */
export const MailListCategorySchema = z.union([
  MailCategoryIdSchema,
  z.string().regex(/^rule:[a-z0-9][a-z0-9_-]*$/i, "Smart-rule category must look like rule:{slug}")
]);
export type MailListCategory = z.infer<typeof MailListCategorySchema>;

export const MailListInputSchema = z.object({
  category: MailListCategorySchema.default("all"),
  /** When true, include purpose=system_notification rows (default: exclude). */
  includeSystem: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(50)
});
export type MailListInput = z.infer<typeof MailListInputSchema>;

export const MailGetInputSchema = z.object({
  id: z.string().min(1),
  includeSystem: z.boolean().optional().default(false)
});
export type MailGetInput = z.infer<typeof MailGetInputSchema>;

const MailApplicationSummarySchema = z.object({
  companyName: z.string(),
  title: z.string()
});

/** List row / reader header — body omitted for list. */
export const MailMessageListItemSchema = z.object({
  id: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  subject: z.string(),
  preview: z.string(),
  receivedAt: z.coerce.date(),
  unread: z.boolean(),
  labels: z.array(z.string()),
  purpose: MailPurposeSchema,
  applicationId: z.string().nullable(),
  application: MailApplicationSummarySchema.nullable()
});
export type MailMessageListItem = z.infer<typeof MailMessageListItemSchema>;

export const MailMessageListOutputSchema = z.array(MailMessageListItemSchema);
export type MailMessageListOutput = z.infer<typeof MailMessageListOutputSchema>;

/**
 * Active CRM auto-apply summary on message detail (reader undo).
 * Kept here (not crm-effects) to avoid circular imports with label schemas.
 */
export const MailCrmApplySummarySchema = z.object({
  id: z.string().min(1),
  effectKind: z.enum(["noop", "link_only", "advance_stage", "set_outcome"]),
  reason: z.string(),
  applicationId: z.string().nullable(),
  stageAfter: ApplicationStageSchema.nullable(),
  stageBefore: ApplicationStageSchema.nullable(),
  createdAt: z.coerce.date(),
  undoneAt: z.coerce.date().nullable()
});
export type MailCrmApplySummary = z.infer<typeof MailCrmApplySummarySchema>;

/** Full message for reader. */
export const MailMessageDetailSchema = MailMessageListItemSchema.extend({
  bodyText: z.string(),
  bodyHtml: z.string().nullable(),
  provider: MailProviderSchema,
  classifiedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  /** Active (not undone) CRM auto-apply from classify, if any. */
  crmApply: MailCrmApplySummarySchema.nullable().optional()
});
export type MailMessageDetail = z.infer<typeof MailMessageDetailSchema>;

/** Hub category card metadata (counts filled by API later). */
export const MailCategoryCardSchema = z.object({
  id: MailListCategorySchema,
  title: z.string(),
  description: z.string(),
  icon: MailCategoryIconSchema,
  kind: z.enum(["system", "rule"])
});
export type MailCategoryCard = z.infer<typeof MailCategoryCardSchema>;
