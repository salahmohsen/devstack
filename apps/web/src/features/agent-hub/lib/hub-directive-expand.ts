import { unstable_defaultDirectiveFormatter } from "@assistant-ui/react";

import { HUB_TOOL_MENTIONS } from "@/features/agent-hub/lib/hub-composer-triggers";

const INSERT_BY_MENTION_ID = new Map(
  HUB_TOOL_MENTIONS.map((row) => [row.id, row.insertText] as const)
);

/**
 * Expand composer directive chips to everyday prompts before Mastra.
 * UI keeps `:hub-tool[Job rules]{name=job-rules}`; the model gets plain English.
 */
export function expandHubDirectiveText(text: string): string {
  if (!text.includes(":")) return text;
  const segments = unstable_defaultDirectiveFormatter.parse(text);
  if (segments.length === 1 && segments[0]?.kind === "text") return text;

  let out = "";
  for (const seg of segments) {
    if (seg.kind === "text") {
      out += seg.text;
      continue;
    }
    if (seg.type === "application") {
      const id = seg.id.trim();
      out += id ? `application {${id}}` : seg.label;
      continue;
    }
    const fromMap = INSERT_BY_MENTION_ID.get(seg.id);
    out += fromMap ?? seg.label;
  }
  return out;
}
