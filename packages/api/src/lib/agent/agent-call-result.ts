/**
 * Structured result for server → agent workflow calls.
 * Callers can soft-fallback but must log/surface `failure` when present.
 */

export type AgentCallFailureReason =
  | "not_configured"
  | "no_session"
  | "unreachable"
  | "create_run_failed"
  | "missing_run_id"
  | "stream_failed"
  | "empty_result"
  | "error";

export type AgentCallFailure = {
  reason: AgentCallFailureReason;
  /** HTTP status when relevant */
  status?: number;
  /** Short safe message for logs / notes (no secrets) */
  message?: string;
};

export type AgentCallSuccess<T> = {
  ok: true;
  data: T;
  runId: string;
  traceId?: string | null;
};

export type AgentCallFailureResult = {
  ok: false;
  failure: AgentCallFailure;
};

export type AgentCallResult<T> = AgentCallSuccess<T> | AgentCallFailureResult;

/** Compact note fragment for classify/reply notes fields. */
export function agentFailureNote(failure: AgentCallFailure): string {
  const status = failure.status != null ? `:${failure.status}` : "";
  const detail = failure.message?.trim()
    ? `:${failure.message.trim().slice(0, 80).replace(/\s+/g, " ")}`
    : "";
  return `agent:${failure.reason}${status}${detail}`;
}

/** Human-ish toast / UI seed for presentAiError. */
export function agentFailureUserMessage(failure: AgentCallFailure): string {
  switch (failure.reason) {
    case "not_configured":
      return "AI agent is not configured on the server.";
    case "no_session":
      return "Sign in again so background AI can use your session.";
    case "unreachable":
      return "AI agent is unreachable. Try again in a moment.";
    case "create_run_failed":
      return failure.status === 503
        ? "AI agent is temporarily unavailable (503). Try again in a moment."
        : `AI agent rejected the request${failure.status != null ? ` (${failure.status})` : ""}.`;
    case "missing_run_id":
      return "AI agent did not start a workflow run.";
    case "stream_failed":
      return "AI agent stream failed before results arrived.";
    case "empty_result":
      return "AI agent returned no usable result.";
    case "error": {
      const msg = failure.message?.trim();
      return msg && msg.length > 0 ? msg : "AI agent call failed.";
    }
  }
}
