/**
 * Parse Mastra/AI-SDK generate HTTP bodies into text or JSON.
 * Shared by application AI jobs (agent take, listing refresh, …).
 */

function textFromContentParts(content: unknown): string | null {
  if (typeof content === "string" && content.trim()) return content.trim();
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === "string" && part.trim()) {
      parts.push(part.trim());
      continue;
    }
    if (!part || typeof part !== "object") continue;
    const rec = part as Record<string, unknown>;
    const type = typeof rec.type === "string" ? rec.type : "";
    if (type === "reasoning" || type === "thinking") continue;
    if (typeof rec.text === "string" && rec.text.trim()) parts.push(rec.text.trim());
  }
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : null;
}

export function extractTextFromAgentBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.text === "string" && rec.text.trim()) return rec.text.trim();
  const fromContent = textFromContentParts(rec.content);
  if (fromContent) return fromContent;
  if (rec.object && typeof rec.object === "object") {
    return JSON.stringify(rec.object);
  }
  if (rec.result && typeof rec.result === "object") {
    const nested = extractTextFromAgentBody(rec.result);
    if (nested) return nested;
  }
  if (Array.isArray(rec.steps)) {
    for (const step of [...rec.steps].toReversed()) {
      const nested = extractTextFromAgentBody(step);
      if (nested) return nested;
    }
  }

  const responseMessages =
    rec.response && typeof rec.response === "object"
      ? (rec.response as Record<string, unknown>).messages
      : null;
  for (const list of [rec.messages, responseMessages]) {
    if (!Array.isArray(list)) continue;
    for (const m of [...list].toReversed()) {
      if (!m || typeof m !== "object") continue;
      const msg = m as Record<string, unknown>;
      const role = typeof msg.role === "string" ? msg.role : "";
      if (role && role !== "assistant") continue;
      if (typeof msg.text === "string" && msg.text.trim()) return msg.text.trim();
      const fromMsg = textFromContentParts(msg.content);
      if (fromMsg) return fromMsg;
    }
  }
  return null;
}

export function agentGenerateFinishReason(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.finishReason === "string" && rec.finishReason.trim()) {
    return rec.finishReason.trim();
  }
  if (rec.result && typeof rec.result === "object") {
    const nested = rec.result as Record<string, unknown>;
    if (typeof nested.finishReason === "string" && nested.finishReason.trim()) {
      return nested.finishReason.trim();
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
