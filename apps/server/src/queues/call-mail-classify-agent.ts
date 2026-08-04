import { type AgentCallResult } from "@tsu-stack/api/lib/agent/agent-call-result";
import { agentFetch } from "@tsu-stack/api/lib/agent/agent-fetch";
import { readMastraResultStream } from "@tsu-stack/api/lib/agent/read-mastra-result-stream";
import { ensureSessionTokenForUser } from "@tsu-stack/api/lib/agent/resolve-session-token";
import {
  llmLogFields,
  MailClassifyInputSchema,
  MailClassifyOutputSchema,
  MailProcessInputSchema,
  MailProcessOutputSchema,
  type MailClassifyInput,
  type MailClassifyOutput,
  type MailProcessOutput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

/** Prefer unified process spine; falls back to classify-only id if needed. */
const WORKFLOW_ID = "mail-process-workflow";
const TIMEOUT_MS = 45_000;

export type MailClassifyAgentSuccess = {
  output: MailClassifyOutput;
  runId: string;
  /** Observability trace id when present on the workflow response. */
  traceId: string | null;
};

function processToClassifyOutput(p: MailProcessOutput): MailClassifyOutput {
  return MailClassifyOutputSchema.parse({
    labels: p.labels,
    systemLabels: p.systemLabels,
    source: "llm",
    confidence: p.confidence,
    notes: [p.classifyNotes, p.branch ? `branch:${p.branch}` : null].filter(Boolean).join(";")
  });
}

/**
 * Run mail-process-workflow (AI classify + smart filters + branch) on the agent worker.
 * Auth: Better Auth session Bearer for the mail owner (MastraAuthBetterAuth).
 */
export async function callMailClassifyAgent(
  input: MailClassifyInput
): Promise<AgentCallResult<MailClassifyAgentSuccess>> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return { ok: false, failure: { reason: "not_configured", message: "AGENT_WORKER_URL unset" } };
  }

  const log = createLogger({ operation: "server__mail_classify_agent" });

  try {
    const parsedInput = MailClassifyInputSchema.parse(input);
    // Process workflow accepts the same payload shape (+ optional force flags unused here).
    const processInput = MailProcessInputSchema.parse({
      ...parsedInput,
      bodyHtml: null,
      forceReprocess: false
    });
    const byo = llmLogFields(parsedInput.llm);
    const base = {
      userId: parsedInput.userId,
      messageId: parsedInput.messageId,
      ...byo
    };

    const sessionToken = await ensureSessionTokenForUser(parsedInput.userId);

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
        event: "mail_classify_agent_unreachable",
        ...base,
        fixHint: "AGENT_WORKER_URL fetch failed — check agent deploy and network"
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
        event: "mail_classify_agent_create_run_failed",
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
        event: "mail_classify_agent_missing_run_id",
        ...base
      });
      log.emit({ _forceKeep: true });
      return { ok: false, failure: { reason: "missing_run_id" } };
    }

    const startRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/start?runId=${encodeURIComponent(runId)}`,
      {
        method: "POST",
        body: JSON.stringify({ inputData: processInput }),
        timeoutMs: TIMEOUT_MS,
        sessionToken,
        retry: { attempts: 2 }
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
          via: "start",
          workflowId: WORKFLOW_ID
        });
        log.emit();
        return { ok: true, data: { output: extracted, runId, traceId }, runId, traceId };
      }
    }

    const streamRes = await agentFetch(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/stream?runId=${encodeURIComponent(runId)}`,
      {
        method: "POST",
        body: JSON.stringify({ inputData: processInput }),
        timeoutMs: TIMEOUT_MS,
        sessionToken
      }
    );

    if (!streamRes?.ok || !streamRes.body) {
      log.error(new Error("Agent stream failed"), {
        event: "mail_classify_agent_stream_failed",
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
      return {
        ok: true,
        data: {
          output: fromStream.output,
          runId,
          traceId: fromStream.traceId
        },
        runId,
        traceId: fromStream.traceId
      };
    }

    log.error(new Error("Agent empty result"), {
      event: "mail_classify_agent_empty_result",
      ...base,
      runId
    });
    log.emit({ _forceKeep: true });
    return { ok: false, failure: { reason: "empty_result", message: "no parseable output" } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(error instanceof Error ? error : new Error(msg), {
      event: "mail_classify_agent_error",
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

  const tryParse = (value: unknown): MailClassifyOutput | null => {
    const process = MailProcessOutputSchema.safeParse(value);
    if (process.success) return processToClassifyOutput(process.data);
    const classify = MailClassifyOutputSchema.safeParse(value);
    if (classify.success) return classify.data;
    return null;
  };

  const direct = tryParse(obj);
  if (direct) return direct;

  for (const key of ["result", "output", "data"]) {
    const nested = tryParse(obj[key]);
    if (nested) return nested;
  }

  if (obj.result && typeof obj.result === "object") {
    const r = obj.result as Record<string, unknown>;
    for (const key of ["result", "output", "data"]) {
      const nested = tryParse(r[key]);
      if (nested) return nested;
    }
  }

  return null;
}

async function readResultFromStream(
  body: ReadableStream<Uint8Array>
): Promise<{ output: MailClassifyOutput; traceId: string | null } | null> {
  let last: MailClassifyOutput | null = null;
  let traceId: string | null = null;

  await readMastraResultStream(body, (event) => {
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
  });

  return last ? { output: last, traceId } : null;
}
