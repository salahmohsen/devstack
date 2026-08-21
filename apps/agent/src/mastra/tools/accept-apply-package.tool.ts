import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  acceptApplyPackage,
  type AcceptApplyPackageErrorCode
} from "#@/mastra/lib/accept-apply-package";

const ACCEPT_APPLY_PACKAGE_MESSAGES: Record<AcceptApplyPackageErrorCode, string> = {
  NOT_FOUND: "Application not found",
  NO_DRAFT: "No apply package draft to accept — prepare a package first",
  INVALID_DRAFT: "Apply package draft is invalid — regenerate the package",
  STORAGE_NOT_CONFIGURED: "Media storage is not configured",
  PDF_ENGINE_UNAVAILABLE: "PDF engine is unavailable (rendercv or typst missing on PATH)",
  PDF_RENDER_FAILED: "Failed to render resume or cover letter PDF"
};

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
        message: result.message ?? ACCEPT_APPLY_PACKAGE_MESSAGES[result.code]
      };
    }
    return { ok: true, applicationId: result.application.id };
  }
});
