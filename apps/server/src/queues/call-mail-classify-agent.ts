import {
  MailClassifyInputSchema,
  MailClassifyOutputSchema,
  type MailClassifyInput,
  type MailClassifyOutput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

const WORKFLOW_ID = "mail-classify-workflow";
const TIMEOUT_MS = 45_000;

/**
 * Run mail-classify-workflow on the agent worker and return the final result.
 * Returns null when agent is not configured or the call fails (caller falls back).
 */
export async function callMailClassifyAgent(
  input: MailClassifyInput
): Promise<MailClassifyOutput | null> {
  const baseUrl = ENV_SERVER.AGENT_WORKER_URL?.trim();
  if (!baseUrl) return null;

  const log = createLogger({ operation: "server__mail_classify_agent" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const parsedInput = MailClassifyInputSchema.parse(input);

    const createRes = await fetch(
      new URL(`/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/create-run`, baseUrl),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal
      }
    );
    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      log.set({
        event: "mail_classify_agent_create_run_failed",
        status: createRes.status,
        body: body.slice(0, 200)
      });
      log.emit();
      return null;
    }

    const { runId } = (await createRes.json()) as { runId?: string };
    if (!runId) return null;

    // Prefer start (await result). Fall back to stream parse if needed.
    const startUrl = new URL(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/start?runId=${encodeURIComponent(runId)}`,
      baseUrl
    );
    const startRes = await fetch(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputData: parsedInput }),
      signal: controller.signal
    });

    if (startRes.ok) {
      const json = (await startRes.json()) as unknown;
      const extracted = extractWorkflowResult(json);
      if (extracted) {
        log.set({
          event: "mail_classify_agent_ok",
          source: extracted.source,
          systemLabels: extracted.systemLabels
        });
        log.emit();
        return extracted;
      }
    }

    // Stream fallback (some Mastra builds only expose stream for runs).
    const streamUrl = new URL(
      `/api/workflows/${encodeURIComponent(WORKFLOW_ID)}/stream?runId=${encodeURIComponent(runId)}`,
      baseUrl
    );
    const streamRes = await fetch(streamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputData: parsedInput }),
      signal: controller.signal
    });

    if (!streamRes.ok || !streamRes.body) {
      log.set({
        event: "mail_classify_agent_stream_failed",
        status: streamRes.status
      });
      log.emit();
      return null;
    }

    const fromStream = await readResultFromStream(streamRes.body);
    if (fromStream) {
      log.set({
        event: "mail_classify_agent_ok",
        source: fromStream.source,
        systemLabels: fromStream.systemLabels,
        via: "stream"
      });
      log.emit();
      return fromStream;
    }

    return null;
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)), {
      event: "mail_classify_agent_error"
    });
    log.emit({ _forceKeep: true });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractWorkflowResult(payload: unknown): MailClassifyOutput | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  // Direct result
  const direct = MailClassifyOutputSchema.safeParse(obj);
  if (direct.success) return direct.data;

  // Common wrappers: { result }, { output }, { status, result }
  for (const key of ["result", "output", "data"]) {
    const nested = MailClassifyOutputSchema.safeParse(obj[key]);
    if (nested.success) return nested.data;
  }

  // Nested run result
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
): Promise<MailClassifyOutput | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let last: MailClassifyOutput | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // NDJSON or concatenated JSON objects
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
        // Also check nested payload.result on stream events
        if (event && typeof event === "object") {
          const e = event as Record<string, unknown>;
          if (e.payload && typeof e.payload === "object") {
            const p = extractWorkflowResult(e.payload);
            if (p) last = p;
          }
        }
      } catch {
        // ignore parse errors mid-stream
      }
    }
  }

  return last;
}
