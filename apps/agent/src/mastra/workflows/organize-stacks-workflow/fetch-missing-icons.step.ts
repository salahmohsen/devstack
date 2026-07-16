import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { batchResolveIcons } from "#@/mastra/workflows/organize-stacks-workflow/batch-icon-fetch";
import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const fetchMissingIcons = createStep({
  id: "fetch-missing-icons",
  description: "Fetches Iconify SVG icons for stacks that still lack one",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema)
  }),
  execute: async ({ inputData }) => {
    const { stacks, mergeActions, renameActions, enrichActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const enrichedIds = new Set(enrichActions.filter((e) => e.icon).map((e) => e.stackId));

    const missing = stacks.filter((s) => !victimIds.has(s.id) && !s.icon && !enrichedIds.has(s.id));

    if (missing.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions };
    }

    const results = await batchResolveIcons(
      missing.map((s) => {
        return { stackId: s.id, stackName: s.name };
      }),
      3
    );

    const newEnrichActions = [...enrichActions];
    for (const r of results) {
      if (r.svg) {
        newEnrichActions.push({
          stackId: r.stackId,
          stackName: r.stackName,
          description: null,
          icon: r.svg,
          type: null
        });
      }
    }

    return { stacks, mergeActions, renameActions, enrichActions: newEnrichActions };
  }
});
