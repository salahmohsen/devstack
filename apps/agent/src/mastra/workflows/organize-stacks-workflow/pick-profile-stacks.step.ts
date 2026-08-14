import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  FEATURED_PROFILE_MAX,
  buildProfilePickPrompt,
  featuredPromptWindow,
  mapFeaturedIndices,
  resolveFeaturedStackIds,
  SORT_LLM_TIMEOUT_MS,
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
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

const FeaturedPickSchema = z.object({
  /** 0-based indices into the prompt window (not UUIDs). */
  featured: z.array(z.number().int().nonnegative()),
  rationale: z.string().optional()
});

export const pickProfileStacks = createStep({
  id: "pick-profile-stacks",
  description:
    "Picks a tight featured-on-profile set (resume Skills) via LLM, with a deterministic fallback",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string()),
    notes: z.array(z.string()).default([])
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string()),
    featuredStackIds: z.array(z.string()),
    notes: z.array(z.string()).default([])
  }),
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__organize_stacks_profile" });
    const { inputData, mastra, abortSignal, writer } = params;
    const priorNotes = inputData.notes ?? [];
    const { stacks, mergeActions, renameActions, enrichActions, sortOrder } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const remaining = stacks.filter((s) => !victimIds.has(s.id));

    const finish = (payload: {
      featuredStackIds: string[];
      notes: string[];
      source: "empty" | "heuristic" | "llm" | "heuristic_fallback";
      reason?: string;
    }) => {
      const softFailed = payload.source === "heuristic_fallback";
      log.set({
        event: "organize_stacks_profile_completed",
        profileSource: payload.source,
        featuredCount: payload.featuredStackIds.length,
        remainingCount: remaining.length,
        durationMs: Date.now() - started,
        reason: payload.reason,
        softFailed
      });
      log.emit(softFailed || payload.source === "empty" ? { _forceKeep: true } : undefined);
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder,
        featuredStackIds: payload.featuredStackIds,
        notes: payload.notes
      };
    };

    if (abortSignal?.aborted) {
      return finish({
        featuredStackIds: [],
        notes: priorNotes,
        source: "empty",
        reason: "aborted"
      });
    }

    if (remaining.length === 0) {
      return finish({
        featuredStackIds: [],
        notes: priorNotes,
        source: "empty",
        reason: "no_remaining"
      });
    }

    const heuristicIds = resolveFeaturedStackIds({
      stacks: remaining,
      sortOrder
    });

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return finish({
        featuredStackIds: heuristicIds,
        notes: [...priorNotes, organizeMissingAgentNote("profile")],
        source: "heuristic_fallback",
        reason: "missing_agent"
      });
    }

    const init = params.getInitData() as OrganizeStacksInput;
    const { model } = generateModelOption(init.llm);
    if (!model) {
      return finish({
        featuredStackIds: heuristicIds,
        notes: [...priorNotes, organizeMissingByoNote("profile")],
        source: "heuristic_fallback",
        reason: "missing_byo"
      });
    }

    const window = featuredPromptWindow(remaining, sortOrder);
    const cap = Math.min(FEATURED_PROFILE_MAX, Math.max(1, heuristicIds.length || 6));

    await writeOrganizeProgress(writer, {
      chunkIndex: 0,
      chunkTotal: 1,
      itemTotal: remaining.length,
      phase: "profile",
      label: buildOrganizeChunkLabel("profile", 1, 1)
    });

    try {
      const result = await withTimeoutSignal(
        (abortSig) =>
          agent.generate([{ role: "user", content: buildProfilePickPrompt(window, cap) }], {
            structuredOutput: { schema: FeaturedPickSchema },
            model,
            abortSignal: abortSig
          }),
        SORT_LLM_TIMEOUT_MS,
        `LLM timeout after ${SORT_LLM_TIMEOUT_MS / 1000}s`,
        abortSignal
      );

      const llmIds = mapFeaturedIndices(window, result.object.featured ?? [], FEATURED_PROFILE_MAX);
      const featuredStackIds = resolveFeaturedStackIds({
        llmIds,
        stacks: remaining,
        sortOrder
      });

      return finish({
        featuredStackIds,
        notes: priorNotes,
        source: "llm",
        reason: result.object.rationale?.slice(0, 120)
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return finish({
          featuredStackIds: [],
          notes: priorNotes,
          source: "empty",
          reason: "aborted"
        });
      }
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "organize_stacks_profile_llm_failed",
        remainingCount: remaining.length
      });
      return finish({
        featuredStackIds: heuristicIds,
        notes: [...priorNotes, organizeLlmFailedNote("profile", error)],
        source: "heuristic_fallback",
        reason: error instanceof Error ? error.message.slice(0, 120) : "llm_error"
      });
    }
  }
});
