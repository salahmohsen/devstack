import { createStep } from "@mastra/core/workflows";
import { type z } from "zod";

import {
  buildCanonicalDisplayNamesHint,
  type DetectStacksWorkflowInputSchema
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";
import { buildDetectCategorizeLabel, writeDetectProgress } from "#@/mastra/lib/workflow-progress";
import {
  batchOutputSchema,
  matchCategorizeSchema
} from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { programmaticMatch } from "#@/mastra/workflows/detect-stacks-workflow/programmatic-match.step";
import {
  BATCH_CHUNK_SIZE,
  BATCH_TIMEOUT_MS,
  CATEGORIZE_WALL_CLOCK_MS,
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

/** True only when the workflow run was cancelled — not orphan provider AbortErrors. */
function isWorkflowAborted(abortSignal?: AbortSignal): boolean {
  return Boolean(abortSignal?.aborted);
}

export const aiCategorize = createStep({
  id: "ai-categorize",
  description:
    "Uses AI to categorize unknown packages in batches (type + display name; descriptions come from npm later)",
  inputSchema: programmaticMatch.outputSchema,
  outputSchema: matchCategorizeSchema,
  // Soft-fail per chunk handles transient LLM errors; do not retry the whole step
  // (would re-run successful chunks and blow wall-clock).
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_ai_categorize" });
    const { matched, unknown } = params.inputData;
    const abortSignal = params.abortSignal;
    const writer = params.writer;

    if (isWorkflowAborted(abortSignal)) {
      log.set({
        event: "detect_stacks_ai_categorize_completed",
        unknownCount: unknown.length,
        categorizedCount: 0,
        durationMs: Date.now() - started,
        reason: "aborted"
      });
      log.emit({ _forceKeep: true });
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
    const chunkTotal = Math.ceil(unknown.length / BATCH_CHUNK_SIZE);
    let chunksFailed = 0;
    let stopReason: "completed" | "aborted" | "wall_clock" = "completed";

    // Sequential chunks keep usedNames accurate across batches (name reuse).
    for (let i = 0; i < unknown.length; i += BATCH_CHUNK_SIZE) {
      // Mastra cancel triggers abortSignal — stop between chunks (docs: steps must check it)
      if (abortSignal?.aborted) {
        stopReason = "aborted";
        break;
      }

      // Soft wall-clock: leave remaining unknowns as low-confidence so the stream can finish
      // under reverse-proxy kill (~310s) instead of hanging mid-categorize.
      const elapsedMs = Date.now() - started;
      if (elapsedMs >= CATEGORIZE_WALL_CLOCK_MS) {
        stopReason = "wall_clock";
        break;
      }

      const chunkIndex = Math.floor(i / BATCH_CHUNK_SIZE);
      const chunk = unknown.slice(i, i + BATCH_CHUNK_SIZE);
      const rangeStart = i + 1;
      const rangeEnd = i + chunk.length;
      const label = buildDetectCategorizeLabel(rangeStart, rangeEnd, unknown.length);

      // Intermediate fields on the same wide-event logger (emitted once at end).
      // Live UI progress is via writer.custom data-detect-progress (Task 4 maps stepLabel).
      log.set({
        unknownCount: unknown.length,
        chunkIndex,
        chunkTotal,
        chunkSize: chunk.length,
        durationMs: elapsedMs,
        progressLabel: label
      });

      await writeDetectProgress(writer, {
        chunkIndex,
        chunkTotal,
        unknownTotal: unknown.length,
        label
      });

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

      const chunkStarted = Date.now();
      try {
        // Cap this chunk's budget by remaining wall-clock so we don't start a full timeout
        // when the soft deadline is near.
        const remainingWall = CATEGORIZE_WALL_CLOCK_MS - (Date.now() - started);
        const chunkTimeoutMs = Math.max(5_000, Math.min(BATCH_TIMEOUT_MS, remainingWall));

        const result = await withTimeoutSignal(
          (signal) =>
            agent.generate([{ role: "user", content: prompt }], {
              structuredOutput: {
                schema: batchOutputSchema,
                // Schema failures → empty array; missing packages soft-fallback below.
                errorStrategy: "fallback",
                fallbackValue: []
              },
              model,
              abortSignal: signal
            }),
          chunkTimeoutMs,
          `LLM timeout after ${chunkTimeoutMs / 1000}s`,
          abortSignal
        );

        const aiResults = Array.isArray(result.object) ? result.object : [];

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

        // Fallback for missing packages (LLM didn't return them / schema fallback)
        for (const dep of chunk) {
          if (!returnedPackages.has(dep.name)) {
            categorized.push(...lowConfidenceFallback([dep]));
            usedNames.add(dep.name);
          }
        }

        log.set({
          unknownCount: unknown.length,
          chunkIndex,
          chunkTotal,
          chunkSize: chunk.length,
          returnedCount: aiResults.length,
          lastChunkDurationMs: Date.now() - chunkStarted
        });
      } catch (error) {
        // Workflow cancel only: stop without inventing rows for unprocessed packages.
        // Orphan provider AbortError (without abortSignal.aborted) soft-fails the chunk.
        if (isWorkflowAborted(abortSignal)) {
          stopReason = "aborted";
          log.set({
            unknownCount: unknown.length,
            chunkIndex,
            chunkTotal,
            chunkSize: chunk.length,
            lastChunkDurationMs: Date.now() - chunkStarted,
            abortAtChunk: true
          });
          break;
        }
        chunksFailed += 1;
        // Separate short logger so chunk failures are searchable in Axiom without
        // sealing the parent wide-event early.
        const chunkLog = createLogger({ operation: "agent__detect_stacks_ai_categorize_chunk" });
        chunkLog.error(error instanceof Error ? error : new Error(String(error)), {
          event: "detect_stacks_ai_categorize_chunk_failed",
          unknownCount: unknown.length,
          chunkIndex,
          chunkTotal,
          chunkStart: i,
          chunkSize: chunk.length,
          durationMs: Date.now() - chunkStarted,
          reason: "chunk_error"
        });
        chunkLog.emit({ _forceKeep: true });
        // Timeout / LLM failure: soft-fail this chunk only
        for (const dep of chunk) {
          categorized.push(...lowConfidenceFallback([dep]));
          usedNames.add(dep.name);
        }
      }
    }

    // Wall-clock soft-complete: remaining unknowns not yet categorized.
    // Abort must NOT invent rows for unprocessed packages.
    if (stopReason === "wall_clock") {
      const done = new Set(categorized.map((c) => c.npmPackage));
      const remaining = unknown.filter((d) => !done.has(d.name));
      if (remaining.length > 0) {
        categorized.push(...lowConfidenceFallback(remaining));
        log.set({
          unknownCount: unknown.length,
          remainingCount: remaining.length,
          wallClockSoftFilled: remaining.length
        });
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

    const softFailed = chunksFailed > 0 || stopReason === "wall_clock";
    log.set({
      event: "detect_stacks_ai_categorize_completed",
      unknownCount: unknown.length,
      categorizedCount: finalCategorized.length,
      chunkTotal,
      chunksFailed,
      durationMs: Date.now() - started,
      reason: stopReason,
      softFailed
    });
    log.emit(softFailed || stopReason !== "completed" ? { _forceKeep: true } : undefined);

    return { matched, categorized: finalCategorized };
  }
});
