import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { type DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { extractDependencies } from "#@/mastra/workflows/detect-stacks-workflow/extract-dependencies.step";
import { type ExtractedDep } from "#@/mastra/workflows/detect-stacks-workflow/utils";

export const programmaticMatch = createStep({
  id: "programmatic-match",
  description: "Matches extracted dependencies against existing stack_dependency records",
  inputSchema: extractDependencies.outputSchema,
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
    unknown: z.array(
      z.object({
        name: z.string(),
        version: z.string(),
        repo: z.string(),
        workspace: z.string().nullable()
      })
    )
  }),
  execute: async (params) => {
    const initData = params.getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    const { dependencies } = params.inputData;

    // Build lookup: npmPackage → stackId
    const dependencyMap = new Map(
      initData.existingDependencies.map((d) => [d.npmPackage, d.stackId])
    );
    const stackNameById = new Map(initData.existingStacks.map((s) => [s.id, s.name]));

    const matched: Array<{
      npmPackage: string;
      stackId: string;
      name: string;
      repo: string;
      relatedPackages: string[];
    }> = [];
    const unknown: ExtractedDep[] = [];

    for (const dep of dependencies) {
      const stackId = dependencyMap.get(dep.name);
      if (stackId) {
        matched.push({
          npmPackage: dep.name,
          stackId,
          // Prefer library display name over raw npm package (was showing "react-dom" etc.)
          name: stackNameById.get(stackId) ?? dep.name,
          repo: dep.repo,
          relatedPackages: []
        });
      } else {
        unknown.push(dep);
      }
    }

    return { matched, unknown };
  }
});
