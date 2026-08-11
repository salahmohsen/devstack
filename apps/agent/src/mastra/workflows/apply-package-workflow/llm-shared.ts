import { type RequestContext } from "@mastra/core/di";
import { type z } from "zod";

import { type RuntimeLlmConfig } from "@tsu-stack/core";

import { createByoRequestContext, type GenerateModelOverride } from "#@/mastra/runtime-llm";

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
      structuredOutput: { schema: z.ZodTypeAny };
      model: GenerateModelOverride;
      requestContext: RequestContext;
      modelSettings?: { maxOutputTokens?: number };
    }
  ) => Promise<{ object?: unknown }>;
};

/**
 * Structured generate with timeout race + schema safeParse.
 * Errors are prefixed with `stepLabel` for multi-step workflow stream/toasts.
 */
export async function raceGenerate<TSchema extends z.ZodTypeAny>(
  agent: RaceGenerateAgent,
  prompt: string,
  schema: TSchema,
  model: GenerateModelOverride,
  requestContext: RequestContext,
  options: {
    maxOutputTokens: number;
    timeoutMs: number;
    stepLabel: string;
  }
): Promise<z.infer<TSchema>> {
  const { maxOutputTokens, timeoutMs, stepLabel } = options;

  let result: { object?: unknown };
  try {
    result = await Promise.race([
      agent.generate([{ role: "user", content: prompt }], {
        structuredOutput: { schema },
        model,
        requestContext,
        // CallSettings (AI SDK / Mastra in-process) uses maxOutputTokens; HTTP probe uses maxTokens.
        modelSettings: { maxOutputTokens }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${stepLabel} timeout ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(stepLabel)) {
      throw error instanceof Error ? error : new Error(message);
    }
    throw new Error(`${stepLabel}: ${message}`);
  }

  const parsed = schema.safeParse(result.object);
  if (!parsed.success) {
    throw new Error(
      `${stepLabel}: apply_package_schema_failed: ${parsed.error.message.slice(0, 200)}`
    );
  }

  return parsed.data as z.infer<TSchema>;
}
