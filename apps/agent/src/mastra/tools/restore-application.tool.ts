import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  runWithDb
} from "@tsu-stack/db";

/**
 * Restore dismissed → New jobs inbox. Mirror applications.restore.
 * Call only on an explicit restore / undo-dismiss utterance.
 */
export const restoreApplicationTool = createTool({
  id: "restore-application",
  description:
    "Restore a dismissed application back to the New jobs inbox. Call ONLY on an explicit restore or undo-dismiss request (e.g. put Trivelta back, undo dismiss). Never infer restore from a company-status or stage read. Pass a real applicationId from searchApplications / listNewJobs / getApplication.",
  inputSchema: z.object({
    applicationId: z.string().min(1).describe("Dismissed application id to restore")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    applicationId: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ applicationId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }

    const db = createDb();
    return runWithDb(db, async () => {
      const owned = await applicationRepository.findByIdForUser(applicationId, userId);
      if (!owned) {
        return { ok: false, applicationId, code: "NOT_FOUND", message: "Application not found" };
      }
      if (owned.trackingStatus === "inbox") {
        return { ok: true, applicationId };
      }
      if (owned.trackingStatus !== "dismissed") {
        return {
          ok: false,
          applicationId,
          code: "INVALID_STATE",
          message: "Only dismissed jobs can be restored"
        };
      }
      const updated = await applicationRepository.setTrackingStatus(applicationId, userId, "inbox");
      if (!updated) {
        return { ok: false, applicationId, code: "NOT_FOUND", message: "Application not found" };
      }
      await applicationActivityRepository.append({
        userId,
        applicationId,
        kind: "restored",
        actorUserId: userId,
        metadata: { via: "hub_restore_application" }
      });
      return { ok: true, applicationId };
    });
  }
});
