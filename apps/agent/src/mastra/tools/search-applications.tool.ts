import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { applicationRepository, createDb, runWithDb } from "@tsu-stack/db";

function scoreHit(haystack: string, query: string): number {
  const text = haystack.toLowerCase();
  const q = query.toLowerCase();
  if (text === q) return 3;
  if (text.startsWith(q)) return 2;
  if (text.includes(q)) return 1;
  return 0;
}

/**
 * Ranked CRM + inbox search by company or title. Tenant from requestContext.
 */
export const searchApplicationsTool = createTool({
  id: "search-applications",
  description:
    "Find a tracked, inbox, or dismissed job by company or title (e.g. Trivelta). Returns id, stage, trackingStatus. Then getApplication. Never invent an id.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Company or role fragment."),
    limit: z.number().int().min(1).max(12).optional().default(6)
  }),
  outputSchema: z.object({
    hits: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        companyName: z.string(),
        stage: z.string(),
        trackingStatus: z.string()
      })
    )
  }),
  execute: async ({ query, limit }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) return { hits: [] };
    const db = createDb();
    const rows = await runWithDb(db, () => applicationRepository.findAllByUserId(userId));
    const q = query.trim();
    const scored = rows.flatMap((row) => {
      const score = Math.max(
        scoreHit(row.companyName ?? "", q),
        scoreHit(row.title ?? "", q),
        scoreHit(`${row.companyName} ${row.title}`, q)
      );
      if (score === 0) return [];
      return [
        {
          score,
          hit: {
            id: row.id,
            title: row.title,
            companyName: row.companyName,
            stage: row.stage,
            trackingStatus: row.trackingStatus
          }
        }
      ];
    });
    scored.sort((a, b) => b.score - a.score || a.hit.companyName.localeCompare(b.hit.companyName));
    return { hits: scored.slice(0, limit ?? 6).map((row) => row.hit) };
  }
});
