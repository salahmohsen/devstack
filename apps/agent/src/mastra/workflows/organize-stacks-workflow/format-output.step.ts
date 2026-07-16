import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { OrganizeStacksOutputSchema, type OrganizeAction } from "@tsu-stack/core";

import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

export const formatOutput = createStep({
  id: "format-output",
  description: "Combines all actions into final output with summary",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string())
  }),
  outputSchema: OrganizeStacksOutputSchema,
  execute: async ({ inputData }) => {
    const { mergeActions, renameActions, enrichActions, sortOrder } = inputData;
    const actions: OrganizeAction[] = [];

    for (const m of mergeActions) {
      actions.push({
        type: "merge",
        stackId: m.victimId,
        stackName: m.victimName,
        details: { mergeIntoId: m.survivorId, mergeIntoName: m.survivorName },
        reason: m.reason
      });
    }

    for (const r of renameActions) {
      actions.push({
        type: "rename",
        stackId: r.stackId,
        stackName: r.currentName,
        details: { newName: r.newName },
        reason: r.reason
      });
    }

    for (const e of enrichActions) {
      actions.push({
        type: "enrich",
        stackId: e.stackId,
        stackName: e.stackName,
        details: {
          newDescription: e.description ?? undefined,
          newIcon: e.icon ?? undefined,
          newType: e.type ?? undefined
        },
        reason: `Enrich metadata for "${e.stackName}"`
      });
    }

    return {
      actions,
      sortOrder,
      summary: {
        merges: mergeActions.length,
        renames: renameActions.length,
        enrichments: enrichActions.length,
        sorted: sortOrder.length > 0
      }
    };
  }
});
