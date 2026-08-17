import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export { openDailyBriefTool } from "./open-daily-brief.tool.ts";

import { applicationRepository, createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

const BriefJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  companyName: z.string(),
  matchScore: z.number().nullable().optional(),
  stage: z.string().optional()
});

const BriefMailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  labels: z.array(z.string()),
  receivedAt: z.string().nullable()
});

/**
 * Structured facts for “what do you have for me today”.
 * The supervisor writes the letter and opens it with openDailyBrief.
 */
export const getDailyBriefTool = createTool({
  id: "get-daily-brief",
  description:
    "Load today's facts (New jobs, recent mail, open tracked). JSON only — do not write the letter here. After this returns, write the letter in the current voice and call openDailyBrief. Use when they ask what you have for them today, a daily recap, what's new, or a briefing.",
  inputSchema: z.object({}).describe("No arguments. Tenant is the session user."),
  outputSchema: z.object({
    dateLabel: z.string(),
    inbox: z.array(BriefJobSchema),
    mail: z.array(BriefMailSchema),
    tracked: z.array(BriefJobSchema),
    inboxCount: z.number().int(),
    trackedCount: z.number().int(),
    mailCount: z.number().int()
  }),
  execute: async (_input, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    const dateLabel = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    if (!userId) {
      return {
        dateLabel,
        inbox: [],
        mail: [],
        tracked: [],
        inboxCount: 0,
        trackedCount: 0,
        mailCount: 0
      };
    }

    const db = createDb();
    const { inbox, tracked, mail } = await runWithDb(db, async () => {
      const [inboxRows, trackedRows, mailRows] = await Promise.all([
        applicationRepository.findByUserIdAndTrackingStatus(userId, "inbox"),
        applicationRepository.findByUserIdAndTrackingStatus(userId, "tracked"),
        mailMessageRepository.findByUserId({
          userId,
          includeSystem: false,
          limit: 8
        })
      ]);
      return { inbox: inboxRows, tracked: trackedRows, mail: mailRows };
    });

    const openTracked = tracked.filter((row) => row.outcome == null);

    return {
      dateLabel,
      inbox: inbox.slice(0, 8).map((row) => {
        return {
          id: row.id,
          title: row.title,
          companyName: row.companyName,
          matchScore: typeof row.matchScore === "number" ? row.matchScore : null
        };
      }),
      mail: mail.map((row) => {
        return {
          id: row.id,
          subject: row.subject?.trim() || "(no subject)",
          labels: row.labels ?? [],
          receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null
        };
      }),
      tracked: openTracked.slice(0, 8).map((row) => {
        return {
          id: row.id,
          title: row.title,
          companyName: row.companyName,
          stage: row.stage
        };
      }),
      inboxCount: inbox.length,
      trackedCount: openTracked.length,
      mailCount: mail.length
    };
  }
});
