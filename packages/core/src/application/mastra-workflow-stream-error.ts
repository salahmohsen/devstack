const MAX = 280;

function firstLine(msg: string): string {
  return msg.split("\n")[0]?.trim().slice(0, MAX) ?? "";
}

function fromUnknown(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return firstLine(value);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) {
      return firstLine(rec.message);
    }
    if (typeof rec.error === "string" && rec.error.trim()) {
      return firstLine(rec.error);
    }
  }
  return null;
}

/**
 * Best-effort message from a Mastra workflow stream event.
 * Returns null when the event is not a failure.
 */
export function extractMastraWorkflowStreamError(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const obj = event as Record<string, unknown>;
  const type = typeof obj.type === "string" ? obj.type : "";
  const payload =
    obj.payload && typeof obj.payload === "object"
      ? (obj.payload as Record<string, unknown>)
      : null;

  const isFailType =
    type === "workflow-step-error" || type === "workflow-failed" || type === "error";
  const stepFailed = payload?.status === "failed";

  if (!isFailType && !stepFailed) {
    // Still allow nested payload recursion for wrapped frames
    if (payload && type !== "workflow-step-result") {
      return extractMastraWorkflowStreamError({ ...payload, type: type || payload.type });
    }
    return null;
  }

  const step =
    (typeof payload?.stepName === "string" && payload.stepName) ||
    (typeof payload?.id === "string" && payload.id) ||
    null;

  const msg =
    fromUnknown(payload?.error) ??
    fromUnknown(payload?.message) ??
    fromUnknown(obj.error) ??
    fromUnknown(obj.message);

  if (!msg) return step ? `${step} failed` : "workflow step failed";
  return step && !msg.includes(step) ? `${step}: ${msg}` : msg;
}
