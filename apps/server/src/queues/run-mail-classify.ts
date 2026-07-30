import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import { sendPendingReplyDraft } from "@tsu-stack/api/lib/review/confirm-reply-draft";
import { createReplyDraftFromMail } from "@tsu-stack/api/lib/review/create-reply-draft-from-mail";
import {
  AI_CORRECTION_CANDIDATE_POOL,
  AI_CORRECTION_FEW_SHOT_K,
  applySmartRulesToClassifyResult,
  heuristicClassifyMail,
  MailSystemLabelSchema,
  selectCorrectionsForFewShot,
  type AiCorrectionFewShotExample,
  type MailClassifyOutput,
  type MailSystemLabel
} from "@tsu-stack/core";
import {
  aiCorrectionRepository,
  mailMessageRepository,
  mailSmartRuleRepository,
  userAiSettingsRepository
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { applyMailCrmEffectFromClassify } from "#@/queues/apply-mail-crm-effect";
import { callMailClassifyAgent } from "#@/queues/call-mail-classify-agent";

/**
 * Classify a single Career Inbox message (tenant-scoped).
 *
 * Order:
 * 1. Skip if missing / already classified / system notification
 * 2. Prefer Mastra `mail-classify-workflow` on AGENT_WORKER_URL when set
 * 3. Fall back to local heuristic
 * 4. Propose/apply CRM stage effects when message is linked (audit for undo)
 */
export async function runMailClassify(input: {
  messageId: string;
  userId: string;
}): Promise<MailClassifyOutput & { skipped?: boolean }> {
  const log = createLogger({ operation: "server__mail_classify_run" });

  const row = await mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
    includeSystem: true
  });
  if (!row) {
    log.set({
      event: "mail_classify_message_missing",
      messageId: input.messageId,
      userId: input.userId
    });
    log.emit();
    return {
      labels: [],
      systemLabels: [],
      source: "skip_already_classified",
      notes: "message_not_found",
      skipped: true
    };
  }

  if (row.classifiedAt) {
    return {
      labels: row.labels ?? [],
      systemLabels: [],
      source: "skip_already_classified",
      notes: "already_classified",
      skipped: true
    };
  }

  // System notification purpose never gets career labels.
  if (row.purpose === "system_notification") {
    await mailMessageRepository.applyClassification(row.id, row.userId, row.labels ?? []);
    return {
      labels: row.labels ?? [],
      systemLabels: [],
      source: "heuristic",
      notes: "system_notification_skip",
      skipped: true
    };
  }

  const smartRules = await mailSmartRuleRepository.findByUserId(row.userId, {
    enabledOnly: true
  });
  const recentCorrections = await aiCorrectionRepository.findRecentByUserId(
    row.userId,
    AI_CORRECTION_CANDIDATE_POOL
  );
  const parseLabels = (raw: string[]): MailSystemLabel[] =>
    raw
      .map((l) => MailSystemLabelSchema.safeParse(l))
      .filter((r): r is { success: true; data: MailSystemLabel } => r.success)
      .map((r) => r.data);
  const candidates: AiCorrectionFewShotExample[] = recentCorrections.map((c) => {
    return {
      fromName: c.fromName,
      fromEmail: c.fromEmail,
      subject: c.subject,
      preview: c.preview,
      predictedSystemLabels: parseLabels(c.predictedSystemLabels ?? []),
      correctedSystemLabels: parseLabels(c.correctedSystemLabels ?? [])
    };
  });
  const fewShotCorrections = selectCorrectionsForFewShot(
    {
      fromName: row.fromName,
      fromEmail: row.fromEmail,
      subject: row.subject,
      preview: row.preview,
      bodyText: row.bodyText
    },
    candidates,
    { max: AI_CORRECTION_FEW_SHOT_K }
  );
  const classifyInput = {
    messageId: row.id,
    userId: row.userId,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    subject: row.subject,
    preview: row.preview,
    bodyText: row.bodyText,
    labels: row.labels ?? [],
    smartRules: smartRules.map((r) => {
      return { slug: r.slug, keywords: r.keywords ?? [], enabled: r.enabled };
    }),
    fewShotCorrections
  };

  let result: MailClassifyOutput | null = null;
  let mastraClassifyRunId: string | null = null;
  let mastraClassifyTraceId: string | null = null;

  const agentCall = await callMailClassifyAgent(classifyInput);
  if (agentCall) {
    result = applySmartRulesToClassifyResult(classifyInput, agentCall.output);
    mastraClassifyRunId = agentCall.runId;
    mastraClassifyTraceId = agentCall.traceId;
  } else {
    result = heuristicClassifyMail(classifyInput);
    log.set({
      event: "mail_classify_local_heuristic",
      messageId: row.id,
      userId: row.userId,
      systemLabels: result.systemLabels
    });
    log.emit();
  }

  await mailMessageRepository.applyClassification(row.id, row.userId, result.labels, {
    mastraClassifyRunId,
    mastraClassifyTraceId
  });

  const crm = await applyMailCrmEffectFromClassify({
    messageId: row.id,
    userId: row.userId,
    systemLabels: result.systemLabels
  });

  // Career-labeled mail → notify + ensure review draft; Full autonomy auto-sends.
  let reviewDraftCreated: boolean | null = null;
  let reviewAutoSent: boolean | null = null;
  if (result.systemLabels.length > 0) {
    await emitAppNotification({
      userId: row.userId,
      kind: "mail.classified.important",
      title: "Career mail classified",
      body: `${result.systemLabels.join(", ")} · ${row.subject || "(no subject)"}`,
      href: "/dashboard/mail/all",
      messageId: row.id
    });

    const draft = await createReplyDraftFromMail({
      messageId: row.id,
      userId: row.userId
    });
    if (draft.ok) {
      reviewDraftCreated = draft.created;
      if (draft.created) {
        const ai = await userAiSettingsRepository.findByUserId(row.userId);
        if ((ai?.mailReplyAutonomy ?? "assist") === "full") {
          const sent = await sendPendingReplyDraft({ item: draft.item, userId: row.userId });
          reviewAutoSent = sent.ok && sent.result.sent;
          if (!sent.ok) {
            log.set({
              event: "mail_reply_auto_send_failed",
              messageId: row.id,
              userId: row.userId,
              code: sent.code,
              message: sent.message ?? null
            });
            log.emit();
          }
        }
      }
    }
  }

  log.set({
    event: "mail_classify_applied",
    messageId: row.id,
    userId: row.userId,
    source: result.source,
    systemLabels: result.systemLabels,
    notes: result.notes ?? null,
    crmApplied: crm.applied,
    crmKind: crm.effect.kind,
    crmReason: crm.effect.reason,
    reviewDraftCreated,
    reviewAutoSent
  });
  log.emit();

  return result;
}
