import {
  TokenLimiter,
  ToolCallFilter,
  type ProcessInputStepArgs,
  type Processor
} from "@mastra/core/processors";

/** Align with packages/api `HUB_CHAT_MAX_STEPS` and agent defaultOptions. */
export const HUB_SUPERVISOR_MAX_STEPS = 4 as const;

/**
 * Official last-step completion: Mastra may return an empty turn if the model
 * still calls a tool on the final maxSteps iteration.
 *
 * @see https://mastra.ai/docs/agents/processors — Ensure a final response with maxSteps
 */
export class HubEnsureFinalResponseProcessor implements Processor {
  readonly id = "ensure-final-response";
  readonly maxSteps: number;

  constructor(maxSteps: number) {
    this.maxSteps = maxSteps;
  }

  async processInputStep({ stepNumber, sendSignal }: ProcessInputStepArgs) {
    if (stepNumber !== this.maxSteps - 1) {
      return;
    }

    await sendSignal?.({
      type: "reactive",
      contents:
        `This is your final step (step ${stepNumber + 1} of ${this.maxSteps}). ` +
        `Do not call any more tools. Summarize what you have found and give the user a complete final answer now.`,
      attributes: { reason: "max-steps-reached", step: stepNumber + 1 }
    });

    // Official processInputStep: disable tools on the last step so the model
    // cannot spend the final LLM call on another tool invocation.
    return { toolChoice: "none" as const };
  }
}

/**
 * Hub supervisor input processors (Mastra @mastra/core/processors).
 *
 * Order: last-step completion, ToolCallFilter (drop bulky historical tool
 * payloads), then TokenLimiter so the final model context stays in budget.
 *
 * @see https://mastra.ai/docs/agents/processors
 */
export function createHubInputProcessors(maxSteps: number = HUB_SUPERVISOR_MAX_STEPS) {
  return [
    new HubEnsureFinalResponseProcessor(maxSteps),
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
