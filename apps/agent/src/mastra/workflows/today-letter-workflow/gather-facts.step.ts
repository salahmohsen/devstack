import { createStep } from "@mastra/core/workflows";

import {
  TODAY_LETTER_INBOX_CAP,
  TODAY_LETTER_MAIL_CAP,
  TODAY_LETTER_TRACKED_CAP,
  TodayLetterGatherOutputSchema,
  TodayLetterWorkflowInputSchema,
  type TodayLetterGatherOutput
} from "@tsu-stack/core";
import {
  applicationActivityRepository,
  applicationRepository,
  createDb,
  mailMessageRepository,
  runWithDb
} from "@tsu-stack/db";

const MS_24H = 24 * 60 * 60 * 1000;

export const gatherFactsStep = createStep({
  id: "gather-facts",
  description: "Today facts for the last 24 hours ending at ask time. No LLM.",
  inputSchema: TodayLetterWorkflowInputSchema,
  outputSchema: TodayLetterGatherOutputSchema,
  execute: async ({ inputData }): Promise<TodayLetterGatherOutput> => {
    const now = new Date();
    const dateLabel = now.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    const since = new Date(now.getTime() - MS_24H);
    const db = createDb();

    const { mail, inbox, tracked, mailCount, inboxCount, trackedCount } = await runWithDb(
      db,
      async () => {
        const [mailRows, inboxRows, trackedRows, mailTotal, inboxTotal, trackedTotal] =
          await Promise.all([
            mailMessageRepository.findReceivedSince({
              userId: inputData.userId,
              since,
              limit: TODAY_LETTER_MAIL_CAP
            }),
            applicationRepository.findInboxWithTakeSince({
              userId: inputData.userId,
              since,
              limit: TODAY_LETTER_INBOX_CAP
            }),
            applicationActivityRepository.listMovesSince({
              userId: inputData.userId,
              since,
              limit: TODAY_LETTER_TRACKED_CAP
            }),
            mailMessageRepository.countReceivedSince({ userId: inputData.userId, since }),
            applicationRepository.countInboxWithTakeSince({ userId: inputData.userId, since }),
            applicationActivityRepository.countMovesSince({ userId: inputData.userId, since })
          ]);
        return {
          mail: mailRows,
          inbox: inboxRows,
          tracked: trackedRows,
          mailCount: mailTotal,
          inboxCount: inboxTotal,
          trackedCount: trackedTotal
        };
      }
    );

    return {
      userId: inputData.userId,
      llm: inputData.llm,
      hubPersonality: inputData.hubPersonality,
      dateLabel,
      since: since.toISOString(),
      window: "rolling24h",
      empty: mailCount === 0 && inboxCount === 0 && trackedCount === 0,
      mail: mail.map((row) => {
        return {
          id: row.id,
          fromName: row.fromName ?? "",
          subject: row.subject?.trim() || "(no subject)",
          labels: row.labels ?? [],
          summary: (() => {
            const trimmed = row.summary?.trim() ?? "";
            return trimmed.length > 0 ? trimmed : null;
          })(),
          receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null
        };
      }),
      inbox: inbox.flatMap((row) => {
        const take = row.agentTake?.trim() ?? "";
        if (!take) return [];
        return [
          {
            id: row.id,
            title: row.title,
            companyName: row.companyName,
            matchScore: typeof row.matchScore === "number" ? row.matchScore : null,
            agentTake: take
          }
        ];
      }),
      tracked: tracked.map((row) => {
        return {
          applicationId: row.applicationId,
          title: row.title,
          companyName: row.companyName,
          kind: row.kind as "stage_changed" | "outcome_set" | "promoted",
          body: row.body ?? null,
          createdAt: row.createdAt.toISOString()
        };
      }),
      mailCount,
      inboxCount,
      trackedCount
    };
  }
});
