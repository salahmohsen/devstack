/**
 * Helpers for Mastra workflow step progress (writer.custom data-* chunks).
 *
 * Task 4 (web client) maps `data-detect-progress` → toast `stepLabel`.
 * When `writer` is unavailable, steps still log intermediate fields via
 * createAgentLogger `log.set` — client can only read stream chunks live.
 */

export type DetectProgressPayload = {
  chunkIndex: number;
  chunkTotal: number;
  unknownTotal: number;
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
