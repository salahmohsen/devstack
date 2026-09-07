import { createTool } from "@mastra/core/tools";

import {
  ProposeEducationChangeInputSchema,
  ProposeEducationChangeOutputSchema
} from "@tsu-stack/core";

/**
 * HITL confirm for education writes. No execute — the confirm card persists
 * via client oRPC. There is no apply-education-change tool.
 */
export const proposeEducationChangeTool = createTool({
  id: "propose-education-change",
  description:
    "Propose one education create/edit/delete for user confirm. One entity per call. op is create, update, or delete (default update). Omit id on create; pass a real id from listEducations / getEducation to edit or delete. patch is the column delta with education fields only (school, degree, field, location, fromDate, toDate, isPresent, description, gpa) — the schema fails on any other key. For create, patch must include school and degree. After calling, write no user-facing text; the confirm card writes. Never invent an id.",
  inputSchema: ProposeEducationChangeInputSchema,
  outputSchema: ProposeEducationChangeOutputSchema
});
