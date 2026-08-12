import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { generateApplyPackage } from "#@/mastra/lib/generate-apply-package";

/**
 * Product path: same semantics as packages/api `generateApplyPackage`.
 * Approach B: in-process parity (db + BYO + applyPackageWorkflow + persist).
 * Does not import `@tsu-stack/api` — Mastra bundler cannot absorb that graph.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * chat handler). Never accept `userId` from tool input.
 *
 * HITL: hub-supervisor `requireToolApproval` matches this tool id/name —
 * expensive BYO package generation must not run without Approve.
 */
export const generateApplyPackageTool = createTool({
  id: "generate-apply-package",
  description:
    "Generate apply package draft for an application the user already has (id only). Requires approval. Expensive.",
  inputSchema: z.object({
    applicationId: z.string().min(1)
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    applicationId: z.string().optional(),
    code: z.string().optional(),
    message: z.string().optional()
  }),
  execute: async ({ applicationId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { ok: false, code: "UNAUTHORIZED", message: "No tenant" };
    }

    const result = await generateApplyPackage({ applicationId, userId });
    if (!result.ok) {
      return {
        ok: false,
        applicationId,
        code: result.code,
        message: result.message
      };
    }

    return { ok: true, applicationId: result.applicationId };
  }
});
