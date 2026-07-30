import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  OrganizeStacksOutputSchema,
  type OrganizeAction,
  normalizeOrganizeActions
} from "@tsu-stack/core";

import { uniqueNotes } from "#@/mastra/workflows/organize-stacks-workflow/organize-note";
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
    sortOrder: z.array(z.string()),
    notes: z.array(z.string()).default([])
  }),
  outputSchema: OrganizeStacksOutputSchema,
  execute: async ({ inputData }) => {
    const { stacks, mergeActions, renameActions, enrichActions, sortOrder } = inputData;
    const notes = uniqueNotes(inputData.notes);
    const raw: OrganizeAction[] = [];

    for (const m of mergeActions) {
      raw.push({
        type: "merge",
        stackId: m.victimId,
        stackName: m.victimName,
        details: { mergeIntoId: m.survivorId, mergeIntoName: m.survivorName },
        reason: m.reason
      });
    }

    for (const r of renameActions) {
      raw.push({
        type: "rename",
        stackId: r.stackId,
        stackName: r.currentName,
        details: { newName: r.newName },
        reason: r.reason
      });
    }

    for (const e of enrichActions) {
      if (!e.description && !e.icon && !e.type) continue;
      raw.push({
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

    const { actions, sortOrder: normalizedSortOrder } = normalizeOrganizeActions(
      raw,
      stacks.map((s) => {
        return { id: s.id, name: s.name, projectCount: s.projectCount };
      }),
      sortOrder
    );

    return {
      actions,
      sortOrder: normalizedSortOrder,
      summary: {
        merges: actions.filter((a) => a.type === "merge").length,
        renames: actions.filter((a) => a.type === "rename").length,
        enrichments: actions.filter((a) => a.type === "enrich").length,
        sorted: normalizedSortOrder.length > 0
      },
      notes
    };
  }
});
