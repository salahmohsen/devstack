import { type AgentCallResult } from "@tsu-stack/api/lib/agent/agent-call-result";
import { agentFetch } from "@tsu-stack/api/lib/agent/agent-fetch";
import { resolveSessionTokenForUser } from "@tsu-stack/api/lib/agent/resolve-session-token";
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
const TIMEOUT_MS = 180_000;

export type MailJobHarvestAgentSuccess = {
  output: MailJobHarvestWorkflowOutput;
  runId: string;
  traceId: string | null;
};

/**
 * Run mail-job-harvest-workflow on the agent worker (AI mail extract + page fetch tools).
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

    const sessionToken = await resolveSessionTokenForUser(parsedInput.userId);
    if (!sessionToken) {
      log.set({
        event: "mail_job_harvest_agent_no_session",
        ...base
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
      if (extracted) {
        log.set({
          event: "mail_job_harvest_agent_ok",
          ...base,
          runId,
          jobCount: extracted.jobs.length,
          isJobNotifier: extracted.isJobNotifier,
          via: "start"
        });
        log.emit();
        return {
          ok: true,
          data: { output: extracted, runId, traceId: null },
          runId,
          traceId: null
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

  return null;
}

async function readResultFromStream(
  body: ReadableStream<Uint8Array>
): Promise<MailJobHarvestWorkflowOutput | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: MailJobHarvestWorkflowOutput | null = null;

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
