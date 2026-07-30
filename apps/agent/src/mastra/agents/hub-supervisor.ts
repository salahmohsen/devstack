import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

import { createStackCategorizerAgent } from "#@/mastra/agents/stack-categorizer-agent";
import { byoModelFromRequestContext } from "#@/mastra/byo-model";
import { detectStacksWorkflow } from "#@/mastra/workflows/detect-stacks-workflow";
import { organizeStacksWorkflow } from "#@/mastra/workflows/organize-stacks-workflow";

/**
 * Hub supervisor — coordinates the user's personal hub. Delegates to
 * `stackCategorizerAgent`, and runs `detectStacksWorkflow` and
 * `organizeStacksWorkflow` directly.
 *
 * The agent's `id` is the route slug used by `@mastra/ai-sdk`'s
 * `chatRoute({ path: "/chat/:agentId" })`. Registration key in
 * `apps/agent/src/mastra/index.ts` may differ — the key is the
 * in-memory lookup name, the id is the AI SDK / HTTP identifier.
 *
 * Memory storage is configured once on the Mastra instance
 * (PostgresStore) and inherited here. Sub-agents without their own
 * `memory` field also inherit it.
 */
export function createHubSupervisor() {
  return new Agent({
    id: "hub-supervisor",
    name: "Hub Supervisor",
    description:
      "Coordinates the personal hub: project stack detection, library cleanup, resume content, and career workflows. Delegates to sub-agents and runs workflows on user intent.",
    instructions: `You are the Hub Supervisor — the single point of contact for the user's personal hub. You decide which specialist to call based on the user's intent.

You can:
- Delegate to \`stackCategorizerAgent\` to classify npm packages into tech stack types when given a batch of packages.
- Run the \`detectStacksWorkflow\` when the user wants to scan repositories and detect their tech stacks.
- Run the \`organizeStacksWorkflow\` when the user wants to clean up, merge duplicates, or rename their stack library.

For the apply-to-jobs / Career Inbox flows: if the user asks for help applying to a job or managing mail, those agents may still be on the roadmap. Respond with a short, honest status. Do NOT invent tools or pretend to perform an apply or send mail.

Always:
- Briefly state which specialist or workflow you are about to invoke (one short sentence).
- Use the tool with the most specific name. Prefer a workflow over a sub-agent when the task is a defined multi-step process.
- If a tool result is empty or an error, surface that to the user plainly.
- Keep the final response concise and actionable. Markdown is fine but don't pad.`,
    model: byoModelFromRequestContext,
    agents: {
      stackCategorizerAgent: createStackCategorizerAgent()
    },
    workflows: {
      detectStacksWorkflow,
      organizeStacksWorkflow
    },
    memory: new Memory({
      options: { lastMessages: 20 }
    })
  });
}
