import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  runWithDb
} from "@tsu-stack/db";

/**
 * Soft-dismiss an inbox job. Mirror applications.dismiss.
 * Call only after proposeNewJobsTriage confirm (or explicit user intent).
 */
export const dismissJobTool = createTool({
  id: "dismiss-job",
  description:
    "Dismiss a New jobs inbox application (soft archive). Pass real applicationId. Do not call before user confirms triage card. Only inbox rows can be dismissed.",
  inputSchema: z.object({
    applicationId: z.string().min(1).describe("Inbox application id from listNewJobs / triage")
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
      if (owned.trackingStatus === "dismissed") {
        return { ok: true, applicationId };
      }
      if (owned.trackingStatus !== "inbox") {
        return {
          ok: false,
          applicationId,
          code: "INVALID_STATE",
          message: "Only inbox jobs can be dismissed"
        };
      }
      const updated = await applicationRepository.setTrackingStatus(
        applicationId,
        userId,
        "dismissed"
      );
      if (!updated) {
        return { ok: false, applicationId, code: "NOT_FOUND", message: "Application not found" };
      }
      await applicationActivityRepository.append({
        userId,
        applicationId,
        kind: "dismissed",
        actorUserId: userId,
        metadata: { via: "hub_dismiss_job" }
      });
      return { ok: true, applicationId };
    });
  }
});
