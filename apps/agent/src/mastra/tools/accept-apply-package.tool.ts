import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { acceptApplyPackage } from "#@/mastra/lib/accept-apply-package";

/**
 * Materialize PDFs from apply package draft. Requires HITL approval.
 */
export const acceptApplyPackageTool = createTool({
  id: "accept-apply-package",
  description:
    "Accept apply package draft for an application (writes resume + cover PDFs). Requires prior generateApplyPackage. Requires approval. Must succeed before sendApplyOutreach.",
  inputSchema: z.object({
    applicationId: z.string().min(1).describe("Application id after generateApplyPackage succeeded")
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

    const result = await acceptApplyPackage({ applicationId, userId });
    if (!result.ok) {
      return {
        ok: false,
        applicationId,
        code: result.code,
        message: result.message
      };
    }
    return { ok: true, applicationId: result.application.id };
  }
});
