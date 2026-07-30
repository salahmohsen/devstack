import { z } from "zod";

import { ApplicationStageSchema } from "#@/application/types";

import { MAIL_SYSTEM_LABELS } from "./constants";
import { MailSystemLabelSchema, type MailSystemLabel } from "./types";

/** How many demos to inject as few-shot (per tenant). */
export const AI_CORRECTION_FEW_SHOT_K = 5;
/** Candidate pool size before similarity rank (newest first from DB). */
export const AI_CORRECTION_CANDIDATE_POOL = 40;

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

export type CorrectionSimilarityQuery = {
  fromName?: string;
  fromEmail?: string;
  subject?: string;
  preview?: string;
  bodyText?: string;
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "for",
  "of",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "be",
  "as",
  "by",
  "with",
  "from",
  "your",
  "you",
  "we",
  "our",
  "this",
  "that",
  "re",
  "fw",
  "hi",
  "hello",
  "thanks",
  "thank"
]);

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email
    .slice(at + 1)
    .toLowerCase()
    .trim();
}

/** Tokenize mail-ish text for overlap scoring. */
export function tokenizeMailText(text: string): Set<string> {
  const out = new Set<string>();
  const raw = text.toLowerCase().match(/[a-z0-9][a-z0-9._+-]{1,}/g) ?? [];
  for (const t of raw) {
    if (t.length < 2) continue;
    if (STOP.has(t)) continue;
    out.add(t);
    // Domain-ish splits
    if (t.includes(".")) {
      for (const part of t.split(".")) {
        if (part.length >= 2 && !STOP.has(part)) out.add(part);
      }
    }
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Lexical similarity between a live mail and a stored correction.
 * Heavier weight on from-domain / subject; no embeddings required.
 */
export function scoreCorrectionSimilarity(
  query: CorrectionSimilarityQuery,
  example: Pick<AiCorrectionFewShotExample, "fromName" | "fromEmail" | "subject" | "preview">
): number {
  const qDomain = emailDomain(query.fromEmail ?? "");
  const eDomain = emailDomain(example.fromEmail);
  let score = 0;

  if (qDomain && eDomain && qDomain === eDomain) score += 0.45;
  else if (qDomain && eDomain && (qDomain.endsWith(eDomain) || eDomain.endsWith(qDomain))) {
    score += 0.25;
  }

  const qEmail = (query.fromEmail ?? "").toLowerCase().trim();
  const eEmail = example.fromEmail.toLowerCase().trim();
  if (qEmail && eEmail && qEmail === eEmail) score += 0.2;

  const qSubject = tokenizeMailText(query.subject ?? "");
  const eSubject = tokenizeMailText(example.subject);
  score += 0.25 * jaccard(qSubject, eSubject);

  const qBody = tokenizeMailText(
    [query.fromName, query.preview, (query.bodyText ?? "").slice(0, 1500)].join("\n")
  );
  const eBody = tokenizeMailText([example.fromName, example.preview].join("\n"));
  score += 0.2 * jaccard(qBody, eBody);

  return score;
}

/**
 * Rank a candidate pool of corrections for the current mail and take top-K.
 * Tie-break: keep input order (newest-first from DB).
 */
export function selectCorrectionsForFewShot(
  query: CorrectionSimilarityQuery,
  candidates: readonly AiCorrectionFewShotExample[],
  opts?: { max?: number; minScore?: number }
): AiCorrectionFewShotExample[] {
  const max = opts?.max ?? AI_CORRECTION_FEW_SHOT_K;
  const minScore = opts?.minScore ?? 0.05;
  if (candidates.length === 0) return [];
  if (candidates.length <= max) return [...candidates];

  const ranked = candidates
    .map((ex, index) => {
      return { ex, index, score: scoreCorrectionSimilarity(query, ex) };
    })
    .toSorted((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index; // prefer newer when scores tie
    });

  const strong = ranked.filter((r) => r.score >= minScore).slice(0, max);
  if (strong.length > 0) return strong.map((r) => r.ex);

  // All weak — fall back to newest max (original last-K behavior).
  return candidates.slice(0, max);
}

/**
 * Format tenant corrections as few-shot blocks for the classifier prompt.
 * Input is already selected (retrieval or last-K); rendered oldest→newest for recency bias.
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
    "Similar past corrections from this user (follow their labeling preferences):",
    ...blocks,
    "Use these only as preference signals; still prefer no label when unsure."
  ].join("\n\n");
}
