import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  runWithDb
} from "@tsu-stack/db";

/**
 * Promote inbox/dismissed → tracked. Mirror applications.promote.
 * Call only after proposeNewJobsTriage confirm (or explicit user intent).
 */
export const trackJobTool = createTool({
  id: "track-job",
  description:
    "Track a New jobs inbox (or dismissed) application: set trackingStatus=tracked. Pass real applicationId from listNewJobs / triage. Do not call before user confirms triage card.",
  inputSchema: z.object({
    applicationId: z.string().min(1).describe("Inbox/dismissed application id confirmed in triage")
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
      if (owned.trackingStatus === "tracked") {
        return { ok: true, applicationId };
      }
      if (owned.trackingStatus !== "inbox" && owned.trackingStatus !== "dismissed") {
        return {
          ok: false,
          applicationId,
          code: "INVALID_STATE",
          message: "Cannot track from current status"
        };
      }
      const from = owned.trackingStatus;
      const updated = await applicationRepository.setTrackingStatus(
        applicationId,
        userId,
        "tracked"
      );
      if (!updated) {
        return { ok: false, applicationId, code: "NOT_FOUND", message: "Application not found" };
      }
      await applicationActivityRepository.append({
        userId,
        applicationId,
        kind: "promoted",
        actorUserId: userId,
        metadata: { from, via: "hub_track_job" }
      });
      return { ok: true, applicationId };
    });
  }
});
