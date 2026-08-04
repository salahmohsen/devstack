import { type OrpcContextAgentWorker } from "@tsu-stack/core";

import { withAgentFetchRetry } from "#@/lib/agent/agent-fetch-retry";
import { registerWorkflowRun } from "#@/lib/agent/workflow-run-registry";

type LoggerLike = {
  set?(details: Record<string, unknown>): void;
  warn?(details: unknown): void;
  error?(error: unknown, details?: Record<string, unknown>): void;
};

/** Promise that rejects when `signal` aborts (for racing long work). */
export function abortPromise(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_, reject) => {
    if (!signal) return;
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
      once: true
    });
  });
}

/**
 * Cancel a Mastra workflow run.
 *
 * Mastra server route (v1.50+ / docs):
 *   POST /api/workflows/:workflowId/runs/:runId/cancel
 *
 * Docs: run.cancel() stops current work and prevents subsequent steps.
 * Steps only stop mid-flight if they check `abortSignal`.
 *
 * @see https://mastra.ai — workflow run cancel / abortSignal
 */
export async function cancelMastraWorkflowRun(
  agentWorker: OrpcContextAgentWorker,
  workflowId: string,
  runId: string,
  logger?: LoggerLike
): Promise<{ ok: boolean; status: number; body: string }> {
  const path = `/api/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/cancel`;
  try {
    const res = await agentWorker.fetch(path, { method: "POST" });
    const body = await res.text().catch(() => "");
    if (!res.ok) {
      logger?.set?.({
        event: "mastra_workflow_cancel_failed",
        workflowId,
        runId,
        status: res.status,
        bodyPreview: body.slice(0, 200)
      });
      logger?.warn?.({
        msg: `[mastra] cancel failed for ${workflowId}/${runId}`,
        status: res.status,
        body: body.slice(0, 300)
      });
      return { ok: false, status: res.status, body: body.slice(0, 500) };
    }
    logger?.set?.({
      event: "mastra_workflow_cancelled",
      workflowId,
      runId,
      status: res.status
    });
    return { ok: true, status: res.status, body: body.slice(0, 500) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.set?.({
      event: "mastra_workflow_cancel_error",
      workflowId,
      runId,
      errorMessage: message
    });
    logger?.error?.(error instanceof Error ? error : message);
    return { ok: false, status: 0, body: message };
  }
}

/** Synthetic event so the web client can call cancel explicitly with runId. */
export function workflowRunCreatedEvent(workflowId: string, runId: string) {
  return {
    type: "workflow-run-created" as const,
    payload: { workflowId, runId }
  };
}

export type StreamMastraWorkflowOptions = {
  agentWorker: OrpcContextAgentWorker;
  workflowId: string;
  inputData: unknown;
  /** Client/request abort signal — cancels Mastra run when aborted. */
  signal?: AbortSignal;
  parseStream: (body: ReadableStream<Uint8Array>) => AsyncGenerator<unknown>;
  logger?: LoggerLike;
  /**
   * Authenticated user who started the run. Registered process-locally so
   * `cancelWorkflowRun` can assert ownership before cancelling.
   */
  ownerUserId?: string;
};

/**
 * Create a Mastra workflow run, stream events, and cancel the run if the
 * consumer disconnects (signal abort, stream cancel / generator.return).
 *
 * Yields `workflow-run-created` first so clients can cancel via explicit RPC
 * even when HTTP disconnect does not propagate a request signal quickly.
 */
export async function* streamMastraWorkflow(
  options: StreamMastraWorkflowOptions
): AsyncGenerator<unknown> {
  const { agentWorker, workflowId, inputData, signal, parseStream, logger, ownerUserId } = options;

  if (signal?.aborted) {
    return;
  }

  // Retry create-run on deploy/overload (502/503/504) — same policy as agentFetch retry.
  const createRunRes = await withAgentFetchRetry(
    () =>
      agentWorker.fetch(`/api/workflows/${encodeURIComponent(workflowId)}/create-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal
      }),
    { attempts: 4, signal }
  );

  if (!createRunRes.ok) {
    const body = await createRunRes.text();
    throw new Error(`Workflow create-run returned ${createRunRes.status}: ${body.slice(0, 300)}`);
  }

  const { runId } = (await createRunRes.json()) as { runId: string };
  if (!runId) {
    throw new Error("Workflow create-run did not return a runId");
  }

  // Bind run ownership as soon as runId is known (cancel RPC can race stream).
  if (ownerUserId) {
    registerWorkflowRun(runId, ownerUserId);
  }

  // Emit runId before any long work so the client can cancel via RPC.
  yield workflowRunCreatedEvent(workflowId, runId);

  if (signal?.aborted) {
    await cancelMastraWorkflowRun(agentWorker, workflowId, runId, logger);
    return;
  }

  let cancelPromise: Promise<{ ok: boolean; status: number; body: string }> | null = null;
  const requestCancel = () => {
    cancelPromise ??= cancelMastraWorkflowRun(agentWorker, workflowId, runId, logger);
    return cancelPromise;
  };

  // Cancel as soon as the client disconnects — don't wait for the stream loop
  signal?.addEventListener(
    "abort",
    () => {
      void requestCancel();
    },
    { once: true }
  );

  // Own controller so we can abort the Mastra stream when the parent signal fires
  // or when this generator is closed via .return() (oRPC stream cancel).
  const streamController = new AbortController();
  const onParentAbort = () => {
    if (!streamController.signal.aborted) {
      streamController.abort();
    }
  };
  if (signal?.aborted) {
    streamController.abort();
  } else {
    signal?.addEventListener("abort", onParentAbort, { once: true });
  }

  let completed = false;
  let upstream: Response | undefined;

  try {
    upstream = await agentWorker.fetch(
      `/api/workflows/${encodeURIComponent(workflowId)}/stream?runId=${encodeURIComponent(runId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputData }),
        signal: streamController.signal
      }
    );

    if (!upstream.ok || !upstream.body) {
      const body = await upstream.text().catch(() => "");
      throw new Error(`Workflow stream returned ${upstream.status}: ${body.slice(0, 300)}`);
    }

    for await (const event of parseStream(upstream.body)) {
      if (signal?.aborted || streamController.signal.aborted) {
        break;
      }
      yield event;
    }

    completed = !signal?.aborted && !streamController.signal.aborted;
  } catch (error) {
    // AbortError from stream cancel is expected when the client cancels
    const isAbort =
      (error instanceof Error && error.name === "AbortError") ||
      (typeof DOMException !== "undefined" &&
        error instanceof DOMException &&
        error.name === "AbortError");
    if (!isAbort && !signal?.aborted) {
      throw error;
    }
  } finally {
    signal?.removeEventListener("abort", onParentAbort);

    // Generator .return() (stream cancel) lands here even without signal —
    // always cancel Mastra if we did not finish cleanly.
    if (!streamController.signal.aborted) {
      streamController.abort();
    }

    if (!completed) {
      await requestCancel();
      try {
        await upstream?.body?.cancel();
      } catch {
        // Stream may already be closed
      }
    }
  }
}
