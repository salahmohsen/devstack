export type ReasoningStep = {
  title: string;
  body: string;
};

function blockToStep(block: string): ReasoningStep {
  const bold = block.match(/^\*\*(.+?)\*\*\s*(?:\n+([\s\S]+))?$/);
  if (bold?.[1]) {
    return { title: bold[1].trim(), body: (bold[2] ?? "").trim() };
  }
  const hash = block.match(/^#{1,6}\s+(.+?)\s*(?:\n+([\s\S]+))?$/);
  if (hash?.[1]) {
    return { title: hash[1].trim(), body: (hash[2] ?? "").trim() };
  }
  const lines = block.split("\n").map((line) => line.trim());
  const first = lines[0] ?? "";
  if (lines.length > 1 && first.length > 0 && first.length <= 64 && !/[.!?]$/.test(first)) {
    return { title: first, body: lines.slice(1).join("\n").trim() };
  }
  const sentence = block.match(/^(.+?[.!?])(?:\s+([\s\S]+))?$/);
  if (sentence?.[1] && sentence[2]?.trim()) {
    return { title: sentence[1].trim(), body: sentence[2].trim() };
  }
  return { title: block, body: "" };
}

const HEADING_ONLY_RE = /^(?:#{1,6}\s+|\*\*)(.+?)(?:\*\*)?$/;

/** Turn streamed reasoning blobs into title + body steps for the panel. */
export function parseReasoningSteps(texts: readonly string[]): ReasoningStep[] {
  const steps: ReasoningStep[] = [];
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    const parts = trimmed
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index] ?? "";
      const heading = part.match(HEADING_ONLY_RE);
      const next = parts[index + 1];
      if (heading?.[1] && next && !HEADING_ONLY_RE.test(next)) {
        steps.push({ title: heading[1].trim(), body: next });
        index += 1;
        continue;
      }
      steps.push(blockToStep(part));
    }
  }
  return steps;
}

export function formatReasoningDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return `${whole}s`;
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}
