import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Client navigate tool — hub UI navigates TanStack Router then completes.
 * No server side-effect. Mirror propose-from-jd (no execute / client complete).
 */
export const openSurfaceTool = createTool({
  id: "open-surface",
  description:
    "Navigate the dashboard UI to an href under /dashboard (e.g. /dashboard/tracked-jobs after triage). Client opens the route; do not invent non-dashboard paths. Prefer after triage confirm when user wants to jump.",
  inputSchema: z.object({
    href: z.string().min(1).describe("Dashboard path only, e.g. /dashboard/tracked-jobs")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    href: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  })
});
