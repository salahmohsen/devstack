/**
 * Parse Mastra/AI-SDK generate HTTP bodies into text or JSON.
 * Shared by application AI jobs (agent take, listing refresh, …).
 */

export function extractTextFromAgentBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.text === "string" && rec.text.trim()) return rec.text.trim();
  if (typeof rec.content === "string" && rec.content.trim()) return rec.content.trim();
  if (rec.object && typeof rec.object === "object") {
    return JSON.stringify(rec.object);
  }
  if (Array.isArray(rec.messages)) {
    for (const m of [...rec.messages].toReversed()) {
      if (!m || typeof m !== "object") continue;
      const msg = m as Record<string, unknown>;
      if (typeof msg.content === "string" && msg.content.trim()) return msg.content.trim();
      if (typeof msg.text === "string" && msg.text.trim()) return msg.text.trim();
    }
  }
  return null;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // try fenced block
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}
