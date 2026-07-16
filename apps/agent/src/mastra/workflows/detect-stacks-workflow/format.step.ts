import { createStep } from "@mastra/core/workflows";

import { DetectStacksOutputSchema } from "@tsu-stack/core";

import { resolveIcons } from "#@/mastra/workflows/detect-stacks-workflow/resolve-icons.step";
import { type InitData } from "#@/mastra/workflows/detect-stacks-workflow/utils";

export const format = createStep({
  id: "format",
  description: "Merges matched and categorized results, computes diff",
  inputSchema: resolveIcons.outputSchema,
  outputSchema: DetectStacksOutputSchema,
  execute: async (params) => {
    const initData = params.getInitData() as InitData;
    const { matched, categorized } = params.inputData;

    // Build enriched stacks from matched entries
    const matchedStacks = matched.map(
      (m: {
        npmPackage: string;
        stackId: string;
        name: string;
        repo: string;
        relatedPackages: string[];
      }) => {
        return {
          npmPackage: m.npmPackage,
          name: m.name,
          type: "other",
          description: null,
          confidence: "medium" as const,
          iconSvg: null,
          exists: true,
          existingStackId: m.stackId,
          repo: m.repo,
          relatedPackages: m.relatedPackages,
          health: null as {
            deprecated?: boolean;
            downloads?: number;
            lastPublished?: string;
          } | null
        };
      }
    );

    // Build enriched stacks from categorized entries
    const categorizedStacks = categorized.map(
      (c: {
        npmPackage: string;
        name: string;
        type: string;
        description: string | null;
        confidence: "high" | "medium" | "low";
        repo: string;
        relatedPackages: string[];
        iconSvg: string | null;
        stackId: string | null;
        existingStackId: string | null;
      }) => {
        return {
          npmPackage: c.npmPackage,
          name: c.name,
          type: c.type,
          description: c.description,
          confidence: c.confidence,
          iconSvg: c.iconSvg,
          exists: c.existingStackId !== null,
          existingStackId: c.existingStackId,
          repo: c.repo,
          relatedPackages: c.relatedPackages,
          health: null as {
            deprecated?: boolean;
            downloads?: number;
            lastPublished?: string;
          } | null
        };
      }
    );

    // Merge and deduplicate by npmPackage.
    // If two entries claim the same npmPackage, prefer the one with
    // existingStackId (it's already in the DB) or the first one seen.
    type EnrichedStack = (typeof matchedStacks)[number] | (typeof categorizedStacks)[number];
    const dedupedByPackage = new Map<string, EnrichedStack>();
    for (const stack of [...matchedStacks, ...categorizedStacks]) {
      const existing = dedupedByPackage.get(stack.npmPackage);
      if (!existing || (stack.existingStackId && !existing.existingStackId)) {
        dedupedByPackage.set(stack.npmPackage, stack);
      }
    }
    const deduplicatedAllStacks = Array.from(dedupedByPackage.values());

    // NEW: Group by display name to combine e.g. all Radix UI packages
    const groupedByNameMap = new Map<
      string,
      { stacks: typeof deduplicatedAllStacks; displayName: string }
    >();
    for (const stack of deduplicatedAllStacks) {
      const existing = groupedByNameMap.get(stack.name);
      if (!existing) {
        groupedByNameMap.set(stack.name, {
          displayName: stack.name,
          stacks: [stack]
        });
      } else {
        // Union related packages, keep the first stack's metadata (name, type, etc.)
        existing.stacks.push(stack);
      }
    }
    const groupedByName = Array.from(groupedByNameMap.entries()).map(([_, value]) => {
      const { displayName, stacks } = value;
      // Merge all packages under this displayName
      // Collect ALL npm packages as relatedPackages so other projects can recognize them
      const allRelatedPackages = Array.from(new Set(stacks.map((s) => s.npmPackage)));
      const merged = {
        ...stacks[0],
        name: displayName,
        relatedPackages: allRelatedPackages
      };
      return merged;
    });

    // Group by repo (for frontend grouping)
    const groupedByRepoMap = new Map<string, typeof groupedByName>();
    for (const stack of groupedByName) {
      const existing = groupedByRepoMap.get(stack.repo) ?? [];
      existing.push(stack);
      groupedByRepoMap.set(stack.repo, existing);
    }
    const groupedByRepo = Array.from(groupedByRepoMap.entries()).map(([repo, stacks]) => {
      return {
        repo,
        stacks
      };
    });

    // Compute diff against last scan
    const currentPackages = groupedByName.map((s) => s.npmPackage);
    const previousPackages = (initData.lastScan?.detectedPackages ?? []) as string[];

    const added = currentPackages.filter((p) => !previousPackages.includes(p));
    const unchanged = currentPackages.filter((p) => previousPackages.includes(p));
    const removed = previousPackages.filter((p) => !currentPackages.includes(p));

    const hasChanges = added.length > 0 || removed.length > 0;

    return {
      detectedStacks: groupedByName,
      groupedByRepo,
      hasChanges,
      diff: initData.lastScan ? { added, unchanged, removed } : null
    };
  }
});
