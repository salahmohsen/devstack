import { z } from "zod";

import { AiCorrectionFewShotExampleSchema } from "./corrections";
import {
  matchSmartRuleLabels,
  mergeClassifyLabelsWithSmartRules,
  type SmartRuleMatchInput
} from "./smart-rules";
import { MailSystemLabelSchema, type MailSystemLabel } from "./types";

/** Job payload already lives in classify-queue.ts; this is workflow I/O. */
export const MailClassifyInputSchema = z.object({
  messageId: z.string().min(1),
  userId: z.string().min(1),
  fromName: z.string().default(""),
  fromEmail: z.string().min(1),
  subject: z.string().default(""),
  preview: z.string().default(""),
  bodyText: z.string().default(""),
  /** Existing labels (smart rules preserved). */
  labels: z.array(z.string()).default([]),
  /** Optional tenant smart rules for keyword match (server loads). */
  smartRules: z
    .array(
      z.object({
        slug: z.string().min(1),
        keywords: z.array(z.string()),
        enabled: z.boolean().optional()
      })
    )
    .optional()
    .default([]),
  /** Last-K user corrections for few-shot (server loads, userId-scoped). */
  fewShotCorrections: z.array(AiCorrectionFewShotExampleSchema).optional().default([])
});
export type MailClassifyInput = z.infer<typeof MailClassifyInputSchema>;

export const MailClassifyOutputSchema = z.object({
  labels: z.array(z.string()),
  systemLabels: z.array(MailSystemLabelSchema),
  /** How classification was produced. */
  source: z.enum(["skip_already_classified", "heuristic", "llm"]),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
});
export type MailClassifyOutput = z.infer<typeof MailClassifyOutputSchema>;

const OFFER_RE =
  /\b(offer\s+letter|compensation\s+package|salary\s+offer|we\s+are\s+pleased\s+to\s+offer|job\s+offer)\b/i;
const INTERVIEW_RE =
  /\b(interview|onsite|on-site|phone\s+screen|technical\s+screen|hirevue|loop\s+interview|scheduling\s+interview)\b/i;
const RECRUITER_RE =
  /\b(recruiter|talent\s+acquisition|i\s+came\s+across\s+your\s+profile|opportunity\s+for\s+you|are\s+you\s+open\s+to)\b/i;
const APPLICATION_RE =
  /\b(application\s+(received|update|status)|thank\s+you\s+for\s+applying|we\s+received\s+your\s+application|candidate\s+portal|your\s+application)\b/i;

/**
 * Cheap prefilter before any LLM call. Returns at most one primary system label
 * (product default: single career bucket). Smart-rule labels are preserved.
 */
export function heuristicClassifyMail(input: MailClassifyInput): MailClassifyOutput {
  const haystack = [input.fromName, input.fromEmail, input.subject, input.preview, input.bodyText]
    .join("\n")
    .slice(0, 20_000);

  let system: MailSystemLabel | null = null;
  let confidence = 0.55;
  let notes: string | undefined;

  if (OFFER_RE.test(haystack)) {
    system = "offer";
    confidence = 0.75;
    notes = "heuristic:offer";
  } else if (INTERVIEW_RE.test(haystack)) {
    system = "interview";
    confidence = 0.7;
    notes = "heuristic:interview";
  } else if (RECRUITER_RE.test(haystack)) {
    system = "recruiter";
    confidence = 0.65;
    notes = "heuristic:recruiter";
  } else if (APPLICATION_RE.test(haystack)) {
    system = "application";
    confidence = 0.65;
    notes = "heuristic:application";
  }

  const systemLabels = system ? [system] : [];
  const smartRuleLabels = matchSmartRuleLabels(
    haystack,
    (input.smartRules ?? []) as SmartRuleMatchInput[]
  );
  const labels = mergeClassifyLabelsWithSmartRules({
    systemLabels,
    existingLabels: input.labels,
    smartRuleLabels
  });

  const ruleNote = smartRuleLabels.length > 0 ? `smart:${smartRuleLabels.join(",")}` : undefined;

  return {
    labels,
    systemLabels,
    source: "heuristic",
    confidence: smartRuleLabels.length > 0 && !system ? 0.7 : confidence,
    notes: [notes, ruleNote].filter(Boolean).join(";")
  };
}

/** Apply smart-rule keyword match onto any classify result (agent or heuristic). */
export function applySmartRulesToClassifyResult(
  input: MailClassifyInput,
  result: MailClassifyOutput
): MailClassifyOutput {
  const haystack = [input.fromName, input.fromEmail, input.subject, input.preview, input.bodyText]
    .join("\n")
    .slice(0, 20_000);
  const smartRuleLabels = matchSmartRuleLabels(
    haystack,
    (input.smartRules ?? []) as SmartRuleMatchInput[]
  );
  if (smartRuleLabels.length === 0) return result;

  const labels = mergeClassifyLabelsWithSmartRules({
    systemLabels: result.systemLabels,
    existingLabels: result.labels,
    smartRuleLabels
  });
  return {
    ...result,
    labels,
    notes: [result.notes, `smart:${smartRuleLabels.join(",")}`].filter(Boolean).join(";")
  };
}
