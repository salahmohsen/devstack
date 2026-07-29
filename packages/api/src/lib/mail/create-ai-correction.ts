import { randomUUID } from "node:crypto";

import {
  ApplicationStageSchema,
  applyCorrectedSystemLabels,
  extractSystemLabels,
  MailSystemLabelSchema,
  type ApplicationStage,
  type CreateAiCorrectionInput,
  type CreateAiCorrectionOutput,
  type MailSystemLabel
} from "@tsu-stack/core";
import {
  aiCorrectionRepository,
  mailCrmApplyRepository,
  mailMessageRepository
} from "@tsu-stack/db/repositories";

import { postMastraCorrectionFeedback } from "#@/lib/mail/post-mastra-correction-feedback";
import { undoMailCrmApply } from "#@/lib/mail/undo-mail-crm-apply";

export type CreateAiCorrectionResult =
  | { ok: true; result: CreateAiCorrectionOutput }
  | { ok: false; code: "NOT_FOUND" };

function parseSystemLabels(raw: string[]): MailSystemLabel[] {
  return raw
    .map((l) => MailSystemLabelSchema.safeParse(l))
    .filter((r): r is { success: true; data: MailSystemLabel } => r.success)
    .map((r) => r.data);
}

function parseStage(raw: string | null | undefined): ApplicationStage | null {
  if (!raw) return null;
  const parsed = ApplicationStageSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Record a user correction, update message labels, optionally undo active CRM apply.
 * Does not re-run CRM auto-apply (avoids surprise side effects).
 */
export async function createAiCorrectionFromMail(input: {
  userId: string;
  data: CreateAiCorrectionInput;
}): Promise<CreateAiCorrectionResult> {
  const message = await mailMessageRepository.findByIdForUser(input.data.messageId, input.userId, {
    includeSystem: true
  });
  if (!message) return { ok: false, code: "NOT_FOUND" };

  const predictedSystemLabels = extractSystemLabels(message.labels ?? []);
  const correctedSystemLabels = input.data.correctedSystemLabels.slice(0, 1);
  const nextLabels = applyCorrectedSystemLabels(message.labels ?? [], correctedSystemLabels);

  let crmUndone = false;
  let crmApplyId: string | null = null;
  let predictedStage: string | null = null;

  const activeApply = await mailCrmApplyRepository.findActiveByMessageId(message.id, input.userId);
  if (activeApply) {
    crmApplyId = activeApply.id;
    const after = activeApply.after as { stage?: string | null } | null;
    predictedStage = after?.stage ?? null;

    if (input.data.undoCrm !== false && activeApply.effectKind !== "noop") {
      const undo = await undoMailCrmApply({ applyId: activeApply.id, userId: input.userId });
      crmUndone = undo.ok;
    }
  }

  await mailMessageRepository.applyClassification(message.id, input.userId, nextLabels);

  const mastraTraceId = message.mastraClassifyTraceId ?? null;
  const mastraRunId = message.mastraClassifyRunId ?? null;

  const row = await aiCorrectionRepository.create({
    id: randomUUID(),
    userId: input.userId,
    messageId: message.id,
    fromName: message.fromName,
    fromEmail: message.fromEmail,
    subject: message.subject,
    preview: message.preview,
    predictedSystemLabels,
    correctedSystemLabels,
    predictedStage,
    correctedStage: input.data.correctedStage ?? null,
    crmApplyId,
    mastraTraceId,
    mastraRunId,
    note: input.data.note ?? null
  });

  // Observability dual-write — fire-and-forget; never blocks product path.
  void postMastraCorrectionFeedback({
    correctionId: row.id,
    userId: input.userId,
    messageId: message.id,
    predictedSystemLabels,
    correctedSystemLabels,
    mastraTraceId,
    mastraRunId,
    note: input.data.note ?? null
  });

  return {
    ok: true,
    result: {
      correction: {
        id: row.id,
        messageId: row.messageId,
        fromName: row.fromName,
        fromEmail: row.fromEmail,
        subject: row.subject,
        preview: row.preview,
        predictedSystemLabels: parseSystemLabels(row.predictedSystemLabels ?? []),
        correctedSystemLabels: parseSystemLabels(row.correctedSystemLabels ?? []),
        predictedStage: parseStage(row.predictedStage),
        correctedStage: parseStage(row.correctedStage),
        crmApplyId: row.crmApplyId,
        note: row.note,
        createdAt: row.createdAt
      },
      labels: nextLabels,
      crmUndone
    }
  };
}
