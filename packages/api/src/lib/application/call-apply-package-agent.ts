import {
  ApplyPackageDraftSchema,
  ApplyPackageWorkflowInputSchema,
  extractMastraWorkflowStreamError,
  llmLogFields,
  type ApplyPackageDraft,
  type ApplyPackageWorkflowInput
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { type AgentCallResult } from "#@/lib/agent/agent-call-result";
import { agentFetch } from "#@/lib/agent/agent-fetch";
import { readMastraResultStream } from "#@/lib/agent/read-mastra-result-stream";
import { ensureSessionTokenForUser } from "#@/lib/agent/resolve-session-token";

const WORKFLOW_ID = "apply-package-workflow";
/** Large portfolio rewrite budget — must match agent generate timeout headroom. */
const TIMEOUT_MS = 240_000;

/**
 * Run apply-package-workflow on the agent worker.
 * Auth: Better Auth session Bearer (MastraAuthBetterAuth).
 * Uses create-run + stream (Mastra start is fire-and-forget).
 */
export async function callApplyPackageAgent(
  input: ApplyPackageWorkflowInput,
  opts: { userId: string }
): Promise<AgentCallResult<ApplyPackageDraft>> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return { ok: false, failure: { reason: "not_configured", message: "AGENT_WORKER_URL unset" } };
  }

  const log = createLogger({ operation: "api__apply_package_agent" });

  try {
    const parsedInput = ApplyPackageWorkflowInputSchema.parse(input);
    const byo = llmLogFields(parsedInput.llm);
    const base = {
      userId: opts.userId,
      applicationId: parsedInput.applicationId,
      ...byo
    };

    const sessionToken = await ensureSessionTokenForUser(opts.userId);

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
        event: "apply_package_agent_unreachable",
        ...base
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
        event: "apply_package_agent_create_run_failed",
        ...base,
        status: createRes.status,
        bodyPreview: body.slice(0, 200)
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
        event: "apply_package_agent_missing_run_id",
        ...base
      });
      log.emit({ _forceKeep: true });
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
      log.error(new Error("Agent stream failed"), {
        event: "apply_package_agent_stream_failed",
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
    if (fromStream.draft) {
      log.set({
        event: "apply_package_agent_ok",
        ...base,
        runId,
        experienceCount: fromStream.draft.experiences.length,
        projectCount: fromStream.draft.projects.length,
        via: "stream"
      });
      log.emit();
      return { ok: true, data: fromStream.draft, runId, traceId: null };
    }

    log.error(new Error("Agent empty result"), {
      event: "apply_package_agent_empty_result",
      ...base,
      runId,
      streamError: fromStream.errorMessage?.slice(0, 200)
    });
    log.emit({ _forceKeep: true });
    return {
      ok: false,
      failure: {
        reason: "empty_result",
        message:
          fromStream.errorMessage?.trim() ??
          "Apply package agent returned no usable draft (empty or truncated output)."
      }
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(error instanceof Error ? error : new Error(msg), {
      event: "apply_package_agent_error",
      userId: opts.userId,
      applicationId: input.applicationId,
      ...llmLogFields(input.llm)
    });
    log.emit({ _forceKeep: true });
    return {
      ok: false,
      failure: { reason: "error", message: msg.slice(0, 160) }
    };
  }
}

function extractWorkflowResult(payload: unknown): ApplyPackageDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;

  const direct = ApplyPackageDraftSchema.safeParse(obj);
  if (direct.success) return direct.data;

  for (const key of ["result", "output", "data"]) {
    const nested = ApplyPackageDraftSchema.safeParse(obj[key]);
    if (nested.success) return nested.data;
  }

  if (obj.result && typeof obj.result === "object") {
    const r = obj.result as Record<string, unknown>;
    for (const key of ["result", "output", "data"]) {
      const nested = ApplyPackageDraftSchema.safeParse(r[key]);
      if (nested.success) return nested.data;
    }
  }

  // Mastra stream: { type: "workflow-step-result", payload: { output: {...}, status } }
  if (obj.payload && typeof obj.payload === "object") {
    return extractWorkflowResult(obj.payload);
  }

  return null;
}

async function readResultFromStream(body: ReadableStream<Uint8Array>): Promise<{
  draft: ApplyPackageDraft | null;
  errorMessage: string | null;
}> {
  let draft: ApplyPackageDraft | null = null;
  let errorMessage: string | null = null;

  await readMastraResultStream(body, (event) => {
    const hit = extractWorkflowResult(event);
    if (hit) draft = hit;
    const err = extractMastraWorkflowStreamError(event);
    if (err) errorMessage = err;
  });

  return { draft, errorMessage };
}
