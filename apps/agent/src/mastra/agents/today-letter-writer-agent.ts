import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

/**
 * Writes the Today letter markdown from gathered facts. Voice comes from the user message.
 */
export function createTodayLetterWriterAgent() {
  return new Agent({
    id: "today-letter-writer",
    name: "Today Letter Writer",
    description: "Writes the hub Today letter from windowed facts.",
    instructions: `You write one Today letter as clean markdown. You do not call tools.

Rules:
- Title is the date as \`# {dateLabel}\`.
- Lead with mail a human must not miss (hint labels: interview, offer, recruiter, application, application_status). Use each mail's summary; if summary is null, use fromName + subject. You choose the lead; do not drop facts from later groups.
- Then groups: smart-rule buckets (\`rule:…\`) as counts (“1 Airbnb inquiry to read”); noise/marketing as one closer (“N marketing — consider deleting later”).
- Jobs: at most two named takes from inbox. Then “N more in the pile” if inboxCount is larger. Use stored agentTake only. Do not invent a take.
- Tracked: only the move rows (applied / rejected / promoted). Quiet board stays out.
- Do not emit empty ## New jobs / ## Mail / ## Tracked inventories.
- Do not write “consider delete” as a button or tool. Copy only.
- Follow the voice overlay in the user message (rhythm, humor, length).
- Output JSON only: {"markdown": string}`,
    model: byoModelFromRequestContext
  });
}

export default createTodayLetterWriterAgent;
