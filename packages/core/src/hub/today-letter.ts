import { z } from "zod";

import { RuntimeLlmConfigSchema } from "#@/ai-settings/runtime-llm";

export const TODAY_LETTER_MAIL_CAP = 50;
export const TODAY_LETTER_INBOX_CAP = 20;
export const TODAY_LETTER_TRACKED_CAP = 20;

export const TodayLetterMailFactSchema = z.object({
  id: z.string(),
  fromName: z.string(),
  subject: z.string(),
  labels: z.array(z.string()),
  summary: z.string().nullable(),
  receivedAt: z.string().nullable()
});

export const TodayLetterInboxFactSchema = z.object({
  id: z.string(),
  title: z.string(),
  companyName: z.string(),
  matchScore: z.number().nullable(),
  agentTake: z.string()
});

export const TodayLetterTrackedFactSchema = z.object({
  applicationId: z.string(),
  title: z.string(),
  companyName: z.string(),
  kind: z.enum(["stage_changed", "outcome_set", "promoted"]),
  body: z.string().nullable(),
  createdAt: z.string()
});

export const TodayLetterFactsSchema = z.object({
  dateLabel: z.string(),
  since: z.string(),
  window: z.enum(["cursor", "rolling24h"]),
  empty: z.boolean(),
  mail: z.array(TodayLetterMailFactSchema),
  inbox: z.array(TodayLetterInboxFactSchema),
  tracked: z.array(TodayLetterTrackedFactSchema),
  mailCount: z.number().int(),
  inboxCount: z.number().int(),
  trackedCount: z.number().int()
});

export const TodayLetterWorkflowInputSchema = z.object({
  userId: z.string().min(1),
  llm: RuntimeLlmConfigSchema.optional(),
  hubPersonality: z.string().optional()
});

/** Gather → write: facts plus BYO so the writer step does not depend on requestContext. */
export const TodayLetterGatherOutputSchema = TodayLetterFactsSchema.extend({
  userId: z.string().min(1).optional(),
  llm: RuntimeLlmConfigSchema.optional(),
  hubPersonality: z.string().optional()
});

export const TodayLetterWorkflowOutputSchema = TodayLetterFactsSchema.extend({
  markdown: z.string()
});

export type TodayLetterMailFact = z.infer<typeof TodayLetterMailFactSchema>;
export type TodayLetterInboxFact = z.infer<typeof TodayLetterInboxFactSchema>;
export type TodayLetterTrackedFact = z.infer<typeof TodayLetterTrackedFactSchema>;
export type TodayLetterFacts = z.infer<typeof TodayLetterFactsSchema>;
export type TodayLetterGatherOutput = z.infer<typeof TodayLetterGatherOutputSchema>;
export type TodayLetterWorkflowInput = z.infer<typeof TodayLetterWorkflowInputSchema>;
export type TodayLetterWorkflowOutput = z.infer<typeof TodayLetterWorkflowOutputSchema>;
