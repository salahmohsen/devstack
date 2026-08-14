import {
  TokenLimiter,
  ToolCallFilter,
  type ProcessInputStepArgs,
  type Processor
} from "@mastra/core/processors";

import { hubPersonalityById } from "@tsu-stack/core";

import { isHubClientHitlToolName } from "#@/mastra/lib/hub-superpowers-policy";

/** Align with packages/api `HUB_CHAT_MAX_STEPS` and agent defaultOptions. */
export const HUB_SUPERVISOR_MAX_STEPS = 16 as const;

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

  async processInputStep({ stepNumber, sendSignal, messages }: ProcessInputStepArgs) {
    if (stepNumber !== this.maxSteps - 1) {
      return;
    }

    // A pending confirmation card is the user-facing UI. Forcing a last-step
    // "summarize" produces leftover "awaiting your confirmation" prose.
    if (mastraMessagesHavePendingClientHitl(messages)) {
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

function mastraPartToolName(part: Record<string, unknown>): string {
  if (typeof part.toolName === "string" && part.toolName.length > 0) return part.toolName;
  const invocation = part.toolInvocation;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    const name = (invocation as { toolName?: unknown }).toolName;
    if (typeof name === "string" && name.length > 0) return name;
  }
  if (
    typeof part.type === "string" &&
    part.type.startsWith("tool-") &&
    part.type !== "tool-invocation"
  ) {
    return part.type.slice("tool-".length);
  }
  return "";
}

function mastraPartHasToolResult(part: Record<string, unknown>): boolean {
  const invocation = part.toolInvocation;
  const state =
    typeof part.state === "string"
      ? part.state
      : invocation && typeof invocation === "object" && !Array.isArray(invocation)
        ? (invocation as { state?: unknown }).state
        : undefined;
  if (
    state === "output-available" ||
    state === "output-error" ||
    state === "result" ||
    state === "output-denied"
  ) {
    return true;
  }
  if (part.output != null) return true;
  if (invocation && typeof invocation === "object" && !Array.isArray(invocation)) {
    return (invocation as { result?: unknown }).result != null;
  }
  return false;
}

/** True when a client HITL tool was called and has not received addToolOutput yet. */
export function mastraMessagesHavePendingClientHitl(
  messages: ProcessInputStepArgs["messages"]
): boolean {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const parts = message.content?.parts ?? [];
    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const part = raw as Record<string, unknown>;
      const name = mastraPartToolName(part);
      if (!isHubClientHitlToolName(name)) continue;
      if (mastraPartHasToolResult(part)) continue;
      return true;
    }
  }
  return false;
}

/**
 * Hub supervisor input processors (Mastra @mastra/core/processors).
 *
 * Order: last-step completion, ToolCallFilter (drop bulky historical tool
 * payloads), then TokenLimiter so the final model context stays in budget.
 *
 * @see https://mastra.ai/docs/agents/processors
 */
/** Applies the user's chosen hub voice on the first step. */
export class HubPersonalityProcessor implements Processor {
  readonly id = "hub-personality";

  async processInputStep({ stepNumber, requestContext, sendSignal }: ProcessInputStepArgs) {
    if (stepNumber !== 0) return;
    const raw = requestContext?.get?.("hubPersonality");
    const preset = hubPersonalityById(typeof raw === "string" ? raw : "cairo");
    await sendSignal?.({
      type: "reactive",
      contents: preset.prompt,
      attributes: { reason: "hub-personality", personality: preset.id }
    });
  }
}

export function createHubInputProcessors(maxSteps: number = HUB_SUPERVISOR_MAX_STEPS) {
  return [
    new HubPersonalityProcessor(),
    new HubEnsureFinalResponseProcessor(maxSteps),
    // Keep enough recent tool-producing steps for superpowers multi-tool
    // chains (listNewJobs + evidence lists + propose → writes). filterAfter=2
    // dropped listNewJobs results before proposeNewJobsTriage and caused empty
    // triage thrash. Detect/organize dumps are still truncated by TokenLimiter.
    new ToolCallFilter({
      filterAfterToolSteps: 8,
      preserveModelOutput: true
    }),
    // Safety net after memory + tool filtering (~100k input budget for BYO models).
    new TokenLimiter(100_000)
  ];
}
