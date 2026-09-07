import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { certificationRepository, createDb, runWithDb } from "@tsu-stack/db";

/**
 * Profile read — single certification by id for the current tenant.
 *
 * Tenant scope: `userId` is ALWAYS taken from `requestContext` (set by the
 * workflow step / chat handler). Never accept `userId` from tool input.
 */
export const getCertificationTool = createTool({
  id: "get-certification",
  description:
    "Fetch one certification by id (name, issuer, dates, credential URL, description) for the current user only.",
  inputSchema: z.object({
    certificationId: z
      .string()
      .min(1)
      .describe("Certification id from listCertifications. Required.")
    // Intentionally no userId — tenant is requestContext only.
  }),
  outputSchema: z.object({
    found: z.boolean(),
    certification: z
      .object({
        id: z.string(),
        name: z.string(),
        issuer: z.string(),
        issuedAt: z.string().nullable(),
        expiresAt: z.string().nullable(),
        credentialUrl: z.string().nullable(),
        description: z.string().nullable()
      })
      .nullable()
  }),
  execute: async ({ certificationId }, context) => {
    // Force tenant from requestContext — ignore any model-supplied identity.
    const userId = context.requestContext?.get?.("userId") as string | undefined;
    if (!userId) {
      return { found: false, certification: null };
    }
    const db = createDb();
    const row = await runWithDb(db, () =>
      certificationRepository.findByIdForUser(certificationId, userId)
    );
    if (!row) return { found: false, certification: null };
    return {
      found: true,
      certification: {
        id: row.id,
        name: row.name,
        issuer: row.issuer,
        issuedAt: row.issuedAt ?? null,
        expiresAt: row.expiresAt ?? null,
        credentialUrl: row.credentialUrl ?? null,
        description: row.description ?? null
      }
    };
  }
});
