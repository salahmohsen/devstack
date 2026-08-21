import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  buildCanonicalRenameRulesBlock,
  normalizeOrganizeName,
  type OrganizeStacksInput
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";
import { buildOrganizeChunkLabel, writeOrganizeProgress } from "#@/mastra/lib/workflow-progress";
import {
  organizeLlmFailedNote,
  organizeMissingAgentNote,
  organizeMissingByoNote
} from "#@/mastra/workflows/organize-stacks-workflow/organize-note";
import {
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

/**
 * Rename chunk tuning (Task 3):
 * - 40 stacks/chunk keeps the rename schema small for BYO models.
 * - 45s timeout fails soft before multi-chunk walls pile up (sequential).
 */
const RENAME_CHUNK_SIZE = 40;
const RENAME_CHUNK_TIMEOUT_MS = 45_000;

export const findRenames = createStep({
  id: "find-renames",
  description: "Uses LLM to identify stacks needing name standardization",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema)
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    notes: z.array(z.string()).default([])
  }),
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__organize_stacks_rename" });
    const { inputData, mastra, abortSignal, writer } = params;
    if (abortSignal?.aborted) {
      log.set({
        event: "organize_stacks_rename_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: "aborted"
      });
      log.emit({ _forceKeep: true });
      return {
        stacks: inputData.stacks,
        mergeActions: inputData.mergeActions,
        renameActions: [],
        notes: []
      };
    }
    const { stacks, mergeActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const candidates = stacks.filter((s) => !victimIds.has(s.id));

    if (candidates.length === 0) {
      log.set({
        event: "organize_stacks_rename_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: "no_candidates"
      });
      log.emit();
      return { stacks, mergeActions, renameActions: [], notes: [] };
    }

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      log.set({
        event: "organize_stacks_rename_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: "missing_agent",
        softFailed: true
      });
      log.emit({ _forceKeep: true });
      return {
        stacks,
        mergeActions,
        renameActions: [],
        notes: [organizeMissingAgentNote("rename")]
      };
    }

    const init = params.getInitData() as OrganizeStacksInput;
    const { model } = generateModelOption(init.llm);
    if (!model) {
      log.set({
        event: "organize_stacks_rename_completed",
        renameCount: 0,
        durationMs: Date.now() - started,
        reason: "missing_byo",
        softFailed: true
      });
      log.emit({ _forceKeep: true });
      return {
        stacks,
        mergeActions,
        renameActions: [],
        notes: [organizeMissingByoNote("rename")]
      };
    }

    const renameActions: z.infer<typeof RenameActionSchema>[] = [];
    const extraMerges: z.infer<typeof MergeActionSchema>[] = [];
    const notes: string[] = [];
    const usedStackIds = new Set<string>();
    // Normalized name → owner after planned renames/merges
    const nameOwner = new Map<string, { id: string; name: string }>();
    for (const s of candidates) {
      nameOwner.set(normalizeOrganizeName(s.name), { id: s.id, name: s.name });
    }

    const chunkTotal = Math.ceil(candidates.length / RENAME_CHUNK_SIZE);
    let chunksFailed = 0;

    for (let i = 0; i < candidates.length; i += RENAME_CHUNK_SIZE) {
      if (abortSignal?.aborted) break;
      const chunkIndex = Math.floor(i / RENAME_CHUNK_SIZE);
      const chunk = candidates.slice(i, i + RENAME_CHUNK_SIZE);
      const label = buildOrganizeChunkLabel("rename", chunkIndex + 1, chunkTotal);

      log.set({
        candidateCount: candidates.length,
        chunkIndex,
        chunkTotal,
        chunkSize: chunk.length,
        progressLabel: label,
        durationMs: Date.now() - started
      });
      await writeOrganizeProgress(writer, {
        chunkIndex,
        chunkTotal,
        itemTotal: candidates.length,
        phase: "rename",
        label
      });

      const stackList = chunk
        .map((s) => {
          const aliases = (s.alternativeNames ?? []).join(", ");
          return aliases
            ? `- id: ${s.id} | name: "${s.name}" | aliases: ${aliases}`
            : `- id: ${s.id} | name: "${s.name}"`;
        })
        .join("\n");

      const prompt = `Identify skills whose display name is not the conventional product name.

Skills:
${stackList}

${buildCanonicalRenameRulesBlock()}

Output JSON:
{
  "renames": [
    {
      "stackId": "id",
      "currentName": "current",
      "newName": "canonical",
      "alternativeNames": ["old name", "abbrev"],
      "reason": "why rename"
    }
  ]
}

Only suggest renames when the current name is clearly non-canonical. Skip skills that already have the conventional name. Always include the current name in alternativeNames when it differs from newName. Keep existing aliases.`;

      const chunkStarted = Date.now();
      try {
        const result = await withTimeoutSignal(
          (signal) =>
            agent.generate([{ role: "user", content: prompt }], {
              model,
              structuredOutput: {
                schema: z.object({
                  renames: z.array(RenameActionSchema).default([])
                })
              },
              abortSignal: signal
            }),
          RENAME_CHUNK_TIMEOUT_MS,
          `LLM timeout after ${RENAME_CHUNK_TIMEOUT_MS / 1000}s`,
          abortSignal
        );

        for (const rename of result.object.renames ?? []) {
          const stack = chunk.find((s) => s.id === rename.stackId);
          if (!stack) continue;
          if (usedStackIds.has(rename.stackId)) continue;
          if (victimIds.has(rename.stackId)) continue;

          const newName = rename.newName?.trim();
          if (!newName) continue;

          // No-op (case/spacing insensitive)
          if (normalizeOrganizeName(stack.name) === normalizeOrganizeName(newName)) continue;

          const key = normalizeOrganizeName(newName);
          const owner = nameOwner.get(key);

          // Name already owned by another living stack → auto-merge
          if (owner && owner.id !== rename.stackId) {
            usedStackIds.add(rename.stackId);
            victimIds.add(rename.stackId);
            extraMerges.push({
              victimId: rename.stackId,
              victimName: stack.name,
              survivorId: owner.id,
              survivorName: owner.name,
              reason: `Auto-merged: both resolve to "${owner.name}" (${rename.reason})`
            });
            // Free victim's old name key if still pointing at them
            const oldKey = normalizeOrganizeName(stack.name);
            if (nameOwner.get(oldKey)?.id === rename.stackId) {
              nameOwner.delete(oldKey);
            }
            continue;
          }

          usedStackIds.add(rename.stackId);
          const oldKey = normalizeOrganizeName(stack.name);
          if (nameOwner.get(oldKey)?.id === rename.stackId) {
            nameOwner.delete(oldKey);
          }
          nameOwner.set(key, { id: rename.stackId, name: newName });
          const aliases = [
            stack.name,
            ...(stack.alternativeNames ?? []),
            ...(rename.alternativeNames ?? [])
          ];
          renameActions.push({
            stackId: rename.stackId,
            currentName: stack.name,
            newName,
            reason: rename.reason,
            alternativeNames: aliases
          });
        }
      } catch (error) {
        if (abortSignal?.aborted) break;
        chunksFailed += 1;
        // Separate short logger so chunk failures stay searchable without sealing the parent event.
        const chunkLog = createLogger({ operation: "agent__organize_stacks_rename_chunk" });
        chunkLog.error(error instanceof Error ? error : new Error(String(error)), {
          event: "organize_stacks_rename_chunk_failed",
          chunkIndex,
          chunkTotal,
          chunkStart: i,
          chunkSize: chunk.length,
          durationMs: Date.now() - chunkStarted
        });
        chunkLog.emit({ _forceKeep: true });
        // One note per step — avoid spamming N chunk failures in the dialog
        if (notes.length === 0) {
          notes.push(organizeLlmFailedNote("rename", error));
        }
      }
    }

    const softFailed = notes.length > 0 || chunksFailed > 0;
    log.set({
      event: "organize_stacks_rename_completed",
      renameCount: renameActions.length,
      autoMergeCount: extraMerges.length,
      candidateCount: candidates.length,
      chunkCount: chunkTotal,
      chunkFailures: chunksFailed,
      durationMs: Date.now() - started,
      softFailed
    });
    log.emit(softFailed ? { _forceKeep: true } : undefined);

    return {
      stacks,
      mergeActions: [...mergeActions, ...extraMerges],
      renameActions,
      notes
    };
  }
});
