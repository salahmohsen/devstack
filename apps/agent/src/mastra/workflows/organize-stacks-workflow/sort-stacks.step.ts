import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import {
  groupStacksByTypeBand,
  heuristicImportanceOrder,
  SORT_LLM_CHUNK_SIZE,
  SORT_LLM_TIMEOUT_MS,
  type OrganizeStacksInput,
  type SortableStack
} from "@tsu-stack/core";

import { createAgentLogger as createLogger } from "#@/mastra/agent-logger";
import { generateModelOption } from "#@/mastra/byo-model";
import { withTimeoutSignal } from "#@/mastra/lib/with-timeout";
import { buildOrganizeChunkLabel, writeOrganizeProgress } from "#@/mastra/lib/workflow-progress";
import {
  organizeLlmFailedNote,
  organizeMissingAgentNote,
  organizeMissingByoNote,
  organizeSortHeuristicNote
} from "#@/mastra/workflows/organize-stacks-workflow/organize-note";
import {
  EnrichActionSchema,
  MergeActionSchema,
  RenameActionSchema,
  StackSchema
} from "#@/mastra/workflows/organize-stacks-workflow/organize-stacks-workflow.schema";

const OrderedIndicesSchema = z.object({
  /** 0-based indices into the chunk list (not UUIDs — keeps tokens tiny). */
  order: z.array(z.number().int().nonnegative())
});

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Map LLM ordinal indices back to stack ids; fill gaps with heuristic order.
 */
export function applyOrdinalOrder(chunk: SortableStack[], indices: number[]): string[] {
  const n = chunk.length;
  const seen = new Set<number>();
  const ordered: string[] = [];
  for (const i of indices) {
    if (!Number.isInteger(i) || i < 0 || i >= n || seen.has(i)) continue;
    seen.add(i);
    ordered.push(chunk[i]!.id);
  }
  // Misses: keep relative heuristic order within the chunk
  for (let i = 0; i < n; i++) {
    if (seen.has(i)) continue;
    ordered.push(chunk[i]!.id);
  }
  return ordered;
}

type GenerateFn = (args: { prompt: string; signal?: AbortSignal }) => Promise<{ order: number[] }>;

type ProgressWriter = {
  custom: (chunk: { type: `data-${string}`; data: unknown; transient?: boolean }) => Promise<void>;
};

/**
 * One compact LLM sort: ordinals instead of UUIDs (big win on large catalogs).
 */
async function llmSortChunk(
  chunk: SortableStack[],
  generate: GenerateFn,
  signal?: AbortSignal
): Promise<string[]> {
  if (chunk.length <= 1) return chunk.map((s) => s.id);
  if (signal?.aborted) return chunk.map((s) => s.id);

  // Seed list already project-count sorted within type — AI only reorders.
  const lines = chunk.map((s, i) => `${i}\t${s.name}\t${s.projectCount}`).join("\n");

  const prompt = `Rank these stacks by resume importance within the same category (most important first).

TSV: index, name, projects
${lines}

Rules:
- Prefer stacks used in more projects
- Prefer core product tech over peripheral utilities
- Keep well-known foundations earlier when project counts are close

Return JSON only: {"order":[0,2,1,...]} — every index 0..${chunk.length - 1} exactly once.`;

  const { order } = await generate({ prompt, signal });
  return applyOrdinalOrder(chunk, order);
}

/**
 * Bound concurrent sort LLM calls so large catalogs finish without rate-limit storms.
 * Abort-safe: workers check signal between items; withTimeoutSignal aborts in-flight generate.
 */
const SORT_LLM_CONCURRENCY = 3;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/**
 * AI sort optimized for large catalogs:
 * 1. Fixed type-band order (language → framework → … → tooling)
 * 2. Within each band, LLM reorders compact ordinal chunks (no UUIDs in output)
 * 3. Chunks run with limited concurrency; failures fall back per-chunk only
 * 4. Progress via writer.custom (`data-organize-progress`) when available
 */
export async function aiImportanceOrder(
  remaining: SortableStack[],
  generate: GenerateFn,
  options?: {
    chunkSize?: number;
    signal?: AbortSignal;
    concurrency?: number;
    writer?: ProgressWriter | null;
    onChunkFailure?: (info: {
      error: unknown;
      workIndex: number;
      bandIndex: number;
      partIndex: number;
      chunkSize: number;
      durationMs: number;
    }) => void;
  }
): Promise<{ order: string[]; chunks: number; chunkFailures: number }> {
  const chunkSize = options?.chunkSize ?? SORT_LLM_CHUNK_SIZE;
  const concurrency = options?.concurrency ?? SORT_LLM_CONCURRENCY;
  const signal = options?.signal;
  const writer = options?.writer;
  const bands = groupStacksByTypeBand(remaining);

  // Flatten into work items that preserve band + chunk order for reassembly
  type Work = { bandIndex: number; partIndex: number; part: SortableStack[] };
  const work: Work[] = [];
  for (let bi = 0; bi < bands.length; bi++) {
    const parts = chunkArray(bands[bi]!.stacks, chunkSize);
    for (let pi = 0; pi < parts.length; pi++) {
      work.push({ bandIndex: bi, partIndex: pi, part: parts[pi]! });
    }
  }

  const chunkTotal = work.length;
  let completed = 0;

  const emitProgress = async (chunkIndex: number) => {
    // 1-based completed count for toast: "Sorting stacks 4/12…"
    const chunkNumber = Math.min(chunkIndex + 1, chunkTotal);
    const label = buildOrganizeChunkLabel("sort", chunkNumber, chunkTotal);
    await writeOrganizeProgress(writer, {
      chunkIndex,
      chunkTotal,
      itemTotal: remaining.length,
      phase: "sort",
      label
    });
  };

  // Initial progress before any LLM call (helps UI when first chunk is slow)
  if (chunkTotal > 0) {
    await emitProgress(0);
  }

  const refinedParts = await mapPool(work, concurrency, async (item, workIndex) => {
    if (signal?.aborted) {
      return { ...item, ids: item.part.map((s) => s.id), failed: false as boolean };
    }
    const chunkStarted = Date.now();
    try {
      const ids = await llmSortChunk(item.part, generate, signal);
      completed += 1;
      // Report highest completed count (concurrent-safe enough for toast UX)
      await emitProgress(Math.max(0, completed - 1));
      return { ...item, ids, failed: false };
    } catch (error) {
      completed += 1;
      options?.onChunkFailure?.({
        error,
        workIndex,
        bandIndex: item.bandIndex,
        partIndex: item.partIndex,
        chunkSize: item.part.length,
        durationMs: Date.now() - chunkStarted
      });
      await emitProgress(Math.max(0, completed - 1));
      // Heuristic order within the failed chunk (already project-count sorted seed)
      return { ...item, ids: item.part.map((s) => s.id), failed: true };
    }
  });

  // Reassemble: band order, then part order within band
  refinedParts.sort((a, b) => a.bandIndex - b.bandIndex || a.partIndex - b.partIndex);
  const order = refinedParts.flatMap((p) => p.ids);
  const chunkFailures = refinedParts.filter((p) => p.failed).length;

  // Safety: any id missed (shouldn't happen) appended in heuristic order
  if (order.length !== remaining.length) {
    const seen = new Set(order);
    for (const id of heuristicImportanceOrder(remaining)) {
      if (!seen.has(id)) order.push(id);
    }
  }

  return { order, chunks: work.length, chunkFailures };
}

export const sortStacks = createStep({
  id: "sort-stacks",
  description:
    "Orders stacks by importance: type bands + AI ordinal ranking within each band (chunked for large catalogs)",
  inputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    notes: z.array(z.string()).default([])
  }),
  outputSchema: z.object({
    stacks: StackSchema,
    mergeActions: z.array(MergeActionSchema),
    renameActions: z.array(RenameActionSchema),
    enrichActions: z.array(EnrichActionSchema),
    sortOrder: z.array(z.string()),
    notes: z.array(z.string()).default([])
  }),
  execute: async (params) => {
    const started = Date.now();
    const log = createLogger({ operation: "agent__organize_stacks_sort" });
    const { inputData, mastra, abortSignal, writer } = params;
    const priorNotes = inputData.notes ?? [];
    const { stacks, mergeActions, renameActions, enrichActions } = inputData;

    const victimIds = new Set(mergeActions.map((m) => m.victimId));
    const remaining = stacks.filter((s) => !victimIds.has(s.id));

    const finish = (payload: {
      sortOrder: string[];
      notes: string[];
      source: "empty" | "heuristic" | "llm" | "heuristic_fallback" | "llm_partial";
      reason?: string;
      chunks?: number;
      chunkFailures?: number;
    }) => {
      const softFailed =
        payload.source === "heuristic_fallback" ||
        payload.source === "llm_partial" ||
        (payload.chunkFailures ?? 0) > 0;
      log.set({
        event: "organize_stacks_sort_completed",
        sortSource: payload.source,
        sortCount: payload.sortOrder.length,
        remainingCount: remaining.length,
        durationMs: Date.now() - started,
        reason: payload.reason,
        chunkCount: payload.chunks ?? 0,
        chunkFailures: payload.chunkFailures ?? 0,
        softFailed
      });
      log.emit(softFailed || payload.source === "empty" ? { _forceKeep: true } : undefined);
      return {
        stacks,
        mergeActions,
        renameActions,
        enrichActions,
        sortOrder: payload.sortOrder,
        notes: payload.notes
      };
    };

    if (abortSignal?.aborted) {
      return finish({
        sortOrder: [],
        notes: priorNotes,
        source: "empty",
        reason: "aborted"
      });
    }

    if (remaining.length === 0) {
      return finish({ sortOrder: [], notes: priorNotes, source: "empty", reason: "no_remaining" });
    }

    const heuristicOrder = heuristicImportanceOrder(remaining);

    const agent = mastra?.getAgent("stackCategorizerAgent");
    if (!agent) {
      return finish({
        sortOrder: heuristicOrder,
        notes: [...priorNotes, organizeMissingAgentNote("sort")],
        source: "heuristic_fallback",
        reason: "missing_agent"
      });
    }

    const init = params.getInitData() as OrganizeStacksInput;
    const { model } = generateModelOption(init.llm);
    if (!model) {
      return finish({
        sortOrder: heuristicOrder,
        notes: [...priorNotes, organizeMissingByoNote("sort")],
        source: "heuristic_fallback",
        reason: "missing_byo"
      });
    }

    const generate: GenerateFn = async ({ prompt, signal }) => {
      if (signal?.aborted) {
        throw new DOMException("Sort cancelled.", "AbortError");
      }
      const result = await withTimeoutSignal(
        (abortSig) =>
          agent.generate([{ role: "user", content: prompt }], {
            structuredOutput: { schema: OrderedIndicesSchema },
            model,
            abortSignal: abortSig
          }),
        SORT_LLM_TIMEOUT_MS,
        `LLM timeout after ${SORT_LLM_TIMEOUT_MS / 1000}s`,
        signal
      );
      return { order: result.object.order ?? [] };
    };

    try {
      const { order, chunks, chunkFailures } = await aiImportanceOrder(remaining, generate, {
        chunkSize: SORT_LLM_CHUNK_SIZE,
        signal: abortSignal,
        writer,
        onChunkFailure: ({ error, workIndex, bandIndex, partIndex, chunkSize, durationMs }) => {
          // Separate short logger so soft-fails are searchable without sealing the parent event.
          const chunkLog = createLogger({ operation: "agent__organize_stacks_sort_chunk" });
          chunkLog.error(error instanceof Error ? error : new Error(String(error)), {
            event: "organize_stacks_sort_chunk_failed",
            workIndex,
            bandIndex,
            partIndex,
            chunkSize,
            remainingCount: remaining.length,
            durationMs
          });
          chunkLog.emit({ _forceKeep: true });
        }
      });

      if (chunkFailures > 0 && chunkFailures >= chunks) {
        // Every chunk failed — surface soft-fail note but still return best-effort order
        return finish({
          sortOrder: order,
          notes: [
            ...priorNotes,
            organizeLlmFailedNote("sort", new Error("all sort chunks failed")),
            organizeSortHeuristicNote("llm_failed")
          ],
          source: "heuristic_fallback",
          reason: "all_chunks_failed",
          chunks,
          chunkFailures
        });
      }

      if (chunkFailures > 0) {
        return finish({
          sortOrder: order,
          notes: [
            ...priorNotes,
            `AI importance order refined ${chunks - chunkFailures}/${chunks} groups; the rest kept project ranking.`
          ],
          source: "llm_partial",
          reason: "partial_chunk_failures",
          chunks,
          chunkFailures
        });
      }

      return finish({
        sortOrder: order,
        notes: priorNotes,
        source: "llm",
        reason: chunks > 1 ? "chunked" : "single",
        chunks,
        chunkFailures: 0
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return finish({
          sortOrder: [],
          notes: priorNotes,
          source: "empty",
          reason: "aborted"
        });
      }
      log.error(error instanceof Error ? error : new Error(String(error)), {
        event: "organize_stacks_sort_llm_failed",
        remainingCount: remaining.length
      });
      return finish({
        sortOrder: heuristicOrder,
        notes: [
          ...priorNotes,
          organizeLlmFailedNote("sort", error),
          organizeSortHeuristicNote("llm_failed")
        ],
        source: "heuristic_fallback",
        reason: error instanceof Error ? error.message.slice(0, 120) : "llm_error"
      });
    }
  }
});
