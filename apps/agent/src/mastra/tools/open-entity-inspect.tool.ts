import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const EntityInspectKindSchema = z.enum(["experience", "project", "stack"]);

/**
 * Client tool — dashboard host remounts the original inspect panel.
 * Completes as soon as the panel is requested. No server execute.
 */
export const openEntityInspectTool = createTool({
  id: "open-entity-inspect",
  description:
    "Show the original experience, project, or stack inspect view in the dashboard side panel (do not navigate). Requires a real id from listExperiences / listProjects / listStacks. Use for preview / “show my latest project” / “what am I working on”. Do not use this to edit — editing requires open-entity-form after the user approves an edit plan. After calling, a short summary is OK; the side panel is the full view.",
  inputSchema: z.object({
    kind: EntityInspectKindSchema.describe("Evidence inspect: experience | project | stack"),
    id: z.string().min(1).describe("Existing entity id from the matching list tool")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    kind: EntityInspectKindSchema,
    id: z.string().min(1).optional(),
    opened: z.boolean()
  })
});
