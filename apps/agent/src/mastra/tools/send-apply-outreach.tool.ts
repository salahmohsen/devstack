import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { sendApplyOutreach } from "#@/mastra/lib/send-apply-outreach";

/**
 * First-apply send with resume PDF. Only hub path that sets stage → applied.
 */
export const sendApplyOutreachTool = createTool({
  id: "send-apply-outreach",
  description:
    "Send first-apply outreach email with resume PDF attachment. Requires prior acceptApplyPackage (resumeId + outreach body). Requires approval. On success sets stage applied. Do not call without accept.",
  inputSchema: z.object({
    applicationId: z.string().min(1)
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    applicationId: z.string().optional(),
    stage: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ applicationId }, context) => {
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }

    const result = await sendApplyOutreach({ applicationId, userId });
    if (!result.ok) {
      return {
        ok: false,
        applicationId,
        code: result.code,
        message: result.message
      };
    }
    return {
      ok: true,
      applicationId: result.application.id,
      stage: result.application.stage
    };
  }
});
