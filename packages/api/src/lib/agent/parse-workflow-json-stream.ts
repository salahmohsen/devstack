/**
 * Parse Mastra workflow streams of concatenated JSON objects (NOT SSE).
 * String-aware so braces inside SVG icons / messages do not split events.
 */
export async function* parseConcatenatedJsonStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drainCompleteObjects = function* (): Generator<unknown> {
    let i = 0;
    while (i < buffer.length) {
      while (i < buffer.length && /\s/.test(buffer[i]!)) i++;
      if (i >= buffer.length) {
        buffer = "";
        return;
      }
      if (buffer[i] !== "{") {
        i++;
        continue;
      }

      let depth = 0;
      let inString = false;
      let escaped = false;
      const start = i;

      for (; i < buffer.length; i++) {
        const ch = buffer[i]!;
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === "\\") {
            escaped = true;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }

        if (ch === '"') {
          inString = true;
        } else if (ch === "{") {
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) {
            const slice = buffer.slice(start, i + 1);
            try {
              yield JSON.parse(slice) as unknown;
            } catch {
              // Ignore malformed JSON fragments
            }
            i++;
            buffer = buffer.slice(i);
            i = 0;
            break;
          }
        }
      }

      // Incomplete object — keep remainder for the next chunk
      if (depth > 0 || inString) {
        buffer = buffer.slice(start);
        return;
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* drainCompleteObjects();
    }

    buffer += decoder.decode();
    yield* drainCompleteObjects();

    if (buffer.trim().length > 0) {
      try {
        yield JSON.parse(buffer) as unknown;
      } catch {
        // Ignore malformed trailing data
      }
    }
  } finally {
    reader.releaseLock();
  }
}
