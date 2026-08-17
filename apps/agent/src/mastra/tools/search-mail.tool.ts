import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { createDb, mailMessageRepository, runWithDb } from "@tsu-stack/db";

function haystack(row: {
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  preview: string | null;
  applicationCompanyName: string | null;
  applicationTitle: string | null;
}): string {
  return [
    row.subject,
    row.fromName,
    row.fromEmail,
    row.preview,
    row.applicationCompanyName,
    row.applicationTitle
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Search Career Inbox by company / subject / sender fragment.
 */
export const searchMailTool = createTool({
  id: "search-mail",
  description:
    "Search Career Inbox by company, subject, or sender (e.g. Trivelta). Returns id, subject, labels, receivedAt. Read all hits. Then getMail or classifyMail on the latest mention if it has no system label. job_notifier never changes stage.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Company, subject, or sender fragment."),
    limit: z.number().int().min(1).max(40).optional().default(20)
  }),
  outputSchema: z.object({
    messages: z.array(
      z.object({
        id: z.string(),
        subject: z.string(),
        fromName: z.string(),
        fromEmail: z.string(),
        labels: z.array(z.string()),
        receivedAt: z.string().nullable(),
        applicationId: z.string().nullable(),
        applicationCompanyName: z.string().nullable(),
        applicationTitle: z.string().nullable(),
        preview: z.string()
      })
    )
  }),
  execute: async ({ query, limit }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) return { messages: [] };

    const db = createDb();
    const rows = await runWithDb(db, () =>
      mailMessageRepository.findByUserId({
        userId,
        includeSystem: false,
        limit: 80
      })
    );
    const q = query.trim().toLowerCase();
    const hits = rows.filter((row) => haystack(row).includes(q)).slice(0, limit ?? 20);
    return {
      messages: hits.map((row) => {
        return {
          id: row.id,
          subject: row.subject ?? "",
          fromName: row.fromName ?? "",
          fromEmail: row.fromEmail ?? "",
          labels: row.labels ?? [],
          receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
          applicationId: row.applicationId ?? null,
          applicationCompanyName: row.applicationCompanyName ?? null,
          applicationTitle: row.applicationTitle ?? null,
          preview: row.preview ?? ""
        };
      })
    };
  }
});
