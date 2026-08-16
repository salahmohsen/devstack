import { createHash } from "node:crypto";

import { z } from "zod";

import {
  buildSearchBriefSource,
  defaultJobPreference,
  emptySeekerMatchEvidence,
  previousMarkdownAfterInvalidate,
  renderSearchBriefMarkdown,
  searchBriefPrefsFromPreference,
  stableSearchBriefSourceJson,
  type JobPreference,
  type SearchBriefSource,
  type SearchBriefStructured
} from "@tsu-stack/core";
import { jobPreferenceRepository, userRepository } from "@tsu-stack/db";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import { createLogger } from "@tsu-stack/logger/server";

import { agentFetch } from "#@/lib/agent/agent-fetch";
import { agentGenerateBody } from "#@/lib/agent/agent-generate-body";
import { extractJsonObject, extractTextFromAgentBody } from "#@/lib/agent/parse-agent-generate";
import { ensureSessionTokenForUser } from "#@/lib/agent/resolve-session-token";
import { loadJobPreference } from "#@/lib/application/load-job-preference";
import { loadSeekerMatchEvidence } from "#@/lib/application/load-seeker-match-evidence";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

const AGENT_ID = "search-brief-writer";
const TIMEOUT_MS = 45_000;

const SearchBriefProseSchema = z.object({
  opening: z.string(),
  skills: z.string()
});

export const SearchBriefInvalidateSourceSchema = z.enum(["settings", "hub", "form", "profile"]);
export type SearchBriefInvalidateSource = z.infer<typeof SearchBriefInvalidateSourceSchema>;

export const BriefWriteInvalidateSourceSchema = z.enum(["settings", "hub"]);
export type BriefWriteInvalidateSource = z.infer<typeof BriefWriteInvalidateSourceSchema>;

export function hashSearchBriefSource(source: SearchBriefSource): string {
  return createHash("sha256").update(stableSearchBriefSourceJson(source)).digest("hex");
}

type ProseSkipReason =
  | "no_key"
  | "no_worker"
  | "credentials"
  | "unreachable"
  | "http"
  | "parse"
  | "empty";

export type EnsureSearchBriefResult = {
  markdown: string;
  hash: string;
  rebuilt: boolean;
  previousMarkdown: string | null;
  proseSkipped: boolean;
  structured: SearchBriefStructured;
};

/** Snapshot for File Diff: previous markdown only on the rebuild call. */
export function previousMarkdownForFileDiff(
  rebuilt: boolean,
  previousMarkdown: string | null
): string | null {
  return rebuilt ? previousMarkdown : null;
}

function profileFromUser(user: { name?: string | null; summary?: string | null } | null): {
  name: string;
  summary: string;
} {
  return {
    name: user?.name ?? "",
    summary: user?.summary ?? ""
  };
}

function structuredFrom(prefs: JobPreference, profile: { name: string; summary: string }) {
  return {
    prefs: searchBriefPrefsFromPreference(prefs),
    profile
  };
}

function isListsOnlyBrief(markdown: string, prefs: JobPreference): boolean {
  return markdown === renderSearchBriefMarkdown({ prefs: searchBriefPrefsFromPreference(prefs) });
}

export function shouldInvalidateSearchBriefForEntityPatch(patch: Record<string, unknown>): boolean {
  return Object.entries(patch).some(
    ([key, value]) => key !== "includedInPortfolio" && value !== undefined
  );
}

export async function invalidateSearchBrief(
  userId: string,
  source: SearchBriefInvalidateSource
): Promise<void> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  if (!row) return;

  const hadMarkdown = Boolean(row.searchBriefMarkdown);
  const previous = previousMarkdownAfterInvalidate(
    row.searchBriefMarkdown,
    row.searchBriefPreviousMarkdown
  );
  await jobPreferenceRepository.clearSearchBrief(userId, previous);

  const log = createLogger({ operation: "api__search_brief" });
  log.set({
    event: "search_brief_invalidated",
    userId,
    source,
    hadMarkdown
  });
  log.emit();
}

async function generateSearchBriefProse(input: {
  userId: string;
  lists: string;
  prefs: ReturnType<typeof searchBriefPrefsFromPreference>;
  evidence: ReturnType<typeof emptySeekerMatchEvidence>;
  profile: { name: string; summary: string };
}): Promise<
  { ok: true; opening: string; skills: string } | { ok: false; reason: ProseSkipReason }
> {
  let llm;
  try {
    llm = await resolveRuntimeAiCredentials(input.userId, "scorer");
  } catch {
    return { ok: false, reason: "credentials" };
  }
  if (!llm.apiKey) return { ok: false, reason: "no_key" };
  if (!ENV_SERVER.AGENT_WORKER_URL?.trim()) return { ok: false, reason: "no_worker" };

  const prompt = `Write the search-brief paragraphs for this seeker.

Rules:
- opening: who I am from profile name/summary, evidence, and title. 1–3 sentences.
- skills: what I want to work with from featured/stack names and project titles. 1–3 sentences.
- Do not invent sectors, companies, pay, or level.
- Do not contradict the structured lists.
- Return JSON only: {"opening": string, "skills": string}

Structured lists:
${input.lists}

Profile JSON:
${JSON.stringify(input.profile)}

Evidence JSON:
${JSON.stringify(input.evidence)}

Prefs JSON:
${JSON.stringify(input.prefs)}`;

  try {
    const sessionToken = await ensureSessionTokenForUser(input.userId);
    const response = await agentFetch(`/api/agents/${encodeURIComponent(AGENT_ID)}/generate`, {
      method: "POST",
      body: JSON.stringify(
        agentGenerateBody({
          messages: [{ role: "user", content: prompt }],
          llm,
          modelSettings: { maxOutputTokens: 400, temperature: 0.3 },
          requestContext: { userId: input.userId }
        })
      ),
      timeoutMs: TIMEOUT_MS,
      sessionToken,
      retry: true
    });
    if (!response) return { ok: false, reason: "unreachable" };
    if (!response.ok) return { ok: false, reason: "http" };

    const bodyText = await response.text().catch(() => "");
    let parsed: unknown = null;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      parsed = { text: bodyText };
    }
    const text = extractTextFromAgentBody(parsed) ?? bodyText;
    const json = extractJsonObject(text);
    const prose = SearchBriefProseSchema.safeParse(json);
    if (!prose.success) return { ok: false, reason: "parse" };
    const opening = prose.data.opening.trim();
    const skills = prose.data.skills.trim();
    if (!opening && !skills) return { ok: false, reason: "empty" };
    return { ok: true, opening, skills };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

export async function ensureSearchBrief(userId: string): Promise<EnsureSearchBriefResult> {
  const row = await jobPreferenceRepository.findByUserId(userId);
  const user = await userRepository.findById(userId);
  const profile = profileFromUser(user);

  if (!row) {
    const prefs = defaultJobPreference();
    const source = buildSearchBriefSource({
      prefs,
      evidence: emptySeekerMatchEvidence(),
      profile
    });
    return {
      markdown: renderSearchBriefMarkdown({ prefs: source.prefs }),
      hash: hashSearchBriefSource(source),
      rebuilt: false,
      previousMarkdown: null,
      proseSkipped: true,
      structured: structuredFrom(prefs, profile)
    };
  }

  const [prefs, evidence] = await Promise.all([
    loadJobPreference(userId),
    loadSeekerMatchEvidence(userId)
  ]);
  const source = buildSearchBriefSource({ prefs, evidence, profile });
  const hash = hashSearchBriefSource(source);
  const structured = structuredFrom(prefs, profile);
  const previousMarkdown = row.searchBriefPreviousMarkdown ?? null;

  if (row.searchBriefMarkdown && row.searchBriefHash === hash) {
    return {
      markdown: row.searchBriefMarkdown,
      hash,
      rebuilt: false,
      previousMarkdown: previousMarkdownForFileDiff(false, previousMarkdown),
      proseSkipped: isListsOnlyBrief(row.searchBriefMarkdown, prefs),
      structured
    };
  }

  const lists = renderSearchBriefMarkdown({ prefs: source.prefs });
  const generated = await generateSearchBriefProse({
    userId,
    lists,
    prefs: source.prefs,
    evidence,
    profile
  });
  const proseSkipped = !generated.ok;
  const markdown = generated.ok
    ? renderSearchBriefMarkdown({
        prefs: source.prefs,
        opening: generated.opening,
        skillsParagraph: generated.skills
      })
    : lists;

  await jobPreferenceRepository.saveSearchBrief(userId, {
    markdown,
    hash,
    builtAt: new Date()
  });

  const log = createLogger({ operation: "api__search_brief" });
  log.set({
    event: "search_brief_rebuilt",
    userId,
    hash,
    proseSkipped,
    ...(generated.ok ? {} : { proseSkipReason: generated.reason })
  });
  log.emit();

  return {
    markdown,
    hash,
    rebuilt: true,
    previousMarkdown: previousMarkdownForFileDiff(true, previousMarkdown),
    proseSkipped,
    structured
  };
}
