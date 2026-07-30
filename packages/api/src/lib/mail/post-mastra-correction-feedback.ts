import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { agentFetch } from "#@/lib/agent/agent-fetch";

export type MastraCorrectionFeedbackInput = {
  correctionId: string;
  userId: string;
  messageId: string | null;
  predictedSystemLabels: string[];
  correctedSystemLabels: string[];
  mastraTraceId?: string | null;
  mastraRunId?: string | null;
  note?: string | null;
};

/**
 * Best-effort dual-write of a user label correction into Mastra observability feedback.
 * Never throws — product correction path must not depend on the agent worker.
 *
 * POST {AGENT_WORKER_URL}/api/observability/feedback
 * @see https://mastra.ai/docs/observability/feedback
 */
export async function postMastraCorrectionFeedback(
  input: MastraCorrectionFeedbackInput
): Promise<{ ok: boolean; skipped?: string }> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return { ok: false, skipped: "AGENT_WORKER_URL_unset" };
  }

  const predicted = input.predictedSystemLabels[0] ?? "(none)";
  const corrected = input.correctedSystemLabels[0] ?? "(none)";
  const value = `${predicted}->${corrected}`;

  const feedback: Record<string, unknown> = {
    feedbackSource: "user",
    feedbackType: "correction",
    value,
    comment:
      input.note?.trim() ??
      `Classify correction: predicted ${predicted}, corrected to ${corrected}`,
    feedbackUserId: input.userId,
    sourceId: input.correctionId,
    metadata: {
      messageId: input.messageId,
      predictedSystemLabels: input.predictedSystemLabels,
      correctedSystemLabels: input.correctedSystemLabels,
      mastraRunId: input.mastraRunId ?? null,
      domain: "career-inbox-classify"
    }
  };

  if (input.mastraTraceId) {
    feedback.traceId = input.mastraTraceId;
  }

  try {
    const res = await agentFetch("/api/observability/feedback", {
      method: "POST",
      body: JSON.stringify({ feedback }),
      timeoutMs: 8_000
    });
    if (!res) return { ok: false, skipped: "AGENT_WORKER_URL_unset" };
    if (!res.ok) {
      return { ok: false, skipped: `http_${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, skipped: "network_or_timeout" };
  }
}
