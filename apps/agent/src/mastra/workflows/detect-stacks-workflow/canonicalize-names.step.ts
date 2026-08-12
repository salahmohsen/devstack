import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  buildCanonicalRenameRulesBlock,
  normalizeOrganizeName,
  type DetectStacksWorkflowInputSchema
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { matchCategorizeSchema } from "#@/mastra/workflows/detect-stacks-workflow/detect-stacks-workflow.schema";
import { mergeFamilies } from "#@/mastra/workflows/detect-stacks-workflow/merge-families.step";
import { withTimeoutSignal } from "#@/mastra/workflows/organize-stacks-workflow/with-timeout";

const RenameSchema = z.object({
  currentName: z.string(),
  newName: z.string(),
  reason: z.string()
});

/**
 * Organize-style rename pass: LLM suggests canonical display names for new stacks.
 * Existing-library stacks keep their DB names.
 */
export const canonicalizeNames = createStep({
  id: "canonicalize-names",
  description: "Standardizes display names to canonical product spellings",
  inputSchema: mergeFamilies.outputSchema,
  outputSchema: matchCategorizeSchema,
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__detect_stacks_canonicalize" });
    const { matched, categorized } = params.inputData;
    const { mastra, abortSignal } = params;

    if (abortSignal?.aborted || categorized.length === 0) {
      log.set({
        event: "detect_stacks_canonicalize_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: abortSignal?.aborted ? "aborted" : "empty"
      });
      log.emit();
      return { matched, categorized };
    }

    const newEntries = categorized.filter((c) => !c.existingStackId);
    if (newEntries.length === 0) {
      log.set({
        event: "detect_stacks_canonicalize_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: "no_new_stacks"
      });
      log.emit();
      return { matched, categorized };
    }

    const uniqueNames = [...new Set(newEntries.map((c) => c.name))];
    const agent = mastra?.getAgent("stackCategorizerAgent");
    const init = params.getInitData() as z.infer<typeof DetectStacksWorkflowInputSchema>;
    const { model } = generateModelOption(init.llm);

    if (!agent || !model) {
      log.set({
        event: "detect_stacks_canonicalize_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: !agent ? "missing_agent" : "missing_byo"
      });
      log.emit();
      return { matched, categorized };
    }

    const reserved = new Map<string, string>();
    for (const s of init.existingStacks) {
      reserved.set(normalizeOrganizeName(s.name), s.name);
    }
    for (const m of matched) {
      reserved.set(normalizeOrganizeName(m.name), m.name);
    }

    const renameMap = new Map<string, string>();
    const CHUNK = 50;
    let softFailed = false;
    const rules = buildCanonicalRenameRulesBlock();

    for (let i = 0; i < uniqueNames.length; i += CHUNK) {
      if (abortSignal?.aborted) break;
      const chunk = uniqueNames.slice(i, i + CHUNK);
      const list = chunk.map((n, idx) => `${idx + 1}. "${n}"`).join("\n");

      const prompt = `Identify stack display names that need canonical product spellings.

Names:
${list}

${rules}

Output JSON:
{
  "renames": [
    { "currentName": "current", "newName": "canonical", "reason": "why" }
  ]
}

Only include names that clearly need a change.`;

      try {
        const result = await withTimeoutSignal(
          (signal) =>
            agent.generate([{ role: "user", content: prompt }], {
              model,
              structuredOutput: {
                schema: z.object({
                  renames: z.array(RenameSchema).default([])
                })
              },
              abortSignal: signal
            }),
          60_000,
          "LLM timeout after 60s",
          abortSignal
        );

        for (const r of result.object.renames ?? []) {
          const current = r.currentName?.trim();
          const next = r.newName?.trim();
          if (!current || !next) continue;
          if (!chunk.includes(current)) continue;
          if (normalizeOrganizeName(current) === normalizeOrganizeName(next)) continue;

          const nextKey = normalizeOrganizeName(next);
          const owner = reserved.get(nextKey);
          if (owner && owner !== current) {
            renameMap.set(current, owner);
            continue;
          }

          renameMap.set(current, next);
          reserved.set(nextKey, next);
        }
      } catch (error) {
        softFailed = true;
        log.error(error instanceof Error ? error : new Error(String(error)), {
          event: "detect_stacks_canonicalize_chunk_failed",
          chunkStart: i,
          chunkSize: chunk.length
        });
      }
    }

    log.set({
      event: "detect_stacks_canonicalize_completed",
      renameCount: renameMap.size,
      candidateCount: uniqueNames.length,
      durationMs: Date.now() - started,
      softFailed
    });
    log.emit(softFailed ? { _forceKeep: true } : undefined);

    if (renameMap.size === 0) {
      return { matched, categorized };
    }

    const nextCategorized = categorized.map((c) => {
      if (c.existingStackId) return c;
      const nextName = renameMap.get(c.name);
      if (!nextName) return c;
      return { ...c, name: nextName };
    });

    return { matched, categorized: nextCategorized };
  }
});
