/**
 * Shared Mastra workflow stream frame parsing.
 * Streams use ASCII RS (\x1e) between JSON events, sometimes also newlines.
 * Callers pass domain extractors via `onEvent`.
 */

/** Split a decode buffer into complete frames; return unconsumed remainder. */
export function splitStreamFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let rest = buffer;
  const delim = rest.includes("\u001E") ? "\u001E" : "\n";
  const parts = rest.split(delim);
  rest = parts.pop() ?? "";
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) frames.push(trimmed);
  }
  return { frames, rest };
}

/** Parse one stream frame (SSE `data:` prefix or bare JSON). */
export function parseMastraStreamFrame(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith(":")) return null;
  const jsonLine = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
  if (!jsonLine || jsonLine === "[DONE]") return null;
  try {
    return JSON.parse(jsonLine) as unknown;
  } catch {
    return null;
  }
}

/**
 * Read a Mastra workflow result stream, invoking `onEvent` for each parsed JSON frame.
 * Flushes a trailing unterminated frame when the stream ends.
 */
export async function readMastraResultStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: unknown) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consume = (frame: string) => {
    const event = parseMastraStreamFrame(frame);
    if (event != null) onEvent(event);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { frames, rest } = splitStreamFrames(buffer);
    buffer = rest;
    for (const frame of frames) consume(frame);
  }

  if (buffer.trim()) consume(buffer);
}
