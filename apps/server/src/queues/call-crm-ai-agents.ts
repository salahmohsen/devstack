import { type AgentCallResult } from "@tsu-stack/api/lib/agent/agent-call-result";
import { agentFetch } from "@tsu-stack/api/lib/agent/agent-fetch";
import { agentGenerateBody } from "@tsu-stack/api/lib/agent/agent-generate-body";
import { ensureSessionTokenForUser } from "@tsu-stack/api/lib/agent/resolve-session-token";
import {
  CrmApplicationMatchInputSchema,
  CrmApplicationMatchOutputSchema,
  CrmStageAdviseInputSchema,
  CrmStageAdviseOutputSchema,
  type CrmApplicationMatchInput,
  type CrmApplicationMatchOutput,
  type CrmStageAdviseInput,
  type CrmStageAdviseOutput,
  type RuntimeLlmConfig
} from "@tsu-stack/core";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

const TIMEOUT_MS = 60_000;

async function generateAgentObject<T>(input: {
  agentId: string;
  userId: string;
  prompt: string;
  schema: { parse: (v: unknown) => T; safeParse: (v: unknown) => { success: boolean; data?: T } };
  llm: CrmApplicationMatchInput["llm"];
  operation: string;
}): Promise<AgentCallResult<{ output: T }>> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) {
    return { ok: false, failure: { reason: "not_configured", message: "AGENT_WORKER_URL unset" } };
  }

  const log = createLogger({ operation: input.operation });
  const sessionToken = await ensureSessionTokenForUser(input.userId);

  const llm = input.llm;
  const modelId = llm?.modelId;
  const apiKey = llm?.apiKey;
  if (!modelId || !apiKey) {
    return { ok: false, failure: { reason: "not_configured", message: "BYO llm missing" } };
  }

  const runtimeLlm: RuntimeLlmConfig = {
    modelId,
    providerKind: llm?.providerKind ?? modelId.split("/")[0] ?? "unknown",
    apiKey
  };

  try {
    const res = await agentFetch(`/api/agents/${encodeURIComponent(input.agentId)}/generate`, {
      method: "POST",
      body: JSON.stringify(
        agentGenerateBody({
          messages: [{ role: "user", content: input.prompt }],
          llm: runtimeLlm,
          requestContext: { userId: input.userId }
        })
      ),
      timeoutMs: TIMEOUT_MS,
      sessionToken,
      retry: true
    });

    if (!res) {
      return { ok: false, failure: { reason: "unreachable", message: "fetch failed" } };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        failure: {
          reason: "create_run_failed",
          status: res.status,
          message: body.slice(0, 200)
        }
      };
    }

    const json = (await res.json()) as {
      object?: unknown;
      text?: string;
      runId?: string;
    };

    // Prefer structured object; fall back to JSON in text
    let candidate: unknown = json.object;
    if (candidate == null && typeof json.text === "string") {
      const trimmed = json.text.trim();
      const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence?.[1]?.trim() ?? trimmed;
      try {
        candidate = JSON.parse(raw);
      } catch {
        candidate = null;
      }
    }

    const parsed = input.schema.safeParse(candidate);
    if (!parsed.success || parsed.data == null) {
      log.set({ event: "crm_ai_invalid_output", agentId: input.agentId, userId: input.userId });
      log.emit({ _forceKeep: true });
      return {
        ok: false,
        failure: { reason: "empty_result", message: "structured output parse failed" }
      };
    }

    return {
      ok: true,
      data: { output: parsed.data },
      runId: typeof json.runId === "string" ? json.runId : "generate"
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, failure: { reason: "error", message: msg } };
  }
}

export async function callCrmApplicationMatcher(
  input: CrmApplicationMatchInput
): Promise<AgentCallResult<{ output: CrmApplicationMatchOutput }>> {
  const parsed = CrmApplicationMatchInputSchema.parse(input);
  const openList = parsed.openApplications
    .map((a) => `- ${a.id} | ${a.companyName} | ${a.title} | ${a.stage}`)
    .join("\n");

  const prompt = `Match this career email to an open application or create/skip.

Activate crm-application-match skill.

From: ${parsed.fromName} <${parsed.fromEmail}>
Subject: ${parsed.subject}
Preview: ${parsed.preview}
System labels: ${parsed.systemLabels.join(", ") || "(none)"}

Body:
${(parsed.bodyText ?? "").slice(0, 6000)}

Open applications:
${openList || "(none)"}

Return JSON only:
{
  "kind": "match_existing" | "create_new" | "skip",
  "applicationId": "uuid or null",
  "companyName": "string or null",
  "title": "string or null",
  "reason": "short"
}`;

  return generateAgentObject({
    agentId: "crm-application-matcher",
    userId: parsed.userId,
    prompt,
    schema: CrmApplicationMatchOutputSchema,
    llm: parsed.llm,
    operation: "server__crm_application_matcher"
  });
}

export async function callCrmStageAdvisor(
  input: CrmStageAdviseInput
): Promise<AgentCallResult<{ output: CrmStageAdviseOutput }>> {
  const parsed = CrmStageAdviseInputSchema.parse(input);

  const prompt = `Propose pipeline stage/outcome for this application after career mail.

Activate crm-stage-policy skill.

System labels: ${parsed.systemLabels.join(", ") || "(none)"}
Current stage: ${parsed.currentStage ?? "null"}
Current outcome: ${parsed.currentOutcome ?? "null"}
Subject: ${parsed.subject}
Preview: ${parsed.preview}

Body:
${(parsed.bodyText ?? "").slice(0, 4000)}

Return JSON only:
{
  "targetStage": "saved"|"applied"|"screening"|"interview"|"offer" (optional),
  "targetOutcome": "rejected"|"withdrawn"|"ghosted"|"accepted"|null (optional),
  "reason": "short"
}`;

  return generateAgentObject({
    agentId: "crm-stage-advisor",
    userId: parsed.userId,
    prompt,
    schema: CrmStageAdviseOutputSchema,
    llm: parsed.llm,
    operation: "server__crm_stage_advisor"
  });
}
