import { emitAppNotification } from "@tsu-stack/api/lib/notification/emit-app-notification";
import { resolveRuntimeAiCredentials } from "@tsu-stack/api/lib/settings/resolve-runtime-ai";
import {
  APPLICATION_OUTCOME_LABELS,
  APPLICATION_STAGE_LABELS,
  buildApplicationSourceTags,
  MailCrmAuditSnapshotSchema,
  MailSystemLabelSchema,
  proposeMailCrmEffect,
  resolveMonotonicStage,
  type ApplicationOutcome,
  type ApplicationSource,
  type ApplicationStage,
  type MailCrmApplyResult,
  type MailCrmAuditSnapshot,
  type MailSystemLabel
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  mailCrmApplyRepository,
  mailMessageRepository
} from "@tsu-stack/db";
import { createLogger } from "@tsu-stack/logger/server";

import { callCrmApplicationMatcher, callCrmStageAdvisor } from "#@/queues/call-crm-ai-agents";

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

  // job_notifier / noise: proposeMailCrmEffect already no-ops (AI labels, not regex digests).

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

  // Unlinked + career labels: AI match open apps or create a pipeline row.
  const systemLabelsParsed = input.systemLabels
    .map((l) => MailSystemLabelSchema.safeParse(l))
    .filter((r): r is { success: true; data: MailSystemLabel } => r.success)
    .map((r) => r.data);

  if (!appId && systemLabelsParsed.length > 0) {
    const llm = await resolveRuntimeAiCredentials(input.userId, "classify");
    // Open tracked ∪ inbox (not dismissed) so career mail can attach to New jobs discoveries.
    const candidates = await applicationRepository.findCrmMatchCandidatesByUserId(input.userId);
    const matchCall = await callCrmApplicationMatcher({
      messageId: input.messageId,
      userId: input.userId,
      fromName: message.fromName ?? "",
      fromEmail: message.fromEmail ?? "",
      subject: message.subject ?? "",
      preview: message.preview ?? "",
      bodyText: message.bodyText ?? "",
      systemLabels: systemLabelsParsed,
      openApplications: candidates.map((a) => {
        return { id: a.id, companyName: a.companyName, title: a.title, stage: a.stage };
      }),
      llm
    });

    if (matchCall.ok) {
      const match = matchCall.data.output;
      resolveReason = match.reason ?? match.kind;

      if (match.kind === "match_existing" && match.applicationId) {
        const candidateIds = new Set(candidates.map((a) => a.id));
        if (candidateIds.has(match.applicationId)) {
          appId = match.applicationId;
          let app = await applicationRepository.findByIdForUser(appId, input.userId);
          // Design: non-tracked match → promote before stage/outcome effects.
          if (app && app.trackingStatus !== "tracked") {
            const from = app.trackingStatus;
            const promoted = await applicationRepository.setTrackingStatus(
              app.id,
              input.userId,
              "tracked"
            );
            if (promoted) {
              app = promoted;
              await applicationActivityRepository.append({
                userId: input.userId,
                applicationId: app.id,
                kind: "promoted",
                metadata: { from, via: "crm_match", messageId: input.messageId }
              });
              log.set({
                event: "mail_crm_match_promoted",
                messageId: input.messageId,
                userId: input.userId,
                applicationId: app.id,
                from
              });
              log.emit();
            }
          }
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
            reason: match.reason ?? "ai_match"
          });
          log.emit();
        }
      } else if (match.kind === "create_new") {
        const companyName = (match.companyName ?? "").trim() || "Unknown company";
        const title = (match.title ?? "").trim() || "Role from email";
        const stage =
          proposeMailCrmEffect({
            systemLabels: input.systemLabels,
            mailApplicationId: null
          }).targetStage ?? "applied";
        const platform = sourceFromLabels(input.systemLabels);
        const created = await applicationRepository.create({
          userId: input.userId,
          companyName: companyName.slice(0, 300),
          title: title.slice(0, 300),
          source: platform,
          sourceTags: buildApplicationSourceTags({ channel: "mail", platform }),
          notes: null,
          trackingStatus: "tracked",
          stage,
          description: message.preview?.slice(0, 2000) || null,
          sourceMessageId: message.id
        });
        appId = created.id;
        currentStage = created.stage;
        currentOutcome = created.outcome;
        stageChangedAt = created.stageChangedAt;
        outcomeAt = created.outcomeAt;
        createdApplication = true;
        await applicationActivityRepository.append({
          userId: input.userId,
          applicationId: appId,
          kind: "discovered",
          metadata: { via: "crm_create", messageId: input.messageId, stage }
        });
        log.set({
          event: "mail_crm_create_application",
          messageId: input.messageId,
          userId: input.userId,
          applicationId: appId,
          companyName,
          title,
          stage
        });
        log.emit();
      } else {
        log.set({
          event: "mail_crm_match_skip",
          messageId: input.messageId,
          userId: input.userId,
          reason: match.reason ?? "ai_skip",
          kind: match.kind
        });
        log.emit();
      }
    } else {
      log.set({
        event: "mail_crm_match_ai_failed",
        messageId: input.messageId,
        userId: input.userId,
        reason: matchCall.failure.reason
      });
      log.emit({ _forceKeep: true });
    }
  }

  // Stage: AI advisor when we have an app; fall back to label map proposal if AI unavailable.
  let effect = proposeMailCrmEffect({
    systemLabels: input.systemLabels,
    mailApplicationId: appId,
    currentStage,
    currentOutcome
  });

  if (appId && effect.kind !== "noop") {
    const llm = await resolveRuntimeAiCredentials(input.userId, "classify");
    const stageCall = await callCrmStageAdvisor({
      messageId: input.messageId,
      userId: input.userId,
      systemLabels: systemLabelsParsed,
      subject: message.subject ?? "",
      preview: message.preview ?? "",
      bodyText: message.bodyText ?? "",
      currentStage,
      currentOutcome,
      llm
    });
    if (stageCall.ok) {
      const advised = stageCall.data.output;
      const mono = resolveMonotonicStage({
        current: currentStage,
        proposed: advised.targetStage ?? effect.targetStage ?? null
      });
      if (mono && mono !== currentStage) {
        effect = {
          ...effect,
          kind: "advance_stage",
          targetStage: mono,
          reason: advised.reason ?? effect.reason,
          applicationId: appId
        };
      } else if (advised.targetOutcome && !currentOutcome) {
        effect = {
          ...effect,
          kind: "set_outcome",
          targetOutcome: advised.targetOutcome,
          reason: advised.reason ?? "ai_outcome",
          applicationId: appId
        };
      }
    }
  }

  const effectWithReason =
    createdApplication && effect.kind !== "noop"
      ? { ...effect, reason: "created_application", applicationId: appId }
      : resolveReason && effect.kind !== "noop"
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

  // For creates, stage/outcome already set on insert — only mutate existing apps.
  // Activity: create → discovered only; real advances → stage_changed; real closes → outcome_set.
  let afterStage = currentStage;
  let afterStageChangedAt = stageChangedAt;
  let afterOutcome = currentOutcome;
  let afterOutcomeAt = outcomeAt;

  if (
    !createdApplication &&
    effectWithReason.kind === "advance_stage" &&
    effectWithReason.targetStage
  ) {
    const fromStage = currentStage;
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
    await applicationActivityRepository.append({
      userId: input.userId,
      applicationId: appId,
      kind: "stage_changed",
      metadata: {
        fromStage,
        toStage: afterStage,
        via: "crm_mail",
        messageId: input.messageId
      }
    });
  } else if (
    !createdApplication &&
    effectWithReason.kind === "set_outcome" &&
    effectWithReason.targetOutcome
  ) {
    // Open match set is tracked-only; still guard so we never close non-tracked rows.
    const owned = await applicationRepository.findByIdForUser(appId, input.userId);
    if (!owned || owned.trackingStatus !== "tracked") {
      log.set({
        event: "mail_crm_apply_outcome_blocked",
        messageId: input.messageId,
        userId: input.userId,
        applicationId: appId,
        reason: owned ? "not_tracked" : "not_found"
      });
      log.emit();
      return {
        applied: false,
        effect: {
          ...effectWithReason,
          reason: owned ? "outcome_not_tracked" : "outcome_not_found"
        }
      };
    }
    const updated = await applicationRepository.setOutcome(
      appId,
      input.userId,
      effectWithReason.targetOutcome
    );
    if (!updated) {
      log.set({
        event: "mail_crm_apply_outcome_failed",
        messageId: input.messageId,
        userId: input.userId,
        applicationId: appId
      });
      log.emit();
      return {
        applied: false,
        effect: { ...effectWithReason, reason: "outcome_failed" }
      };
    }
    afterOutcome = updated.outcome;
    afterOutcomeAt = updated.outcomeAt;
    afterStage = updated.stage;
    afterStageChangedAt = updated.stageChangedAt;
    await applicationActivityRepository.append({
      userId: input.userId,
      applicationId: appId,
      kind: "outcome_set",
      metadata: {
        outcome: afterOutcome,
        stage: afterStage,
        via: "crm_mail",
        messageId: input.messageId
      }
    });
  }

  await mailMessageRepository.setApplicationId(message.id, input.userId, appId);
  const afterMailAppId = appId;

  const after = snapshotFromApp({
    applicationId: appId,
    stage: afterStage,
    stageChangedAt: afterStageChangedAt,
    outcome: afterOutcome,
    outcomeAt: afterOutcomeAt,
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
    targetOutcome: effectWithReason.targetOutcome ?? afterOutcome,
    applicationId: appId,
    createdApplication
  });
  log.emit();

  const stageLabel = afterStage != null ? APPLICATION_STAGE_LABELS[afterStage] : null;
  const outcomeLabel = afterOutcome != null ? APPLICATION_OUTCOME_LABELS[afterOutcome] : null;
  await emitAppNotification({
    userId: input.userId,
    kind: "application.stage_auto",
    title: createdApplication
      ? "Application created from mail"
      : effectWithReason.kind === "set_outcome" && outcomeLabel
        ? `Closed → ${outcomeLabel}`
        : stageLabel
          ? `Stage updated → ${stageLabel}`
          : "Application updated from mail",
    body: createdApplication
      ? "A pipeline row was auto-created and linked to this message."
      : "Career Inbox classify updated your Tracked jobs board.",
    href: "/dashboard/tracked-jobs",
    messageId: input.messageId,
    applicationId: appId
  });

  return { applied: true, effect: effectWithReason, before, after };
}
