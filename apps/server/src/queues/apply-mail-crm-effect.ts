import {
  MailCrmAuditSnapshotSchema,
  proposeMailCrmEffect,
  type ApplicationOutcome,
  type ApplicationStage,
  type MailCrmApplyResult,
  type MailCrmAuditSnapshot
} from "@tsu-stack/core";
import {
  applicationRepository,
  mailCrmApplyRepository,
  mailMessageRepository
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

function snapshotFromApp(input: {
  applicationId: string | null;
  stage: ApplicationStage | null;
  stageChangedAt: Date | null;
  outcome: ApplicationOutcome | null;
  outcomeAt: Date | null;
  mailMessageApplicationId: string | null;
}): MailCrmAuditSnapshot {
  return MailCrmAuditSnapshotSchema.parse({
    applicationId: input.applicationId,
    stage: input.stage,
    stageChangedAt: input.stageChangedAt,
    outcome: input.outcome,
    outcomeAt: input.outcomeAt,
    mailMessageApplicationId: input.mailMessageApplicationId
  });
}

/**
 * After classify labels land: propose CRM effect and apply when the message is
 * already linked to an open application. Unlinked messages log only (match later).
 * Writes an audit row for undo.
 */
export async function applyMailCrmEffectFromClassify(input: {
  messageId: string;
  userId: string;
  systemLabels: readonly string[];
}): Promise<MailCrmApplyResult> {
  const log = createLogger({ operation: "server__mail_crm_apply" });

  const existingApply = await mailCrmApplyRepository.findActiveByMessageId(
    input.messageId,
    input.userId
  );
  if (existingApply) {
    const effect = proposeMailCrmEffect({
      systemLabels: input.systemLabels,
      mailApplicationId: existingApply.applicationId
    });
    log.set({
      event: "mail_crm_apply_skip_idempotent",
      messageId: input.messageId,
      userId: input.userId,
      applyId: existingApply.id
    });
    log.emit();
    return { applied: false, effect };
  }

  const message = await mailMessageRepository.findByIdForUser(input.messageId, input.userId, {
    includeSystem: true
  });
  if (!message) {
    const effect = proposeMailCrmEffect({ systemLabels: input.systemLabels });
    return { applied: false, effect: { ...effect, reason: "message_not_found" } };
  }

  let currentStage: ApplicationStage | null = null;
  let currentOutcome: ApplicationOutcome | null = null;
  let stageChangedAt: Date | null = null;
  let outcomeAt: Date | null = null;
  let appId = message.applicationId ?? null;

  if (appId) {
    const app = await applicationRepository.findByIdForUser(appId, input.userId);
    if (!app) {
      appId = null;
    } else {
      currentStage = app.stage;
      currentOutcome = app.outcome;
      stageChangedAt = app.stageChangedAt;
      outcomeAt = app.outcomeAt;
    }
  }

  const effect = proposeMailCrmEffect({
    systemLabels: input.systemLabels,
    mailApplicationId: appId,
    currentStage,
    currentOutcome
  });

  if (effect.kind === "noop") {
    log.set({
      event: "mail_crm_apply_noop",
      messageId: input.messageId,
      userId: input.userId,
      reason: effect.reason
    });
    log.emit();
    return { applied: false, effect };
  }

  // Match/create application is a later ticket — only mutate when already linked.
  if (!appId) {
    log.set({
      event: "mail_crm_apply_unlinked",
      messageId: input.messageId,
      userId: input.userId,
      targetStage: effect.targetStage ?? null,
      reason: effect.reason
    });
    log.emit();
    return { applied: false, effect };
  }

  const before = snapshotFromApp({
    applicationId: appId,
    stage: currentStage,
    stageChangedAt,
    outcome: currentOutcome,
    outcomeAt,
    mailMessageApplicationId: message.applicationId ?? null
  });

  let afterStage = currentStage;
  let afterStageChangedAt = stageChangedAt;
  let afterMailAppId = message.applicationId ?? null;

  if (effect.kind === "advance_stage" && effect.targetStage) {
    const updated = await applicationRepository.updateStage(
      appId,
      input.userId,
      effect.targetStage
    );
    if (!updated.ok) {
      log.set({
        event: "mail_crm_apply_stage_blocked",
        messageId: input.messageId,
        userId: input.userId,
        applicationId: appId,
        reason: updated.reason
      });
      log.emit();
      return { applied: false, effect: { ...effect, reason: `stage_${updated.reason}` } };
    }
    afterStage = updated.row.stage;
    afterStageChangedAt = updated.row.stageChangedAt;
  }

  if (message.applicationId !== appId) {
    await mailMessageRepository.setApplicationId(message.id, input.userId, appId);
    afterMailAppId = appId;
  } else {
    afterMailAppId = message.applicationId ?? appId;
  }

  const after = snapshotFromApp({
    applicationId: appId,
    stage: afterStage,
    stageChangedAt: afterStageChangedAt,
    outcome: currentOutcome,
    outcomeAt,
    mailMessageApplicationId: afterMailAppId
  });

  const applyRow = await mailCrmApplyRepository.create({
    userId: input.userId,
    messageId: input.messageId,
    applicationId: appId,
    effectKind: effect.kind,
    reason: effect.reason,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>
  });

  log.set({
    event: "mail_crm_apply_ok",
    messageId: input.messageId,
    userId: input.userId,
    applyId: applyRow.id,
    effectKind: effect.kind,
    targetStage: effect.targetStage ?? null,
    applicationId: appId
  });
  log.emit();

  return { applied: true, effect, before, after };
}
