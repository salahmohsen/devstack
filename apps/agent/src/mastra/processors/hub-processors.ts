import { TokenLimiter, ToolCallFilter } from "@mastra/core/processors";

/**
 * Hub supervisor input processors (Mastra @mastra/core/processors).
 *
 * Order: ToolCallFilter first (drop bulky historical tool payloads), then
 * TokenLimiter last so the final model context stays within budget after
 * memory loads history (memory processors run before these).
 *
 * @see https://mastra.ai/docs/agents/processors
 */
export function createHubInputProcessors() {
  return [
    // Keep the two most recent tool-producing steps in the agentic loop;
    // older tool args/results (detect/organize dumps) are stripped from
    // subsequent model context to cut tokens without losing the last chain.
    new ToolCallFilter({
      filterAfterToolSteps: 2,
      preserveModelOutput: true
    }),
    // Safety net after memory + tool filtering (~100k input budget for BYO models).
    new TokenLimiter(100_000)
  ];
}
