import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { resolveIconForPackage } from "@tsu-stack/core";

import { deduplicateGroups } from "#@/mastra/workflows/detect-stacks-workflow/deduplicate-groups.step";

export const resolveIcons = createStep({
  id: "resolve-icons",
  description: "Fetches SVG icons from Iconify API for each categorized stack",
  inputSchema: deduplicateGroups.outputSchema,
  outputSchema: z.object({
    matched: z.array(
      z.object({
        npmPackage: z.string(),
        stackId: z.string(),
        name: z.string(),
        repo: z.string(),
        relatedPackages: z.array(z.string())
      })
    ),
    categorized: z.array(
      z.object({
        npmPackage: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().nullable(),
        confidence: z.enum(["high", "medium", "low"]),
        repo: z.string(),
        relatedPackages: z.array(z.string()),
        iconSvg: z.string().nullable(),
        stackId: z.string().nullable(),
        existingStackId: z.string().nullable()
      })
    )
  }),
  execute: async ({ inputData }) => {
    const { matched, categorized } = inputData;

    // Only resolve icons for new stacks (not existing ones)
    const toResolve = categorized.filter(
      (c) => c.existingStackId === null && c.confidence !== "low"
    );

    const resolved = await Promise.allSettled(
      toResolve.map(async (stack) => {
        const svg = await resolveIconForPackage(stack.name);
        return { npmPackage: stack.npmPackage, iconSvg: svg };
      })
    );

    const iconMap = new Map<string, string | null>();
    for (const result of resolved) {
      if (result.status === "fulfilled") {
        iconMap.set(result.value.npmPackage, result.value.iconSvg);
      }
    }

    const categorizedWithIcons = categorized.map((stack) => {
      return {
        ...stack,
        iconSvg: iconMap.get(stack.npmPackage) ?? stack.iconSvg
      };
    });

    return { matched, categorized: categorizedWithIcons };
  }
});
