/**
 * Helpers for Mastra workflow step progress (writer.custom data-* chunks).
 *
 * Detect Task 4 (web client) maps `data-detect-progress` → toast `stepLabel`.
 * Organize maps `data-organize-progress` → toast `stepLabel` (same store pattern).
 * When `writer` is unavailable, steps still log intermediate fields via
 * createAgentLogger `log.set` — client can only read stream chunks live.
 */

export type DetectProgressPayload = {
  chunkIndex: number;
  chunkTotal: number;
  unknownTotal: number;
  label: string;
};

export type OrganizeProgressPayload = {
  /** 0-based index of the chunk currently in flight / just finished. */
  chunkIndex: number;
  chunkTotal: number;
  /** Optional stack/candidate total for richer labels. */
  itemTotal?: number;
  /** Which organize LLM phase is running. */
  phase: "sort" | "rename" | "enrich" | "profile";
  label: string;
};

/** 1-based inclusive package range label for detect categorize. */
export function buildDetectCategorizeLabel(
  rangeStart: number,
  rangeEnd: number,
  unknownTotal: number
): string {
  return `Categorizing packages ${rangeStart}–${rangeEnd} of ${unknownTotal}…`;
}

/** 1-based "n/total" label for organize sort/rename/enrich chunk work. */
export function buildOrganizeChunkLabel(
  phase: OrganizeProgressPayload["phase"],
  /** 1-based completed-or-current chunk number */
  chunkNumber: number,
  chunkTotal: number
): string {
  switch (phase) {
    case "sort":
      return `Sorting stacks ${chunkNumber}/${chunkTotal}…`;
    case "rename":
      return `Checking names ${chunkNumber}/${chunkTotal}…`;
    case "enrich":
      return `Analyzing metadata ${chunkNumber}/${chunkTotal}…`;
    case "profile":
      return `Picking profile stacks ${chunkNumber}/${chunkTotal}…`;
  }
}

type ProgressWriter = {
  custom: (chunk: { type: `data-${string}`; data: unknown; transient?: boolean }) => Promise<void>;
};

/**
 * Emit a transient `data-detect-progress` chunk for live UI.
 * Best-effort: never throw if the stream is closed or writer is missing.
 */
export async function writeDetectProgress(
  writer: ProgressWriter | null | undefined,
  payload: DetectProgressPayload
): Promise<void> {
  if (!writer?.custom) return;
  try {
    await writer.custom({
      type: "data-detect-progress",
      data: payload,
      transient: true
    });
  } catch {
    // stream may already be locked/closed
  }
}

/**
 * Emit a transient `data-organize-progress` chunk for live UI.
 * Best-effort: never throw if the stream is closed or writer is missing.
 */
export async function writeOrganizeProgress(
  writer: ProgressWriter | null | undefined,
  payload: OrganizeProgressPayload
): Promise<void> {
  if (!writer?.custom) return;
  try {
    await writer.custom({
      type: "data-organize-progress",
      data: payload,
      transient: true
    });
  } catch {
    // stream may already be locked/closed
  }
}
