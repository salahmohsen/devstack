import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const EntityInspectKindSchema = z.enum(["experience", "project", "stack", "application"]);

/**
 * Client tool — dashboard host remounts the original inspect panel.
 * Completes as soon as the panel is requested. No server execute.
 */
export const openEntityInspectTool = createTool({
  id: "open-entity-inspect",
  description:
    "Show an inspect panel on the current dashboard page (do not navigate). kind=application for a New/Tracked job (id from listNewJobs / searchApplications / getApplication / listOpenApplications). kind=experience|project|stack for evidence (id from list/get/searchEvidence). Use for “open that ExeQut listing” / “show my latest project”. Prefer this over openSurface for preview. Do not use this to edit evidence — edits go through chat interview + proposeEvidenceChange.",
  inputSchema: z.object({
    kind: EntityInspectKindSchema.describe(
      "application (job listing) | experience | project | stack"
    ),
    id: z.string().min(1).describe("Existing entity id from the matching list/search/get tool")
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    kind: EntityInspectKindSchema,
    id: z.string().min(1).optional(),
    opened: z.boolean()
  })
});
