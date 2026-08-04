export type CollapseMessagePart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  state?: string;
  approval?: { id: string };
};

/**
 * Multi-step agent streams often emit several consecutive `text` parts
 * (rewrite loops / step-start boundaries). Keep only the **latest** text in
 * each consecutive run so the UI shows one bubble, not a stack.
 * Text interleaved with tools is preserved (preamble + final).
 */
export function collapseConsecutiveTextParts<T extends CollapseMessagePart>(parts: T[]): T[] {
  const out: T[] = [];
  for (const part of parts) {
    // AI SDK UI parts use `step-start` as a separator between multi-step texts.
    if (part.type === "step-start") continue;

    if (part.type === "text") {
      if (!part.text?.trim()) continue;
      const prev = out[out.length - 1];
      if (prev?.type === "text") {
        out[out.length - 1] = part;
        continue;
      }
    }
    out.push(part);
  }
  return out;
}

/**
 * While the assistant is still streaming, hide **completed** text that sits
 * between steps (the thrash: full answer A → full answer B). Only show text
 * that is actively streaming, or all text once the stream has settled.
 */
export function filterTextWhileStreaming<T extends CollapseMessagePart>(
  parts: T[],
  isStreaming: boolean
): T[] {
  if (!isStreaming) return parts;

  const hasStreamingText = parts.some((p) => p.type === "text" && p.state === "streaming");

  return parts.filter((p) => {
    if (p.type !== "text") return true;
    // Prefer live deltas; drop finished intermediate drafts while stream continues.
    if (hasStreamingText) return p.state === "streaming";
    // Stream still open but no text is mid-delta (tool gap / between steps): hide text.
    return false;
  });
}
