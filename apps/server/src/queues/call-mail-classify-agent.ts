import { agentFetch } from "@tsu-stack/api/lib/agent/agent-fetch";
import { resolveSessionTokenForUser } from "@tsu-stack/api/lib/agent/resolve-session-token";
import {
  llmLogFields,
  MailClassifyInputSchema,
  MailClassifyOutputSchema,
  type MailClassifyInput,
  type MailClassifyOutput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

const WORKFLOW_ID = "mail-classify-workflow";
const TIMEOUT_MS = 45_000;

export type MailClassifyAgentCallResult = {
  output: MailClassifyOutput;
  runId: string;
  /** Observability trace id when present on the workflow response. */
  traceId: string | null;
};

/**
 * Run mail-classify-workflow on the agent worker and return the final result.
 * Returns null when agent is not configured or the call fails (caller falls back).
 *
 * Auth: Better Auth session Bearer for the mail owner (MastraAuthBetterAuth).
 */
export async function callMailClassifyAgent(
  input: MailClassifyInput
): Promise<MailClassifyAgentCallResult | null> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) return null;

  const log = createLogger({ operation: "server__mail_classify_agent" });

  try {
    const parsedInput = MailClassifyInputSchema.parse(input);
    const byo = llmLogFields(parsedInput.llm);
    const base = {
      userId: parsedInput.userId,
      messageId: parsedInput.messageId,
      ...byo
    };

    const sessionToken = await resolveSessionTokenForUser(parsedInput.userId);
    if (!sessionToken) {
      log.set({
        event: "mail_classify_agent_no_session",
        ...base,
        fixHint: "User needs an active Better Auth session for agent workflows"
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
    if (!createRes) {
      log.set({
        event: "mail_classify_agent_unreachable",
        ...base,
        fixHint: "AGENT_WORKER_URL fetch failed — check agent deploy and network"
      });
      log.emit();
      return null;
    }
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      log.set({
        event: "mail_classify_agent_create_run_failed",
        ...base,
        status: createRes.status,
        bodyPreview: body.slice(0, 200),
        fixHint:
          createRes.status === 401
            ? "Agent rejected session — ensure BETTER_AUTH_SECRET matches and agent uses MastraAuthBetterAuth"
            : undefined
      });
      log.emit();
      return null;
    }

    const { runId } = (await createRes.json()) as { runId?: string };
    if (!runId) {
      log.set({
        event: "mail_classify_agent_missing_run_id",
        ...base
      });
      log.emit();
      return null;
    }

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
        const traceId = extractTraceId(json);
        log.set({
          event: "mail_classify_agent_ok",
          ...base,
          source: extracted.source,
          systemLabels: extracted.systemLabels,
          runId,
          traceId: traceId ?? undefined,
          via: "start"
        });
        log.emit();
        return { output: extracted, runId, traceId };
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
        event: "mail_classify_agent_stream_failed",
        ...base,
        runId,
        status: streamRes?.status
      });
      log.emit();
      return null;
    }

    const fromStream = await readResultFromStream(streamRes.body);
    if (fromStream) {
      log.set({
        event: "mail_classify_agent_ok",
        ...base,
        source: fromStream.output.source,
        systemLabels: fromStream.output.systemLabels,
        via: "stream",
        runId,
        traceId: fromStream.traceId ?? undefined
      });
      log.emit();
      return { output: fromStream.output, runId, traceId: fromStream.traceId };
    }

    log.set({
      event: "mail_classify_agent_empty_result",
      ...base,
      runId
    });
    log.emit();
    return null;
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "mail_classify_agent_error",
      userId: input.userId,
      messageId: input.messageId,
      ...llmLogFields(input.llm)
    });
    log.emit({ _forceKeep: true });
    return null;
  }
}

function extractTraceId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.traceId === "string" && obj.traceId.length > 0) return obj.traceId;
  for (const key of ["result", "output", "data"]) {
    const nested = obj[key];
    if (nested && typeof nested === "object") {
      const n = nested as Record<string, unknown>;
      if (typeof n.traceId === "string" && n.traceId.length > 0) return n.traceId;
    }
  }
  return null;
}

function extractWorkflowResult(payload: unknown): MailClassifyOutput | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const direct = MailClassifyOutputSchema.safeParse(obj);
  if (direct.success) return direct.data;

  for (const key of ["result", "output", "data"]) {
    const nested = MailClassifyOutputSchema.safeParse(obj[key]);
    if (nested.success) return nested.data;
  }

  if (obj.result && typeof obj.result === "object") {
    const r = obj.result as Record<string, unknown>;
    for (const key of ["result", "output", "data"]) {
      const nested = MailClassifyOutputSchema.safeParse(r[key]);
      if (nested.success) return nested.data;
    }
  }

  return null;
}

async function readResultFromStream(
  body: ReadableStream<Uint8Array>
): Promise<{ output: MailClassifyOutput; traceId: string | null } | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: MailClassifyOutput | null = null;
  let traceId: string | null = null;

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
        const t = extractTraceId(event);
        if (t) traceId = t;
        if (event && typeof event === "object") {
          const e = event as Record<string, unknown>;
          if (e.payload && typeof e.payload === "object") {
            const p = extractWorkflowResult(e.payload);
            if (p) last = p;
            const pt = extractTraceId(e.payload);
            if (pt) traceId = pt;
          }
        }
      } catch {
        // ignore parse errors mid-stream
      }
    }
  }

  return last ? { output: last, traceId } : null;
}
