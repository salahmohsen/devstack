/**
 * Deterministic importance order for stacks (resume / portfolio first).
 * Used as a seed order and LLM soft-fail fallback for organize-stacks.
 */

import {
  normalizeStackType,
  STACK_TYPE_IMPORTANCE_RANK,
  STACK_TYPE_ORDER
} from "#@/stack/stack-type";

export type SortableStack = {
  id: string;
  name: string;
  type: string | null;
  projectCount: number;
};

/**
 * Sort stacks by type foundation rank, then project count (desc), then name.
 * Always returns every input id exactly once.
 */
export function heuristicImportanceOrder(stacks: SortableStack[]): string[] {
  return [...stacks]
    .toSorted((a, b) => {
      const ar = STACK_TYPE_IMPORTANCE_RANK[normalizeStackType(a.type)] ?? 50;
      const br = STACK_TYPE_IMPORTANCE_RANK[normalizeStackType(b.type)] ?? 50;
      if (ar !== br) return ar - br;
      if (b.projectCount !== a.projectCount) return b.projectCount - a.projectCount;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    })
    .map((s) => s.id);
}

/**
 * Group stacks into type bands (foundation order), each band pre-sorted by
 * project count. Used so LLM only reorders *within* a band (small prompts).
 */
export function groupStacksByTypeBand(stacks: SortableStack[]): Array<{
  type: string;
  stacks: SortableStack[];
}> {
  const map = new Map<string, SortableStack[]>();
  for (const s of stacks) {
    const key = normalizeStackType(s.type);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }

  const bands: Array<{ type: string; stacks: SortableStack[] }> = [];
  const seen = new Set<string>();

  for (const type of STACK_TYPE_ORDER) {
    const list = map.get(type);
    if (!list?.length) continue;
    seen.add(type);
    bands.push({
      type,
      stacks: [...list].toSorted((a, b) => {
        if (b.projectCount !== a.projectCount) return b.projectCount - a.projectCount;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      })
    });
  }

  for (const [type, list] of map) {
    if (seen.has(type) || list.length === 0) continue;
    bands.push({
      type,
      stacks: [...list].toSorted((a, b) => {
        if (b.projectCount !== a.projectCount) return b.projectCount - a.projectCount;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      })
    });
  }

  return bands;
}

/**
 * Chunk size for one LLM sort call. Small enough for reliable structured
 * output; catalogs larger than this are sorted band-by-band / multi-chunk.
 */
export const SORT_LLM_CHUNK_SIZE = 24;

/** Per-chunk LLM race timeout (ms). */
export const SORT_LLM_TIMEOUT_MS = 40_000;
