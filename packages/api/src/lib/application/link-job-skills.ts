import {
  buildJobSkillLinkPrompt,
  JOB_SKILL_LINK_MIN_DESCRIPTION_CHARS,
  sanitizeLinkedJobSkills,
  splitJobSkillTags,
  type JobSkillTag,
  type RuntimeLlmConfig
} from "@tsu-stack/core";
import { stackRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { agentFetch } from "#@/lib/agent/agent-fetch";
import { agentGenerateBody } from "#@/lib/agent/agent-generate-body";
import { extractJsonObject, extractTextFromAgentBody } from "#@/lib/agent/parse-agent-generate";
import { ensureSessionTokenForUser } from "#@/lib/agent/resolve-session-token";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

const AGENT_ID = "job-page-extractor";
const TIMEOUT_MS = 45_000;

export type LinkedJobSkills = {
  requiredSkills: JobSkillTag[];
  preferredSkills: JobSkillTag[];
};

const EMPTY_SKILLS: LinkedJobSkills = { requiredSkills: [], preferredSkills: [] };

function parseLinkedSkillsPayload(body: unknown): unknown {
  if (typeof body === "string") {
    return extractJsonObject(body) ?? body;
  }
  if (!body || typeof body !== "object") return body;
  const rec = body as Record<string, unknown>;
  if (rec.object != null) return rec.object;
  if (rec.result && typeof rec.result === "object") {
    const result = rec.result as Record<string, unknown>;
    if (result.object != null) return result.object;
  }
  if (typeof rec.text === "string" && rec.text.trim()) {
    return extractJsonObject(rec.text) ?? rec;
  }
  return rec;
}

export function skillsFromLinkedPayload(
  raw: unknown,
  stacks: { id: string; name: string; aliases?: readonly string[] }[]
): LinkedJobSkills {
  return splitJobSkillTags(sanitizeLinkedJobSkills(parseLinkedSkillsPayload(raw), stacks));
}

async function generateLinkedSkills(input: {
  userId: string;
  llm: RuntimeLlmConfig;
  title: string;
  companyName: string;
  listingUrl: string | null;
  description: string;
  stacks: { id: string; name: string; aliases?: readonly string[] }[];
}): Promise<unknown> {
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim() || !input.llm.apiKey?.trim()) return null;

  const sessionToken = await ensureSessionTokenForUser(input.userId);
  const response = await agentFetch(`/api/agents/${encodeURIComponent(AGENT_ID)}/generate`, {
    method: "POST",
    body: JSON.stringify(
      agentGenerateBody({
        messages: [
          {
            role: "user",
            content: buildJobSkillLinkPrompt({
              title: input.title,
              companyName: input.companyName,
              listingUrl: input.listingUrl,
              description: input.description,
              stacks: input.stacks
            })
          }
        ],
        llm: input.llm,
        requestContext: { userId: input.userId },
        // Reasoning models (omen-alpha, R1) spend budget on thinking first —
        // 900 was consumed entirely by reasoning with empty text output.
        modelSettings: { maxOutputTokens: 4_000, temperature: 0.1 },
        extras: {
          toolChoice: "none",
          structuredOutput: {
            schema: {
              type: "object",
              properties: {
                skills: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      band: { type: "string", enum: ["required", "preferred"] },
                      stackId: { type: ["string", "null"] }
                    },
                    required: ["name", "band", "stackId"],
                    additionalProperties: false
                  }
                }
              },
              required: ["skills"],
              additionalProperties: false
            }
          }
        }
      })
    ),
    timeoutMs: TIMEOUT_MS,
    sessionToken,
    retry: true
  });
  if (!response?.ok) return null;
  const bodyText = await response.text().catch(() => "");
  try {
    return bodyText ? JSON.parse(bodyText) : null;
  } catch {
    return { text: bodyText };
  }
}

/**
 * LLM extracts JD skills and maps them onto this user's stack catalog.
 * Soft-fails to empty tags (job still lands).
 */
export async function linkJobSkillsForUser(input: {
  userId: string;
  title: string;
  companyName: string;
  description: string | null | undefined;
  listingUrl?: string | null;
  llm?: RuntimeLlmConfig | null;
}): Promise<LinkedJobSkills> {
  const description = input.description?.trim() ?? "";
  if (description.length < JOB_SKILL_LINK_MIN_DESCRIPTION_CHARS) return EMPTY_SKILLS;

  const stacks = (await stackRepository.findAllByUserId(input.userId)).map((stack) => {
    return { id: stack.id, name: stack.name, aliases: stack.aliases ?? [] };
  });

  const llm = input.llm ?? (await resolveRuntimeAiCredentials(input.userId, "scorer"));
  try {
    const raw = await generateLinkedSkills({
      userId: input.userId,
      llm,
      title: input.title,
      companyName: input.companyName,
      listingUrl: input.listingUrl ?? null,
      description,
      stacks
    });
    if (raw == null) return EMPTY_SKILLS;
    const text = extractTextFromAgentBody(raw);
    return skillsFromLinkedPayload(text ? { text } : raw, stacks);
  } catch {
    return EMPTY_SKILLS;
  }
}
