import { createOpenAI } from "@ai-sdk/openai";

import {
  CHATGPT_PLAN_API_BASE_URL,
  chatgptPlanSlugFromModelId,
  mapResponsesFailure
} from "@tsu-stack/core";
import { createDb, runWithDb, userChatgptPlanRepository } from "@tsu-stack/db";

/** Fields the plan endpoint rejects (see the token-sharing "Preview limitations" page). */
const UNSUPPORTED_BODY_FIELDS = [
  "background",
  "conversation",
  "max_output_tokens",
  "max_tool_calls",
  "metadata",
  "moderation",
  "multi_agent",
  "prompt",
  "prompt_cache_retention",
  "safety_identifier",
  "temperature",
  "top_logprobs",
  "top_p",
  "truncation",
  "user",
  "previous_response_id"
] as const;

type ResponsesBody = Record<string, unknown> & { stream?: boolean; input?: unknown };

function conformBody(raw: string): { body: ResponsesBody; wantedStream: boolean } {
  const body = JSON.parse(raw) as ResponsesBody;
  const wantedStream = body.stream === true;
  for (const field of UNSUPPORTED_BODY_FIELDS) delete body[field];
  body.store = false;
  body.stream = true;
  if (Array.isArray(body.input)) {
    body.input = body.input.map((item: unknown) =>
      item && typeof item === "object" && (item as { role?: unknown }).role === "system"
        ? { ...item, role: "developer" }
        : item
    );
  }
  return { body, wantedStream };
}

async function recordPlanError(userId: string | undefined, code: string): Promise<void> {
  if (!userId) return;
  try {
    await runWithDb(createDb(), () => userChatgptPlanRepository.recordError(userId, code));
  } catch {
    // Recording is best effort; the typed error still reaches the caller.
  }
}

async function failureFromResponse(response: Response, userId: string | undefined) {
  const text = await response
    .clone()
    .text()
    .catch(() => "");
  let code: string | null = null;
  try {
    const parsed = JSON.parse(text) as { error?: { code?: unknown } };
    if (typeof parsed.error?.code === "string") code = parsed.error.code;
  } catch {
    // Non-JSON error bodies (for example `{"detail": ...}` variants) map by status only.
  }
  const mapped = mapResponsesFailure({ status: response.status, code });
  if (mapped) await recordPlanError(userId, mapped.code);
  return mapped;
}

/** The plan endpoint is stream-only; collapse the stream back into one response for non-streaming callers. */
async function collapseStream(response: Response, userId: string | undefined): Promise<Response> {
  const text = await response.text();
  const outputItems = new Map<number, Record<string, unknown>>();
  for (const block of text.split(/\r?\n\r?\n/)) {
    const dataLine = block.split(/\r?\n/).find((l) => l.startsWith("data:"));
    if (!dataLine) continue;
    let event: {
      type?: string;
      response?: Record<string, unknown>;
      error?: { code?: string };
      output_index?: number;
      item?: Record<string, unknown>;
    };
    try {
      event = JSON.parse(dataLine.slice(5).trim());
    } catch {
      continue;
    }
    if (
      event.type === "response.output_item.done" &&
      typeof event.output_index === "number" &&
      event.item
    ) {
      outputItems.set(event.output_index, event.item);
    }
    if (event.type === "response.completed" || event.type === "response.incomplete") {
      const completed = event.response;
      if (
        completed &&
        (!Array.isArray(completed.output) || completed.output.length === 0) &&
        outputItems.size > 0
      ) {
        completed.output = [...outputItems.entries()]
          .toSorted(([a], [b]) => a - b)
          .map(([, item]) => item);
      }
      return new Response(JSON.stringify(completed), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    if (event.type === "response.failed" || event.type === "error") {
      const code =
        (event.response?.error as { code?: string } | undefined)?.code ?? event.error?.code ?? null;
      const mapped = mapResponsesFailure({ status: 0, code });
      if (mapped) {
        await recordPlanError(userId, mapped.code);
        throw mapped;
      }
      return new Response(JSON.stringify({ error: { code, message: "Response failed" } }), {
        status: 502,
        headers: { "content-type": "application/json" }
      });
    }
  }
  return new Response(JSON.stringify({ error: { message: "Stream ended without completion" } }), {
    status: 502,
    headers: { "content-type": "application/json" }
  });
}

export function createChatgptPlanFetch(userId: string | undefined): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    let nextInit = init;
    let wantedStream = true;
    if (typeof init?.body === "string") {
      const conformed = conformBody(init.body);
      wantedStream = conformed.wantedStream;
      nextInit = { ...init, body: JSON.stringify(conformed.body) };
    }
    const response = await fetch(input, nextInit);
    if (!response.ok) {
      const mapped = await failureFromResponse(response, userId);
      if (mapped) throw mapped;
      return response;
    }
    return wantedStream ? response : collapseStream(response, userId);
  }) as typeof fetch;
}

export function chatgptPlanLanguageModel(args: {
  modelId: string;
  accessToken: string;
  userId?: string;
}) {
  const provider = createOpenAI({
    apiKey: args.accessToken,
    baseURL: CHATGPT_PLAN_API_BASE_URL,
    name: "chatgpt-plan",
    fetch: createChatgptPlanFetch(args.userId)
  });
  return provider.responses(chatgptPlanSlugFromModelId(args.modelId));
}
