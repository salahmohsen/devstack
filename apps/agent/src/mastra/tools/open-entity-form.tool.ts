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
    "Open the original experience, project, or stack form on the current dashboard route (do not navigate). Omit id or pass null to create; pass an existing id to edit. Wait for the user to save or discard. After calling this tool, write no user-facing text — the form is the UI. Never invent an entity without this form.",
  inputSchema: z.object({
    kind: EntityFormKindSchema.describe("Evidence form to open: experience | project | stack"),
    id: z
      .string()
      .min(1)
      .optional()
      .nullable()
      .describe("Existing entity id to edit; omit or null to create")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    kind: EntityFormKindSchema,
    id: z.string().min(1).optional(),
    saved: z.boolean(),
    cancelled: z.boolean().optional()
  })
});
