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
    enrichActions: z.array(EnrichActionSchema),
    notes: z.array(z.string()).default([])
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    notes: z.array(z.string()).default([])
  }),
  execute: async ({ inputData }) => {
    const { stacks, mergeActions, renameActions, enrichActions } = inputData;
    const notes = inputData.notes ?? [];

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const enrichedWithIcon = new Set(enrichActions.filter((e) => e.icon).map((e) => e.stackId));
    const renameMap = new Map(renameActions.map((r) => [r.stackId, r.newName]));

    // Stacks still without an icon after enrich step
    const missing = stacks.filter(
      (s) => !victimIds.has(s.id) && !s.icon && !enrichedWithIcon.has(s.id)
    );

    if (missing.length === 0) {
      return { stacks, mergeActions, renameActions, enrichActions, notes };
    }

    // Prefer canonical (renamed) name for Iconify search quality
    const results = await batchResolveIcons(
      missing.map((s) => {
        return {
          stackId: s.id,
          stackName: renameMap.get(s.id) ?? s.name
        };
      }),
      3
    );

    const existingByStack = new Map(enrichActions.map((e) => [e.stackId, e]));
    const newEnrichActions = [...enrichActions];

    for (const r of results) {
      if (!r.svg) continue;

      const existing = existingByStack.get(r.stackId);
      if (existing) {
        // Fold icon into existing enrich action for this stack
        const idx = newEnrichActions.findIndex((e) => e.stackId === r.stackId);
        if (idx !== -1) {
          newEnrichActions[idx] = { ...existing, icon: r.svg };
        }
      } else {
        newEnrichActions.push({
          stackId: r.stackId,
          stackName: r.stackName,
          description: null,
          icon: r.svg,
          type: null
        });
      }
    }

    return { stacks, mergeActions, renameActions, enrichActions: newEnrichActions, notes };
  }
});
