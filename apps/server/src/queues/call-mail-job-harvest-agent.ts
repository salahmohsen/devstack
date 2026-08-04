import { type AgentCallResult } from "@tsu-stack/api/lib/agent/agent-call-result";
import { agentFetch } from "@tsu-stack/api/lib/agent/agent-fetch";
import { readMastraResultStream } from "@tsu-stack/api/lib/agent/read-mastra-result-stream";
import { ensureSessionTokenForUser } from "@tsu-stack/api/lib/agent/resolve-session-token";
import {
  llmLogFields,
  MailJobHarvestWorkflowInputSchema,
  MailJobHarvestWorkflowOutputSchema,
  type MailJobHarvestWorkflowInput,
  type MailJobHarvestWorkflowOutput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

const WORKFLOW_ID = "mail-job-harvest-workflow";
/** AI mail extract + per-job page fetch can be slow for multi-job digests. */
const TIMEOUT_MS = 300_000;

export type MailJobHarvestAgentSuccess = {
  output: MailJobHarvestWorkflowOutput;
  runId: string;
  traceId: string | null;
};

/**
 * Run mail-job-harvest-workflow on the agent worker (AI mail extract + page fetch tools).
 * Uses create-run + stream (Mastra start is fire-and-forget and does not return step output).
 */
export async function callMailJobHarvestAgent(
  input: MailJobHarvestWorkflowInput
): Promise<AgentCallResult<MailJobHarvestAgentSuccess>> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return { ok: false, failure: { reason: "not_configured", message: "AGENT_WORKER_URL unset" } };
  }

  const log = createLogger({ operation: "server__mail_job_harvest_agent" });

  try {
    const parsedInput = MailJobHarvestWorkflowInputSchema.parse(input);
    const byo = llmLogFields(parsedInput.llm as Parameters<typeof llmLogFields>[0]);
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
      return {
        ok: false,
        failure: { reason: "unreachable", message: "fetch failed after retries" }
      };
    }
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      return {
        ok: false,
        failure: {
          reason: "create_run_failed",
          status: createRes.status,
          message: body.slice(0, 120)
        }
      };
    }

    const { runId } = (await createRes.json()) as { runId?: string };
    if (!runId) {
      return { ok: false, failure: { reason: "missing_run_id" } };
    }

    // Stream starts the run and emits step results. Do not call /start first —
    // modern Mastra returns only {"message":"Workflow run started"} from start.
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
        event: "mail_job_harvest_agent_ok",
        ...base,
        runId,
        jobCount: fromStream.jobs.length,
        isJobNotifier: fromStream.isJobNotifier,
        notes: fromStream.notes ?? null,
        via: "stream"
      });
      log.emit();
      return {
        ok: true,
        data: { output: fromStream, runId, traceId: null },
        runId,
        traceId: null
      };
    }

    return { ok: false, failure: { reason: "empty_result", message: "no parseable output" } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(error instanceof Error ? error : new Error(msg), {
      event: "mail_job_harvest_agent_error",
      userId: input.userId,
      messageId: input.messageId,
      ...llmLogFields(input.llm as Parameters<typeof llmLogFields>[0])
    });
    log.emit({ _forceKeep: true });
    return {
      ok: false,
      failure: { reason: "error", message: msg.slice(0, 160) }
    };
  }
}

function extractWorkflowResult(payload: unknown): MailJobHarvestWorkflowOutput | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const direct = MailJobHarvestWorkflowOutputSchema.safeParse(obj);
  if (direct.success) return direct.data;

  for (const key of ["result", "output", "data"]) {
    const nested = MailJobHarvestWorkflowOutputSchema.safeParse(obj[key]);
    if (nested.success) return nested.data;
  }

  if (obj.result && typeof obj.result === "object") {
    const r = obj.result as Record<string, unknown>;
    for (const key of ["result", "output", "data"]) {
      const nested = MailJobHarvestWorkflowOutputSchema.safeParse(r[key]);
      if (nested.success) return nested.data;
    }
  }

  // Mastra stream: { type: "workflow-step-result", payload: { output: {...}, status } }
  if (obj.payload && typeof obj.payload === "object") {
    const p = obj.payload as Record<string, unknown>;
    const fromPayload = extractWorkflowResult(p);
    if (fromPayload) return fromPayload;
  }

  return null;
}

async function readResultFromStream(
  body: ReadableStream<Uint8Array>
): Promise<MailJobHarvestWorkflowOutput | null> {
  let last: MailJobHarvestWorkflowOutput | null = null;

  await readMastraResultStream(body, (event) => {
    const hit = extractWorkflowResult(event);
    if (hit) last = hit;
  });

  return last;
}
