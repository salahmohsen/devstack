import { MailCrmAuditSnapshotSchema, type UndoMailCrmApplyOutput } from "@tsu-stack/core";
import {
  applicationRepository,
  mailCrmApplyRepository,
  mailMessageRepository
} from "@tsu-stack/db";

export type UndoMailCrmApplyErrorCode = "NOT_FOUND" | "ALREADY_UNDONE" | "RESTORE_FAILED";

export type UndoMailCrmApplyOk = { ok: true; result: UndoMailCrmApplyOutput };
export type UndoMailCrmApplyErr = { ok: false; code: UndoMailCrmApplyErrorCode };

/**
 * Restore application + mail link from the audit `before` snapshot and mark apply undone.
 */
export async function undoMailCrmApply(input: {
  applyId: string;
  userId: string;
}): Promise<UndoMailCrmApplyOk | UndoMailCrmApplyErr> {
  const row = await mailCrmApplyRepository.findByIdForUser(input.applyId, input.userId);
  if (!row) return { ok: false, code: "NOT_FOUND" };
  if (row.undoneAt) return { ok: false, code: "ALREADY_UNDONE" };

  const before = MailCrmAuditSnapshotSchema.safeParse(row.before);
  if (!before.success) return { ok: false, code: "RESTORE_FAILED" };

  const snap = before.data;
  const applicationId = snap.applicationId ?? row.applicationId;

  if (applicationId && snap.stage) {
    const restored = await applicationRepository.restorePipelineState(applicationId, input.userId, {
      stage: snap.stage,
      stageChangedAt: snap.stageChangedAt ?? new Date(),
      outcome: snap.outcome,
      outcomeAt: snap.outcomeAt
    });
    if (!restored) return { ok: false, code: "RESTORE_FAILED" };
  }

  // Restore mail ↔ application link from before snapshot when present.
  if (snap.mailMessageApplicationId !== undefined) {
    await mailMessageRepository.setApplicationId(
      row.messageId,
      input.userId,
      snap.mailMessageApplicationId
    );
  }

  const marked = await mailCrmApplyRepository.markUndone(row.id, input.userId);
  if (!marked?.undoneAt) return { ok: false, code: "ALREADY_UNDONE" };

  return {
    ok: true,
    result: {
      applyId: marked.id,
      messageId: marked.messageId,
      applicationId: applicationId ?? null,
      restoredStage: snap.stage,
      undoneAt: marked.undoneAt
    }
  };
}
