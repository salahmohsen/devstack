import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const EntityFormKindSchema = z.enum(["experience", "project", "stack"]);

/**
 * Client HITL tool — dashboard host remounts the original evidence form.
 * No server execute. Hub UI opens the sheet, then addToolOutput after save or cancel.
 */
export const openEntityFormTool = createTool({
  id: "open-entity-form",
  description:
    "Propose opening the original experience, project, or stack form after you discussed the change and have a concrete edit plan. Requires plan (what will change). The confirm card is the approval — do not open the form yourself and write no wrap-up. Omit id to create; pass a real id from list/get to edit. Never call this for preview — use open-entity-inspect. Never invent an entity without this form.",
  inputSchema: z.object({
    kind: EntityFormKindSchema.describe("Evidence form to open: experience | project | stack"),
    id: z
      .string()
      .min(1)
      .optional()
      .nullable()
      .describe("Existing entity id to edit; omit or null to create"),
    plan: z
      .string()
      .min(1)
      .describe(
        "Short edit plan the user is approving (what fields change and why). Shown on the confirm card."
      )
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    kind: EntityFormKindSchema,
    id: z.string().min(1).optional(),
    saved: z.boolean(),
    cancelled: z.boolean().optional()
  })
});
