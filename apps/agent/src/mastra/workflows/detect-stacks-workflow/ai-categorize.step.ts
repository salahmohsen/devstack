import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { type DetectStacksWorkflowInputSchema } from "@tsu-stack/core";

import { generateModelOption } from "#@/mastra/byo-model";
import { batchOutputSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { programmaticMatch } from "#@/mastra/workflows/detect-stacks-workflow/programmatic-match.step";
import {
  BATCH_CHUNK_SIZE,
  BATCH_TIMEOUT_MS,
  type CategorizedEntry
} from "#@/mastra/workflows/detect-stacks-workflow/utils";

function lowConfidenceFallback(deps: Array<{ name: string; repo: string }>): CategorizedEntry[] {
  return deps.map((dep) => {
    return {
      npmPackage: dep.name,
      name: dep.name,
      type: "other",
      description: null,
      confidence: "low" as const,
      repo: dep.repo,
      relatedPackages: [] as string[],
      iconSvg: null,
      stackId: null,
      existingStackId: null
    };
  });
}

export const aiCategorize = createStep({
  id: "ai-categorize",
  description: "Uses AI to categorize unknown packages in batches",
  inputSchema: programmaticMatch.outputSchema,
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
  execute: async (params) => {
    const { matched, unknown } = params.inputData;
    const abortSignal = params.abortSignal;

    if (abortSignal?.aborted) {
      return { matched, categorized: [] };
    }

    if (unknown.length === 0) {
      return {
        matched,
        categorized: []
      };
    }

    const agent = params.mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return {
        matched,
        categorized: lowConfidenceFallback(unknown)
      };
    }

    // Build context: existing stacks with their dependency lists
    const initCtx = params.getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    const { model } = generateModelOption(initCtx.llm);
    // Missing BYO: programmatic matches still apply; unknowns stay low-confidence.
    if (!model) {
      return {
        matched,
        categorized: lowConfidenceFallback(unknown)
      };
    }
    const existingStacks = initCtx.existingStacks;
    const existingDeps = initCtx.existingDependencies;

    // Group existing dependencies by stackId
    const depsByStack = new Map<string, string[]>();
    for (const dep of existingDeps) {
      const list = depsByStack.get(dep.stackId) ?? [];
      list.push(dep.npmPackage);
      depsByStack.set(dep.stackId, list);
    }

    const existingStackContext = existingStacks
      .map((s) => {
        const deps = depsByStack.get(s.id) ?? [];
        return `- ${s.name} — dependencies: ${deps.join(", ")}`;
      })
      .join("\n");

    const categorized: CategorizedEntry[] = [];
    const usedNames = new Set<string>();

    // Chunk unknowns and process sequentially
    for (let i = 0; i < unknown.length; i += BATCH_CHUNK_SIZE) {
      // Mastra cancel triggers abortSignal — stop between chunks (docs: steps must check it)
      if (abortSignal?.aborted) {
        break;
      }

      const chunk = unknown.slice(i, i + BATCH_CHUNK_SIZE);

      const packageList = chunk
        .map(
          (dep, idx) =>
            `${idx + 1}. ${dep.name} | repo: ${dep.repo} | workspace: ${dep.workspace ?? "(root)"}`
        )
        .join("\n");

      const prompt = `Existing stacks:
${existingStackContext || "(none)"}

Already categorized in this run (REUSE the same name for related packages of the same library/family):
${
  usedNames.size > 0
    ? Array.from(usedNames)
        .map((n) => `- ${n}`)
        .join("\n")
    : "(none)"
}

Packages to categorize (${chunk.length} total):
${packageList}

You MUST return exactly ${chunk.length} results, one per package, in the same order.
For each package:
1. Does it belong to an existing stack? (yes/no)
2. If yes: which stack name? (must match existing stack name exactly)
3. If no: what type? (framework/language/database/ui/auth/deployment/testing/ai/tooling/storage/other)
4. Display name: REUSE an existing name if this belongs to the same library/family. Only invent a NEW name for genuinely distinct libraries.
5. Confidence: high/medium/low
6. A one-sentence description`;

      try {
        const result = await Promise.race([
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: {
              schema: batchOutputSchema
            },
            model
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`LLM timeout after ${BATCH_TIMEOUT_MS / 1000}s`)),
              BATCH_TIMEOUT_MS
            )
          )
        ]);

        const aiResults = result.object;

        // Validate: build lookup of returned packages
        const returnedPackages = new Set(aiResults.map((r) => r.npmPackage));

        // Process each AI result
        for (const ai of aiResults) {
          const dep = chunk.find((d) => d.name === ai.npmPackage);
          if (!dep) continue; // extra entry — discard

          if (ai.belongsToExistingStack && ai.existingStackName) {
            const match = existingStacks.find(
              (s) => s.name.toLowerCase() === ai.existingStackName!.toLowerCase()
            );
            if (match) {
              categorized.push({
                npmPackage: dep.name,
                name: match.name,
                type: "other",
                description: null,
                confidence: ai.confidence,
                repo: dep.repo,
                relatedPackages: [],
                iconSvg: null,
                stackId: null,
                existingStackId: match.id
              });
              usedNames.add(match.name);
              continue;
            }
          }

          categorized.push({
            npmPackage: dep.name,
            name: ai.displayName,
            type: ai.type ?? "other",
            description: ai.description,
            confidence: ai.confidence,
            repo: dep.repo,
            relatedPackages: [],
            iconSvg: null,
            stackId: null,
            existingStackId: null
          });
          usedNames.add(ai.displayName);
        }

        // Fallback for missing packages (LLM didn't return them)
        for (const dep of chunk) {
          if (!returnedPackages.has(dep.name)) {
            categorized.push(...lowConfidenceFallback([dep]));
            usedNames.add(dep.name);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.debug(`[detect-stacks] AI categorize chunk failed, using fallback: ${message}`);
        // Fallback: all packages in this chunk get low-confidence entries
        for (const dep of chunk) {
          categorized.push(...lowConfidenceFallback([dep]));
          usedNames.add(dep.name);
        }
      }
    }

    // Deterministic scope grouping: merge packages under same npm scope
    const scopeGroups = new Map<string, CategorizedEntry[]>();
    const unscoped: CategorizedEntry[] = [];

    for (const entry of categorized) {
      const scopeMatch = entry.npmPackage.match(/^(@[^/]+\/)/);
      if (scopeMatch) {
        const scope = scopeMatch[1];
        const list = scopeGroups.get(scope) ?? [];
        list.push(entry);
        scopeGroups.set(scope, list);
      } else {
        unscoped.push(entry);
      }
    }

    // For each scope group, pick the most common displayName as canonical
    const finalCategorized: CategorizedEntry[] = [...unscoped];
    for (const entries of scopeGroups.values()) {
      if (entries.length <= 1) {
        finalCategorized.push(...entries);
        continue;
      }

      // Count displayName frequency
      const nameCounts = new Map<string, number>();
      for (const e of entries) {
        nameCounts.set(e.name, (nameCounts.get(e.name) ?? 0) + 1);
      }
      const canonicalName = [...nameCounts.entries()].toSorted((a, b) => b[1] - a[1])[0][0];

      // Merge all entries under the canonical name
      for (const e of entries) {
        finalCategorized.push({ ...e, name: canonicalName });
      }
    }

    return { matched, categorized: finalCategorized };
  }
});
