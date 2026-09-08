import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { certificationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * Profile read — list certifications for the tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const listCertificationsTool = createTool({
  id: "list-certifications",
  description:
    "List the user's certifications (name, issuer, issue/expiry dates, credential URL). Use when they say certifications, certificates, credentials, or licenses.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .default(20)
      .describe("Max entries to return (1–20, default 20)")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    certifications: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        issuer: z.string(),
        issuedAt: z.string().nullable(),
        expiresAt: z.string().nullable(),
        credentialUrl: z.string().nullable(),
        description: z.string().nullable()
      })
    )
  }),
  execute: async ({ limit }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { certifications: [] };
    }
    const db = createDb();
    const rows = await runWithDb(db, () => certificationRepository.findAllByUserId(userId));
    return {
      certifications: rows.slice(0, limit ?? 20).map((r) => {
        return {
          id: r.id,
          name: r.name,
          issuer: r.issuer,
          issuedAt: r.issuedAt ?? null,
          expiresAt: r.expiresAt ?? null,
          credentialUrl: r.credentialUrl ?? null,
          description: r.description ?? null
        };
      })
    };
  }
});
