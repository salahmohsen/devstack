import {
  extractMailApplicationHints,
  MailCrmAuditSnapshotSchema,
  proposeMailCrmEffect,
  resolveMailApplicationMatch,
  type ApplicationOutcome,
  type ApplicationSource,
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

function sourceFromLabels(systemLabels: readonly string[]): ApplicationSource {
  if (systemLabels.includes("recruiter")) return "recruiter";
  return "other";
}

/**
 * After classify labels land: match or create an application when unlinked,
 * then apply monotonic stage effects with an audit row for undo.
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
  let createdApplication = false;
  let resolveReason: string | null = null;

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

  // Unlinked + career labels: match open apps or create a pipeline row.
  if (!appId && input.systemLabels.length > 0) {
    const hints = extractMailApplicationHints({
      fromName: message.fromName,
      fromEmail: message.fromEmail,
      subject: message.subject
    });
    const open = await applicationRepository.findOpenByUserId(input.userId);
    const match = resolveMailApplicationMatch({
      openApplications: open.map((a) => {
        return { id: a.id, companyName: a.companyName, title: a.title };
      }),
      companyCandidates: hints.companyCandidates,
      titleHint: hints.titleHint
    });

    resolveReason = match.reason;

    if (match.kind === "matched_existing") {
      appId = match.applicationId;
      const app = await applicationRepository.findByIdForUser(appId, input.userId);
      if (app) {
        currentStage = app.stage;
        currentOutcome = app.outcome;
        stageChangedAt = app.stageChangedAt;
        outcomeAt = app.outcomeAt;
      }
      log.set({
        event: "mail_crm_match_existing",
        messageId: input.messageId,
        userId: input.userId,
        applicationId: appId,
        reason: match.reason
      });
      log.emit();
    } else if (match.kind === "create_new") {
      const stage =
        proposeMailCrmEffect({
          systemLabels: input.systemLabels,
          mailApplicationId: null
        }).targetStage ?? "applied";
      const created = await applicationRepository.create({
        userId: input.userId,
        companyName: match.companyName,
        title: match.title,
        source: sourceFromLabels(input.systemLabels),
        notes: `Auto-created from Career Inbox (${message.id.slice(0, 8)}…)`,
        stage,
        description: message.preview?.slice(0, 2000) || null
      });
      appId = created.id;
      currentStage = created.stage;
      currentOutcome = created.outcome;
      stageChangedAt = created.stageChangedAt;
      outcomeAt = created.outcomeAt;
      createdApplication = true;
      log.set({
        event: "mail_crm_create_application",
        messageId: input.messageId,
        userId: input.userId,
        applicationId: appId,
        companyName: match.companyName,
        title: match.title,
        stage
      });
      log.emit();
    } else {
      log.set({
        event: "mail_crm_match_skip",
        messageId: input.messageId,
        userId: input.userId,
        reason: match.reason,
        kind: match.kind
      });
      log.emit();
    }
  }

  const effect = proposeMailCrmEffect({
    systemLabels: input.systemLabels,
    mailApplicationId: appId,
    currentStage,
    currentOutcome
  });

  // Annotate reason when we just created (stage already set on create).
  const effectWithReason =
    createdApplication && effect.kind !== "noop"
      ? { ...effect, reason: "created_application", applicationId: appId }
      : resolveReason === "company_match" && effect.kind !== "noop"
        ? {
            ...effect,
            reason: effect.reason === "advance_stage" ? "matched_and_advance" : "matched_link_only",
            applicationId: appId
          }
        : effect;

  if (effectWithReason.kind === "noop") {
    log.set({
      event: "mail_crm_apply_noop",
      messageId: input.messageId,
      userId: input.userId,
      reason: effectWithReason.reason
    });
    log.emit();
    return { applied: false, effect: effectWithReason };
  }

  if (!appId) {
    log.set({
      event: "mail_crm_apply_unlinked",
      messageId: input.messageId,
      userId: input.userId,
      targetStage: effectWithReason.targetStage ?? null,
      reason: effectWithReason.reason,
      resolveReason
    });
    log.emit();
    return { applied: false, effect: effectWithReason };
  }

  const before = snapshotFromApp({
    applicationId: createdApplication ? null : appId,
    stage: createdApplication ? null : currentStage,
    stageChangedAt: createdApplication ? null : stageChangedAt,
    outcome: createdApplication ? null : currentOutcome,
    outcomeAt: createdApplication ? null : outcomeAt,
    mailMessageApplicationId: message.applicationId ?? null
  });

  // For creates, stage is already set; only advance when matching existing apps.
  let afterStage = currentStage;
  let afterStageChangedAt = stageChangedAt;

  if (
    !createdApplication &&
    effectWithReason.kind === "advance_stage" &&
    effectWithReason.targetStage
  ) {
    const updated = await applicationRepository.updateStage(
      appId,
      input.userId,
      effectWithReason.targetStage
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
      return {
        applied: false,
        effect: { ...effectWithReason, reason: `stage_${updated.reason}` }
      };
    }
    afterStage = updated.row.stage;
    afterStageChangedAt = updated.row.stageChangedAt;
  }

  await mailMessageRepository.setApplicationId(message.id, input.userId, appId);
  const afterMailAppId = appId;

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
    effectKind: effectWithReason.kind,
    reason: effectWithReason.reason,
    before: before as unknown as Record<string, unknown>,
    after: after as unknown as Record<string, unknown>
  });

  log.set({
    event: "mail_crm_apply_ok",
    messageId: input.messageId,
    userId: input.userId,
    applyId: applyRow.id,
    effectKind: effectWithReason.kind,
    targetStage: effectWithReason.targetStage ?? afterStage,
    applicationId: appId,
    createdApplication
  });
  log.emit();

  return { applied: true, effect: effectWithReason, before, after };
}
