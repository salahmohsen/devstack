import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  runWithDb
} from "@tsu-stack/db";

import { assertStageAllowedForHubTool } from "#@/mastra/lib/application-stage-guard";

/**
 * Update pipeline stage for a tracked open application.
 * Rejects `applied` — that stage is only set by sendApplyOutreach.
 */
export const updateApplicationStageTool = createTool({
  id: "update-application-stage",
  description:
    "Move a tracked open application to saved|screening|interview|offer. Never use for applied — applied only via sendApplyOutreach after accept. Requires real applicationId.",
  inputSchema: z.object({
    applicationId: z.string().min(1),
    stage: z.string().min(1)
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    applicationId: z.string().optional(),
    stage: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ applicationId, stage }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }

    const guard = assertStageAllowedForHubTool(stage);
    if (!guard.ok) {
      return {
        ok: false,
        applicationId,
        code: guard.code,
        message:
          guard.code === "APPLIED_VIA_SEND_ONLY"
            ? "Stage applied is only set by successful sendApplyOutreach"
            : "Invalid stage for hub tool"
      };
    }

    const db = createDb();
    return runWithDb(db, async () => {
      const before = await applicationRepository.findByIdForUser(applicationId, userId);
      if (!before) {
        return { ok: false, applicationId, code: "NOT_FOUND", message: "Application not found" };
      }
      const result = await applicationRepository.updateStage(applicationId, userId, guard.stage);
      if (!result.ok) {
        return {
          ok: false,
          applicationId,
          code: result.reason === "not_found" ? "NOT_FOUND" : "INVALID_STATE",
          message:
            result.reason === "not_tracked"
              ? "Application must be tracked"
              : result.reason === "closed"
                ? "Cannot change stage on a closed application"
                : "Application not found"
        };
      }
      await applicationActivityRepository.append({
        userId,
        applicationId,
        kind: "stage_changed",
        actorUserId: userId,
        metadata: {
          fromStage: before.stage,
          toStage: guard.stage,
          via: "hub_update_stage"
        }
      });
      return { ok: true, applicationId, stage: result.row.stage };
    });
  }
});
