import {
  MailReplyDraftInputSchema,
  MailReplyDraftOutputSchema,
  type MailReplyDraftInput,
  type MailReplyDraftOutput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { agentFetch } from "#@/lib/agent/agent-fetch";
import { resolveSessionTokenForUser } from "#@/lib/agent/resolve-session-token";

const WORKFLOW_ID = "mail-reply-workflow";
const TIMEOUT_MS = 45_000;

/**
 * Run mail-reply-workflow on the agent worker.
 * Returns null when agent is not configured or the call fails (caller uses heuristic).
 * Auth: Better Auth session Bearer (MastraAuthBetterAuth).
 */
export async function callMailReplyAgent(
  input: MailReplyDraftInput
): Promise<MailReplyDraftOutput | null> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) return null;

  const log = createLogger({ operation: "api__mail_reply_agent" });

  try {
    const parsedInput = MailReplyDraftInputSchema.parse(input);
    const sessionToken = await resolveSessionTokenForUser(parsedInput.userId);
    if (!sessionToken) {
      log.set({
        event: "mail_reply_agent_no_session",
        userId: parsedInput.userId
      });
      log.emit();
      return null;
    }

    const createRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/create-run`,
      {
        method: "POST",
        body: JSON.stringify({}),
        timeoutMs: TIMEOUT_MS,
        sessionToken
      }
    );
    if (!createRes) return null;
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      log.set({
        event: "mail_reply_agent_create_run_failed",
        status: createRes.status,
        body: body.slice(0, 200)
      });
      log.emit();
      return null;
    }

    const { runId } = (await createRes.json()) as { runId?: string };
    if (!runId) return null;

    const startRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/start?runId=${encodeURIComponent(runId)}`,
      {
        method: "POST",
        body: JSON.stringify({ inputData: parsedInput }),
        timeoutMs: TIMEOUT_MS,
        sessionToken
      }
    );

    if (startRes?.ok) {
      const json = (await startRes.json()) as unknown;
      const extracted = extractWorkflowResult(json);
      if (extracted) {
        log.set({
          event: "mail_reply_agent_ok",
          source: extracted.source,
          runId
        });
        log.emit();
        return extracted;
      }
    }

    const streamRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/stream?runId=${encodeURIComponent(runId)}`,
      {
        method: "POST",
        body: JSON.stringify({ inputData: parsedInput }),
        timeoutMs: TIMEOUT_MS,
        sessionToken
      }
    );

    if (!streamRes?.ok || !streamRes.body) {
      log.set({
        event: "mail_reply_agent_stream_failed",
        status: streamRes?.status
      });
      log.emit();
      return null;
    }

    const fromStream = await readResultFromStream(streamRes.body);
    if (fromStream) {
      log.set({
        event: "mail_reply_agent_ok",
        source: fromStream.source,
        via: "stream",
        runId
      });
      log.emit();
      return fromStream;
    }

    return null;
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "mail_reply_agent_error"
    });
    log.emit({ _forceKeep: true });
    return null;
  }
}

function extractWorkflowResult(payload: unknown): MailReplyDraftOutput | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const direct = MailReplyDraftOutputSchema.safeParse(obj);
  if (direct.success) return direct.data;

  for (const key of ["result", "output", "data"]) {
    const nested = MailReplyDraftOutputSchema.safeParse(obj[key]);
    if (nested.success) return nested.data;
  }

  if (obj.result && typeof obj.result === "object") {
    const r = obj.result as Record<string, unknown>;
    for (const key of ["result", "output", "data"]) {
      const nested = MailReplyDraftOutputSchema.safeParse(r[key]);
      if (nested.success) return nested.data;
    }
  }

  return null;
}

async function readResultFromStream(
  body: ReadableStream<Uint8Array>
): Promise<MailReplyDraftOutput | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: MailReplyDraftOutput | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      const jsonLine = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
      if (!jsonLine || jsonLine === "[DONE]") continue;
      try {
        const event = JSON.parse(jsonLine) as unknown;
        const hit = extractWorkflowResult(event);
        if (hit) last = hit;
        if (event && typeof event === "object") {
          const e = event as Record<string, unknown>;
          if (e.payload && typeof e.payload === "object") {
            const p = extractWorkflowResult(e.payload);
            if (p) last = p;
          }
        }
      } catch {
        // ignore mid-stream parse errors
      }
    }
  }

  return last;
}
