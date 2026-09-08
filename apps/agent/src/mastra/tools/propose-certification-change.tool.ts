import { createTool } from "@mastra/core/tools";

import {
  ProposeCertificationChangeInputSchema,
  ProposeCertificationChangeOutputSchema
} from "@tsu-stack/core";

/**
 * HITL confirm for certification writes. No execute — the confirm card
 * persists via client oRPC. There is no apply-certification-change tool.
 */
export const proposeCertificationChangeTool = createTool({
  id: "propose-certification-change",
  description:
    "Propose one certification create/edit/delete for user confirm. One entity per call. op is create, update, or delete (default update). Omit id on create; pass a real id from listCertifications / getCertification to edit or delete. patch is the column delta with certification fields only (name, issuer, issuedAt, expiresAt, credentialUrl, description) — the schema fails on any other key. For create, patch must include name and issuer, with the full official credential name verbatim. After calling, write no user-facing text; the confirm card writes. Never invent an id.",
  inputSchema: ProposeCertificationChangeInputSchema,
  outputSchema: ProposeCertificationChangeOutputSchema
});
