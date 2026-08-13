import { createStep } from "@mastra/core/workflows";
import { type z } from "zod";

import { type DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { aiCategorize } from "#@/mastra/workflows/detect-stacks-workflow/ai-categorize.step";
import { matchCategorizeSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";

export const deduplicateGroups = createStep({
  id: "deduplicate-groups",
  description: "Ensures no two stacks share a package; absorbs groups into existing stacks",
  inputSchema: aiCategorize.outputSchema,
  outputSchema: matchCategorizeSchema,
  execute: async (params) => {
    const { matched, categorized } = params.inputData;
    const initData = params.getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;

    const dependencyOwnerMap = new Map(
      initData.existingDependencies.map((d) => [d.npmPackage, d.stackId])
    );

    // Preserve programmatic matches. An earlier version rebuilt `matched` only from
    // categorized groups and dropped library hits (TipTap / Query / Form vanished).
    const resolvedMatched: typeof matched = [...matched];
    const alreadyMatched = new Set(matched.map((m) => m.npmPackage));

    for (const m of matched) {
      dependencyOwnerMap.set(m.npmPackage, m.stackId);
    }

    const groupsByName = new Map<string, typeof categorized>();
    for (const cat of categorized) {
      if (alreadyMatched.has(cat.npmPackage)) continue;
      const list = groupsByName.get(cat.name) ?? [];
      list.push(cat);
      groupsByName.set(cat.name, list);
    }

    const resolvedCategorized: typeof categorized = [];

    for (const [groupName, group] of groupsByName) {
      let ownerStackId: string | null = null;
      for (const cat of group) {
        const existingOwner = dependencyOwnerMap.get(cat.npmPackage);
        if (existingOwner) {
          ownerStackId = existingOwner;
          break;
        }
      }

      if (ownerStackId) {
        for (const cat of group) {
          if (alreadyMatched.has(cat.npmPackage)) continue;
          resolvedMatched.push({
            npmPackage: cat.npmPackage,
            stackId: ownerStackId,
            name: groupName,
            repo: cat.repo,
            relatedPackages: []
          });
          alreadyMatched.add(cat.npmPackage);
          dependencyOwnerMap.set(cat.npmPackage, ownerStackId);
        }
      } else {
        resolvedCategorized.push(...group);
      }
    }

    return { matched: resolvedMatched, categorized: resolvedCategorized };
  }
});
