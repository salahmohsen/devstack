import { z } from "zod";

import { ApplicationStageSchema } from "#@/application/types";

import { MAIL_SYSTEM_LABELS } from "./constants";
import { MailSystemLabelSchema, type MailSystemLabel } from "./types";

/** How many recent corrections to inject as few-shot demos (per tenant). */
export const AI_CORRECTION_FEW_SHOT_K = 5;

export const AiCorrectionSchema = z.object({
  id: z.string().min(1),
  messageId: z.string().nullable(),
  fromName: z.string(),
  fromEmail: z.string(),
  subject: z.string(),
  preview: z.string(),
  predictedSystemLabels: z.array(MailSystemLabelSchema),
  correctedSystemLabels: z.array(MailSystemLabelSchema),
  predictedStage: ApplicationStageSchema.nullable(),
  correctedStage: ApplicationStageSchema.nullable(),
  crmApplyId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.coerce.date()
});
export type AiCorrection = z.infer<typeof AiCorrectionSchema>;

export const CreateAiCorrectionInputSchema = z.object({
  messageId: z.string().min(1),
  /** Correct system labels (0–1 primary). Empty = “none / not career”. */
  correctedSystemLabels: z.array(MailSystemLabelSchema).max(1),
  /** Optional stage correction for CRM few-shot context. */
  correctedStage: ApplicationStageSchema.optional().nullable(),
  /** When true (default), undo active CRM apply for this message if any. */
  undoCrm: z.boolean().optional().default(true),
  note: z.string().trim().max(500).optional().nullable()
});
export type CreateAiCorrectionInput = z.infer<typeof CreateAiCorrectionInputSchema>;

export const CreateAiCorrectionOutputSchema = z.object({
  correction: AiCorrectionSchema,
  labels: z.array(z.string()),
  crmUndone: z.boolean()
});
export type CreateAiCorrectionOutput = z.infer<typeof CreateAiCorrectionOutputSchema>;

/** Compact demo for classify prompts (no ids). */
export const AiCorrectionFewShotExampleSchema = z.object({
  fromName: z.string().default(""),
  fromEmail: z.string().default(""),
  subject: z.string().default(""),
  preview: z.string().default(""),
  predictedSystemLabels: z.array(MailSystemLabelSchema).default([]),
  correctedSystemLabels: z.array(MailSystemLabelSchema).default([])
});
export type AiCorrectionFewShotExample = z.infer<typeof AiCorrectionFewShotExampleSchema>;

/**
 * Replace system career labels; keep smart-rule and other labels.
 * `corrected` may be empty (user said “not career”).
 */
export function applyCorrectedSystemLabels(
  existingLabels: readonly string[],
  corrected: readonly MailSystemLabel[]
): string[] {
  const nonSystem = existingLabels.filter(
    (l) => !(MAIL_SYSTEM_LABELS as readonly string[]).includes(l)
  );
  const system = corrected.slice(0, 1);
  return [...system, ...nonSystem];
}

export function extractSystemLabels(labels: readonly string[]): MailSystemLabel[] {
  return labels.filter((l): l is MailSystemLabel =>
    (MAIL_SYSTEM_LABELS as readonly string[]).includes(l)
  );
}

/**
 * Format tenant corrections as few-shot blocks for the classifier prompt.
 * Newest-first input; rendered oldest→newest so latest is recency-biased at the end.
 */
export function formatCorrectionsFewShot(
  examples: readonly AiCorrectionFewShotExample[],
  opts?: { max?: number }
): string {
  const max = opts?.max ?? AI_CORRECTION_FEW_SHOT_K;
  const slice = examples.slice(0, max).toReversed();
  if (slice.length === 0) return "";

  const blocks = slice.map((ex, i) => {
    const predicted = ex.predictedSystemLabels[0] ?? "(none)";
    const corrected = ex.correctedSystemLabels[0] ?? "(none)";
    return `Example ${i + 1}:
From: ${ex.fromName} <${ex.fromEmail}>
Subject: ${ex.subject}
Preview: ${ex.preview.slice(0, 280)}
Model predicted: ${predicted}
User corrected to: ${corrected}`;
  });

  return [
    "Past corrections from this user (follow their labeling preferences):",
    ...blocks,
    "Use these only as preference signals; still prefer no label when unsure."
  ].join("\n\n");
}
