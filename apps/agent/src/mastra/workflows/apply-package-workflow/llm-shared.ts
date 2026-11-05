import { type RequestContext } from "@mastra/core/di";
import { type z } from "zod";

import { type RuntimeLlmConfig } from "@tsu-stack/core";

import { createByoRequestContext, type GenerateModel } from "#@/mastra/runtime-llm";

export const REWRITE_CHUNK_TIMEOUT_MS = 60_000;
export const LETTERS_TIMEOUT_MS = 90_000;
export const REWRITE_MAX_OUTPUT_TOKENS = 4096;
export const LETTERS_MAX_OUTPUT_TOKENS = 8192;

/** BYO model agents still resolve via requestContext when model override is incomplete. */
export function applyPackageRequestContext(
  llm: RuntimeLlmConfig | undefined,
  applicationId: string
): RequestContext {
  const requestContext = createByoRequestContext(llm);
  requestContext.set("applicationId", applicationId);
  return requestContext;
}

type RaceGenerateAgent = {
  generate: (
    messages: Array<{ role: "user"; content: string }>,
    options: {
      structuredOutput: {
        schema: z.ZodTypeAny;
        /** Prefer capability-aware injection for BYO models without native SO. */
        jsonPromptInjection?: boolean | "auto" | "inline" | "system";
      };
      model: GenerateModel;
      requestContext: RequestContext;
      modelSettings?: { maxOutputTokens?: number };
      abortSignal?: AbortSignal;
      maxSteps?: number;
      /**
       * Apply-package agent registers skill tools. Combining tools + structured
       * output breaks several BYO models (object comes back undefined). Disable
       * tools for these chunk generates — prompts already carry rewrite rules.
       */
      toolChoice?: "auto" | "none" | "required";
    }
  ) => Promise<{
    object?: unknown;
    text?: string;
    finishReason?: string;
    usage?: { outputTokens?: number; reasoningTokens?: number };
  }>;
};

/** First complete JSON object/array in `text`, ignoring trailing prose. */
export function extractFirstJsonValue(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as unknown;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/** Pull JSON from a generate result when `.object` is missing (common with skill tools / prompt-injection SO). */
export function extractStructuredGeneratePayload(result: {
  object?: unknown;
  text?: string;
}): unknown {
  if (result.object !== undefined && result.object !== null) {
    return result.object;
  }
  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) return undefined;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return extractFirstJsonValue(candidate);
  }
}

function formatSchemaFailure(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return error.message.slice(0, 200);
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${issue.code} at ${path}: ${issue.message}`.slice(0, 200);
}

/**
 * Structured generate with timeout race + schema safeParse.
 * Errors are prefixed with `stepLabel` for multi-step workflow stream/toasts.
 */
export async function raceGenerate<TSchema extends z.ZodTypeAny>(
  agent: RaceGenerateAgent,
  prompt: string,
  schema: TSchema,
  model: GenerateModel,
  requestContext: RequestContext,
  options: {
    maxOutputTokens: number;
    timeoutMs: number;
    stepLabel: string;
  }
): Promise<z.infer<TSchema>> {
  const { maxOutputTokens, timeoutMs, stepLabel } = options;

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`${stepLabel} timeout ${timeoutMs}ms`));
        controller.abort();
      }, timeoutMs);
    });
    const result = await Promise.race([
      agent.generate([{ role: "user", content: prompt }], {
        structuredOutput: {
          schema,
          jsonPromptInjection: "auto"
        },
        model,
        requestContext,
        toolChoice: "none",
        maxSteps: 1,
        abortSignal: controller.signal,
        modelSettings: { maxOutputTokens }
      }),
      deadline
    ]);
    const payload = extractStructuredGeneratePayload(result);
    if (payload === undefined) {
      throw new Error(
        `${stepLabel}: apply_package_schema_failed: no structured object (finishReason=${result.finishReason ?? "unknown"}, outputTokens=${result.usage?.outputTokens ?? "unknown"}, reasoningTokens=${result.usage?.reasoningTokens ?? "unknown"})`
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(
        `${stepLabel}: apply_package_schema_failed: ${formatSchemaFailure(parsed.error)}`
      );
    }
    return parsed.data as z.infer<TSchema>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(stepLabel)) {
      throw error instanceof Error ? error : new Error(message);
    }
    throw new Error(`${stepLabel}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}
