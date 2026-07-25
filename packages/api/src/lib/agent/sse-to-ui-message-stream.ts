/**
 * Mastra's `chatRoute` (AI SDK v6) responds with `text/event-stream`:
 *   `data: {"type":"text-delta",...}\n\n`
 *
 * oRPC event iterators must carry JSON-serializable **objects**, not raw
 * `Uint8Array` SSE frames. Piping the byte body through
 * `streamToEventIterator` rehydrates chunks as non-`ArrayBuffer` values on
 * the client, so `TextDecoder.decode` throws:
 *   "parameter 1 is not of type 'ArrayBuffer'".
 *
 * Parse SSE here so the client can use the documented path:
 *   `eventIteratorToUnproxiedDataStream(await client.chatStream(...))`
 * → `useChat` (see oRPC AI SDK integration docs).
 */
export function sseByteStreamToUIMessageChunkStream(
  body: ReadableStream<Uint8Array>
): ReadableStream<Record<string, unknown>> {
  const decoder = new TextDecoder();
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Record<string, unknown>>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          enqueueSsePart(part, controller);
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          enqueueSsePart(buffer, controller);
        }
      }
    })
  );
}

function enqueueSsePart(
  part: string,
  controller: TransformStreamDefaultController<Record<string, unknown>>
): void {
  const dataLines: string[] = [];
  for (const line of part.split("\n")) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return;

  const payload = dataLines.join("\n");
  if (!payload || payload === "[DONE]") return;

  try {
    controller.enqueue(JSON.parse(payload) as Record<string, unknown>);
  } catch {
    // Drop malformed frames — matches AI SDK SSE consumer behavior.
  }
}
