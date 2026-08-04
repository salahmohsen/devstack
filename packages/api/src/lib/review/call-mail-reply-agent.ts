import {
  llmLogFields,
  MailReplyDraftInputSchema,
  MailReplyDraftOutputSchema,
  type MailReplyDraftInput,
  type MailReplyDraftOutput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { type AgentCallResult } from "#@/lib/agent/agent-call-result";
import { agentFetch } from "#@/lib/agent/agent-fetch";
import { readMastraResultStream } from "#@/lib/agent/read-mastra-result-stream";
import { resolveSessionTokenForUser } from "#@/lib/agent/resolve-session-token";

const WORKFLOW_ID = "mail-reply-workflow";
const TIMEOUT_MS = 45_000;

/** True when workflow returned a usable AI draft (not a fail-closed stub). */
function isSuccessfulLlmDraft(draft: MailReplyDraftOutput): boolean {
  return draft.source === "llm" && draft.notes === "llm:ok";
}

/**
 * Run mail-reply-workflow on the agent worker.
 * AI-only: fail-closed stubs from the workflow are treated as agent failures.
 * Auth: Better Auth session Bearer (MastraAuthBetterAuth).
 */
export async function callMailReplyAgent(
  input: MailReplyDraftInput
): Promise<AgentCallResult<MailReplyDraftOutput>> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return { ok: false, failure: { reason: "not_configured", message: "AGENT_WORKER_URL unset" } };
  }

  const log = createLogger({ operation: "api__mail_reply_agent" });

  try {
    const parsedInput = MailReplyDraftInputSchema.parse(input);
    const byo = llmLogFields(parsedInput.llm);
    const base = {
      userId: parsedInput.userId,
      messageId: parsedInput.messageId,
      ...byo
    };

    const sessionToken = await resolveSessionTokenForUser(parsedInput.userId);
    if (!sessionToken) {
      log.set({
        event: "mail_reply_agent_no_session",
        ...base,
        fixHint: "User needs an active Better Auth session for agent workflows"
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        failure: {
          reason: "no_session",
          message: "No active Better Auth session for mail owner"
        }
      };
    }

    const createRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/create-run`,
      {
        method: "POST",
        body: JSON.stringify({}),
        timeoutMs: TIMEOUT_MS,
        sessionToken,
        retry: true
      }
    );
    if (!createRes) {
      log.error(new Error("Agent create-run unreachable"), {
        event: "mail_reply_agent_unreachable",
        ...base
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        failure: { reason: "unreachable", message: "fetch failed after retries" }
      };
    }
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      log.error(new Error(`Agent create-run ${createRes.status}`), {
        event: "mail_reply_agent_create_run_failed",
        ...base,
        status: createRes.status,
        bodyPreview: body.slice(0, 200),
        fixHint:
          createRes.status === 401
            ? "Agent rejected session — ensure BETTER_AUTH_SECRET matches and agent uses MastraAuthBetterAuth"
            : createRes.status === 503
              ? "Agent overloaded or restarting — retries exhausted"
              : undefined
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        failure: {
          reason: "create_run_failed",
          status: createRes.status,
          message: body.slice(0, 120) || `HTTP ${createRes.status}`
        }
      };
    }

    const { runId } = (await createRes.json()) as { runId?: string };
    if (!runId) {
      log.error(new Error("Agent create-run missing runId"), {
        event: "mail_reply_agent_missing_run_id",
        ...base
      });
      log.emit({ _forceKeep: true });
      return { ok: false, failure: { reason: "missing_run_id" } };
    }

    const startRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/start?runId=${encodeURIComponent(runId)}`,
      {
        method: "POST",
        body: JSON.stringify({ inputData: parsedInput }),
        timeoutMs: TIMEOUT_MS,
        sessionToken,
        retry: { attempts: 2 }
      }
    );

    if (startRes?.ok) {
      const json = (await startRes.json()) as unknown;
      const extracted = extractWorkflowResult(json);
      if (extracted && isSuccessfulLlmDraft(extracted)) {
        log.set({
          event: "mail_reply_agent_ok",
          ...base,
          source: extracted.source,
          runId,
          via: "start"
        });
        log.emit();
        return { ok: true, data: extracted, runId };
      }
      if (extracted && !isSuccessfulLlmDraft(extracted)) {
        log.error(new Error(`Mail reply LLM failed: ${extracted.notes ?? "unknown"}`), {
          event: "mail_reply_agent_llm_failed",
          ...base,
          runId,
          notes: extracted.notes ?? null,
          via: "start"
        });
        log.emit({ _forceKeep: true });
        return {
          ok: false,
          failure: {
            reason: "error",
            message: extracted.notes ?? "llm draft failed"
          }
        };
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
      log.error(new Error("Agent stream failed"), {
        event: "mail_reply_agent_stream_failed",
        ...base,
        runId,
        status: streamRes?.status
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        failure: {
          reason: "stream_failed",
          status: streamRes?.status,
          message: streamRes ? `HTTP ${streamRes.status}` : "no response"
        }
      };
    }

    const fromStream = await readResultFromStream(streamRes.body);
    if (fromStream && isSuccessfulLlmDraft(fromStream)) {
      log.set({
        event: "mail_reply_agent_ok",
        ...base,
        source: fromStream.source,
        via: "stream",
        runId
      });
      log.emit();
      return { ok: true, data: fromStream, runId };
    }
    if (fromStream && !isSuccessfulLlmDraft(fromStream)) {
      log.error(new Error(`Mail reply LLM failed: ${fromStream.notes ?? "unknown"}`), {
        event: "mail_reply_agent_llm_failed",
        ...base,
        runId,
        notes: fromStream.notes ?? null,
        via: "stream"
      });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        failure: {
          reason: "error",
          message: fromStream.notes ?? "llm draft failed"
        }
      };
    }

    log.error(new Error("Agent empty result"), {
      event: "mail_reply_agent_empty_result",
      ...base,
      runId
    });
    log.emit({ _forceKeep: true });
    return { ok: false, failure: { reason: "empty_result", message: "no parseable output" } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(error instanceof Error ? error : new Error(msg), {
      event: "mail_reply_agent_error",
      userId: input.userId,
      messageId: input.messageId,
      ...llmLogFields(input.llm)
    });
    log.emit({ _forceKeep: true });
    return {
      ok: false,
      failure: { reason: "error", message: msg.slice(0, 160) }
    };
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
  let last: MailReplyDraftOutput | null = null;

  await readMastraResultStream(body, (event) => {
    const hit = extractWorkflowResult(event);
    if (hit) last = hit;
    if (event && typeof event === "object") {
      const e = event as Record<string, unknown>;
      if (e.payload && typeof e.payload === "object") {
        const p = extractWorkflowResult(e.payload);
        if (p) last = p;
      }
    }
  });

  return last;
}
