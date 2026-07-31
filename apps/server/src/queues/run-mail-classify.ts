import { embedTextForCorrections } from "@tsu-stack/api/lib/mail/embed-text";
import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import { sendPendingReplyDraft } from "@tsu-stack/api/lib/review/confirm-reply-draft";
import { createReplyDraftFromMail } from "@tsu-stack/api/lib/review/create-reply-draft-from-mail";
import { resolveRuntimeAiCredentials } from "@tsu-stack/api/lib/settings/resolve-runtime-ai";
import {
  AI_CORRECTION_CANDIDATE_POOL,
  AI_CORRECTION_FEW_SHOT_K,
  applySmartRulesToClassifyResult,
  correctionEmbedText,
  heuristicClassifyMail,
  isJobAlertDigestMail,
  llmLogFields,
  MailSystemLabelSchema,
  selectCorrectionsForFewShot,
  suppressCareerLabelsForJobAlertDigest,
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
import { enqueueMailJobHarvest } from "#@/queues/mail-job-harvest-queue";

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
  const parseLabels = (raw: string[]): MailSystemLabel[] =>
    raw
      .map((l) => MailSystemLabelSchema.safeParse(l))
      .filter((r): r is { success: true; data: MailSystemLabel } => r.success)
      .map((r) => r.data);

  const toFewShot = (c: {
    fromName: string;
    fromEmail: string;
    subject: string;
    preview: string;
    predictedSystemLabels: string[] | null;
    correctedSystemLabels: string[] | null;
    embedding?: number[] | null;
    embeddingVec?: number[] | null;
  }): AiCorrectionFewShotExample => {
    const emb =
      (Array.isArray(c.embeddingVec) && c.embeddingVec.length > 0 ? c.embeddingVec : null) ??
      (Array.isArray(c.embedding) ? c.embedding : null);
    return {
      fromName: c.fromName,
      fromEmail: c.fromEmail,
      subject: c.subject,
      preview: c.preview,
      predictedSystemLabels: parseLabels(c.predictedSystemLabels ?? []),
      correctedSystemLabels: parseLabels(c.correctedSystemLabels ?? []),
      embedding: emb
    };
  };

  const queryEmbedding = await embedTextForCorrections(
    correctionEmbedText({
      fromName: row.fromName,
      fromEmail: row.fromEmail,
      subject: row.subject,
      preview: row.preview,
      bodyText: row.bodyText
    })
  );

  // Prefer pgvector ANN when we have a query embedding; else lexical pool.
  let fewShotCorrections: AiCorrectionFewShotExample[] = [];
  if (queryEmbedding && queryEmbedding.length > 0) {
    const vectorHits = await aiCorrectionRepository.findSimilarByEmbedding(
      row.userId,
      queryEmbedding,
      AI_CORRECTION_FEW_SHOT_K
    );
    if (vectorHits.length > 0) {
      fewShotCorrections = vectorHits.map(toFewShot);
    }
  }
  if (fewShotCorrections.length === 0) {
    const recentCorrections = await aiCorrectionRepository.findRecentByUserId(
      row.userId,
      AI_CORRECTION_CANDIDATE_POOL
    );
    fewShotCorrections = selectCorrectionsForFewShot(
      {
        fromName: row.fromName,
        fromEmail: row.fromEmail,
        subject: row.subject,
        preview: row.preview,
        bodyText: row.bodyText
      },
      recentCorrections.map(toFewShot),
      { max: AI_CORRECTION_FEW_SHOT_K, queryEmbedding }
    );
  }
  // BYO AI: Settings models + sealed keys — not Dokploy DEEPSEEK_*.
  const llm = await resolveRuntimeAiCredentials(row.userId, "classify");

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
    fewShotCorrections,
    llm
  };

  let result: MailClassifyOutput | null = null;
  let mastraClassifyRunId: string | null = null;
  let mastraClassifyTraceId: string | null = null;
  let usedAgent = false;
  let agentFailReason: string | null = null;
  const byo = llmLogFields(llm);
  const hadByo = Boolean(llm.apiKey?.trim());

  const agentCall = await callMailClassifyAgent(classifyInput);
  if (agentCall.ok) {
    result = applySmartRulesToClassifyResult(classifyInput, agentCall.data.output);
    mastraClassifyRunId = agentCall.data.runId;
    mastraClassifyTraceId = agentCall.data.traceId;
    usedAgent = true;
  } else {
    // Heuristic still labels mail so the inbox keeps working — never silent about AI miss.
    result = heuristicClassifyMail(classifyInput);
    agentFailReason = agentCall.failure.reason;
    const failNote = [
      result.notes,
      `agent:${agentCall.failure.reason}${agentCall.failure.status != null ? `:${agentCall.failure.status}` : ""}`
    ]
      .filter(Boolean)
      .join(";");
    result = { ...result, notes: failNote };

    // Error-level when BYO was configured (user expected AI) or agent was reachable-but-failing.
    if (hadByo || agentCall.failure.reason !== "not_configured") {
      const failLog = createLogger({ operation: "server__mail_classify_agent_fallback" });
      failLog.error(new Error(`Mail classify agent fallback: ${agentCall.failure.reason}`), {
        event: "mail_classify_agent_fallback",
        messageId: row.id,
        userId: row.userId,
        agentFailReason: agentCall.failure.reason,
        agentFailStatus: agentCall.failure.status ?? null,
        agentFailMessage: agentCall.failure.message ?? null,
        hadByo,
        ...byo
      });
      failLog.emit({ _forceKeep: true });
    }
  }

  // LinkedIn/Indeed digests must not create Interview CRM rows or notify as career.
  result = suppressCareerLabelsForJobAlertDigest(classifyInput, result);
  const isDigest = isJobAlertDigestMail(classifyInput);

  await mailMessageRepository.applyClassification(row.id, row.userId, result.labels, {
    mastraClassifyRunId,
    mastraClassifyTraceId
  });

  const crm = isDigest
    ? {
        applied: false,
        effect: {
          kind: "noop" as const,
          applicationId: null,
          systemLabels: [] as MailSystemLabel[],
          reason: "job_alert_digest_skip_crm"
        }
      }
    : await applyMailCrmEffectFromClassify({
        messageId: row.id,
        userId: row.userId,
        systemLabels: result.systemLabels
      });

  // job_notifier → harvest queue (P0 stub worker; P1 crawl/score/apps).
  let harvestEnqueued: boolean | null = null;
  const hasJobNotifier =
    result.systemLabels.includes("job_notifier") || result.labels.includes("job_notifier");
  if (hasJobNotifier) {
    const harvest = await enqueueMailJobHarvest({
      messageId: row.id,
      userId: row.userId
    });
    harvestEnqueued = harvest.enqueued;
  }

  // Career-labeled mail → notify + ensure review draft; Full autonomy auto-sends.
  let reviewDraftCreated: boolean | null = null;
  let reviewAutoSent: boolean | null = null;
  let reviewAutoSendCode: string | null = null;
  if (result.systemLabels.length > 0 && !isDigest) {
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
            reviewAutoSendCode = sent.code ?? "auto_send_failed";
            // Separate logger — main classify logger emits once below.
            const autoSendLog = createLogger({ operation: "server__mail_reply_auto_send" });
            autoSendLog.set({
              event: "mail_reply_auto_send_failed",
              messageId: row.id,
              userId: row.userId,
              code: sent.code,
              message: sent.message ?? null
            });
            autoSendLog.emit({ _forceKeep: true });
          }
        }
      }
    }
  }

  // One wide event for the classify run (never emit intermediate outcomes on this logger).
  log.set({
    event: "mail_classify_applied",
    messageId: row.id,
    userId: row.userId,
    source: result.source,
    systemLabels: result.systemLabels,
    notes: result.notes ?? null,
    usedAgent,
    agentFallback: !usedAgent,
    agentFailReason,
    mastraClassifyRunId,
    mastraClassifyTraceId,
    crmApplied: crm.applied,
    crmKind: crm.effect.kind,
    crmReason: crm.effect.reason,
    harvestEnqueued,
    reviewDraftCreated,
    reviewAutoSent,
    reviewAutoSendCode,
    isDigest,
    ...byo
  });
  log.emit();

  return result;
}
