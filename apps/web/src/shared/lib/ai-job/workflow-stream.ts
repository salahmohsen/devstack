import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";

/** Unwrap oRPC / event wrappers that nest payload under `.json`. */
export function unwrapWorkflowEvent(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  if (record.json && typeof record.json === "object") {
    return record.json as Record<string, unknown>;
  }
  return record;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function getWorkflowErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) return record.message;
    const data = record.data;
    if (
      data &&
      typeof data === "object" &&
      typeof (data as { message?: string }).message === "string"
    ) {
      return (data as { message: string }).message;
    }
    const cause = record.cause;
    if (cause instanceof Error && cause.message) return cause.message;
  }
  return fallback;
}

/** Best-effort Mastra cancel RPC (stream abort alone may not stop LLM steps). */
export function cancelMastraWorkflowRun(workflowId: string, runId: string | null) {
  if (!runId) return;
  void orpcClient.agent.cancelWorkflowRun({ workflowId, runId }).catch(() => {
    // Run may already be finished
  });
}

export function extractRunId(
  event: Record<string, unknown>,
  payload: Record<string, unknown> | undefined
): string | null {
  return (payload?.runId as string | undefined) ?? (event.runId as string | undefined) ?? null;
}

export function workflowStepErrorMessage(
  payload: Record<string, unknown> | undefined,
  fallback: string
): string {
  return (
    (payload?.error as { message?: string } | undefined)?.message ??
    (typeof payload?.error === "string" ? payload.error : null) ??
    fallback
  );
}

export function workflowFailedMessage(
  event: Record<string, unknown>,
  payload: Record<string, unknown> | undefined,
  fallback: string
): string {
  return (
    (payload?.error as { message?: string } | undefined)?.message ??
    (typeof event.error === "string" ? event.error : null) ??
    fallback
  );
}
