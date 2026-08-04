import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";
import { ApplicationOutcomeSchema, ApplicationStageSchema } from "#@/application/types";

import { MailSystemLabelSchema } from "./types";

/** Open application row for matcher AI context (no userId). */
export const CrmOpenApplicationSchema = z.object({
  id: z.string().min(1),
  companyName: z.string(),
  title: z.string(),
  stage: ApplicationStageSchema
});
export type CrmOpenApplication = z.infer<typeof CrmOpenApplicationSchema>;

export const CrmMatchKindSchema = z.enum(["match_existing", "create_new", "skip"]);
export type CrmMatchKind = z.infer<typeof CrmMatchKindSchema>;

export const CrmApplicationMatchInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  fromName: z.string().default(""),
  fromEmail: z.string().default(""),
  subject: z.string().default(""),
  preview: z.string().default(""),
  bodyText: z.string().default(""),
  systemLabels: z.array(MailSystemLabelSchema).default([]),
  openApplications: z.array(CrmOpenApplicationSchema).default([]),
  llm: RuntimeLlmConfigSchema.optional()
});
export type CrmApplicationMatchInput = z.infer<typeof CrmApplicationMatchInputSchema>;

export const CrmApplicationMatchOutputSchema = z.object({
  kind: CrmMatchKindSchema,
  applicationId: z.string().min(1).nullable().optional(),
  companyName: z.string().min(1).max(300).nullable().optional(),
  title: z.string().min(1).max(300).nullable().optional(),
  reason: z.string().max(500).optional()
});
export type CrmApplicationMatchOutput = z.infer<typeof CrmApplicationMatchOutputSchema>;

export const CrmStageAdviseInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  systemLabels: z.array(MailSystemLabelSchema).default([]),
  subject: z.string().default(""),
  preview: z.string().default(""),
  bodyText: z.string().default(""),
  currentStage: ApplicationStageSchema.nullable().optional(),
  currentOutcome: ApplicationOutcomeSchema.nullable().optional(),
  llm: RuntimeLlmConfigSchema.optional()
});
export type CrmStageAdviseInput = z.infer<typeof CrmStageAdviseInputSchema>;

export const CrmStageAdviseOutputSchema = z.object({
  targetStage: ApplicationStageSchema.optional(),
  targetOutcome: ApplicationOutcomeSchema.nullable().optional(),
  reason: z.string().max(500).optional()
});
export type CrmStageAdviseOutput = z.infer<typeof CrmStageAdviseOutputSchema>;

/** Unified mail-process workflow I/O (orchestration result for server/hub). */
export const MailProcessInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  forceReprocess: z.boolean().optional().default(false),
  fromName: z.string().default(""),
  fromEmail: z.string().default(""),
  subject: z.string().default(""),
  preview: z.string().default(""),
  bodyText: z.string().default(""),
  bodyHtml: z.string().nullable().optional(),
  labels: z.array(z.string()).default([]),
  smartRules: z
    .array(
      z.object({
        slug: z.string(),
        title: z.string().default(""),
        description: z.string().default(""),
        keywords: z.array(z.string()).default([]),
        enabled: z.boolean().optional()
      })
    )
    .default([]),
  fewShotCorrections: z.array(z.unknown()).optional().default([]),
  llm: RuntimeLlmConfigSchema.optional()
});
export type MailProcessInput = z.infer<typeof MailProcessInputSchema>;

export const MailProcessBranchSchema = z.enum(["harvest", "crm", "noise", "none"]);
export type MailProcessBranch = z.infer<typeof MailProcessBranchSchema>;

export const MailProcessOutputSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  labels: z.array(z.string()).default([]),
  systemLabels: z.array(MailSystemLabelSchema).default([]),
  branch: MailProcessBranchSchema,
  classifyNotes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});
export type MailProcessOutput = z.infer<typeof MailProcessOutputSchema>;
