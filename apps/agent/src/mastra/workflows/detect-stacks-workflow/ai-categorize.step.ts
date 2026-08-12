import { createStep } from "@mastra/core/workflows";
import { type z } from "zod";

import {
  buildCanonicalDisplayNamesHint,
  type DetectStacksWorkflowInputSchema
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";
import {
  batchOutputSchema,
  matchCategorizeSchema
} from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
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
      existingStackId: null,
      health: null
    };
  });
}

export const aiCategorize = createStep({
  id: "ai-categorize",
  description:
    "Uses AI to categorize unknown packages in batches (type + display name; descriptions come from npm later)",
  inputSchema: programmaticMatch.outputSchema,
  outputSchema: matchCategorizeSchema,
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_ai_categorize" });
    const { matched, unknown } = params.inputData;
    const abortSignal = params.abortSignal;

    if (abortSignal?.aborted) {
      log.set({
        event: "detect_stacks_ai_categorize_completed",
        unknownCount: unknown.length,
        categorizedCount: 0,
        durationMs: Date.now() - started,
        reason: "aborted"
      });
      log.emit();
      return { matched, categorized: [] };
    }

    if (unknown.length === 0) {
      log.set({
        event: "detect_stacks_ai_categorize_completed",
        unknownCount: 0,
        categorizedCount: 0,
        durationMs: Date.now() - started,
        reason: "no_unknowns"
      });
      log.emit();
      return {
        matched,
        categorized: []
      };
    }

    const agent = params.mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      log.set({
        event: "detect_stacks_ai_categorize_completed",
        unknownCount: unknown.length,
        categorizedCount: unknown.length,
        durationMs: Date.now() - started,
        reason: "missing_agent",
        softFailed: true
      });
      log.emit({ _forceKeep: true });
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
      log.set({
        event: "detect_stacks_ai_categorize_completed",
        unknownCount: unknown.length,
        categorizedCount: unknown.length,
        durationMs: Date.now() - started,
        reason: "missing_byo",
        softFailed: true
      });
      log.emit({ _forceKeep: true });
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

${buildCanonicalDisplayNamesHint()}

You MUST return exactly ${chunk.length} results, one per package, in the same order.
For each package:
1. Does it belong to an existing stack? (yes/no)
2. If yes: which stack name? (must match existing stack name exactly)
3. If no: what type? (framework/language/database/ui/auth/deployment/testing/ai/tooling/storage/state management/other)
4. Display name: REUSE an existing or already-categorized name if this belongs to the same library/family. Only invent a NEW name for genuinely distinct libraries. Prefer canonical product names above.
5. Confidence: high/medium/low
Do NOT invent descriptions — they are filled from the official npm registry later.`;

      try {
        const result = await withTimeoutSignal(
          (signal) =>
            agent.generate([{ role: "user", content: prompt }], {
              structuredOutput: {
                schema: batchOutputSchema
              },
              model,
              abortSignal: signal
            }),
          BATCH_TIMEOUT_MS,
          `LLM timeout after ${BATCH_TIMEOUT_MS / 1000}s`,
          abortSignal
        );

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
                existingStackId: match.id,
                health: null
              });
              usedNames.add(match.name);
              continue;
            }
          }

          categorized.push({
            npmPackage: dep.name,
            name: ai.displayName,
            type: ai.type ?? "other",
            description: null,
            confidence: ai.confidence,
            repo: dep.repo,
            relatedPackages: [],
            iconSvg: null,
            stackId: null,
            existingStackId: null,
            health: null
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
        // Cancel must not invent low-confidence rows — stop the categorize phase.
        if (
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && error.name === "AbortError") ||
          abortSignal?.aborted
        ) {
          break;
        }
        log.error(error instanceof Error ? error : new Error(String(error)), {
          event: "detect_stacks_ai_categorize_chunk_failed",
          chunkStart: i,
          chunkSize: chunk.length
        });
        // Timeout / LLM failure: soft-fail this chunk only
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

    log.set({
      event: "detect_stacks_ai_categorize_completed",
      unknownCount: unknown.length,
      categorizedCount: finalCategorized.length,
      durationMs: Date.now() - started
    });
    log.emit();

    return { matched, categorized: finalCategorized };
  }
});
