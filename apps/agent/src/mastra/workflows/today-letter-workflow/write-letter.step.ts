import { createStep } from "@mastra/core/workflows";
import { type z } from "zod";

import {
  TodayLetterGatherOutputSchema,
  TodayLetterWorkflowOutputSchema,
  type TodayLetterFacts
} from "@tsu-stack/core";

function factsOnly(input: z.infer<typeof TodayLetterGatherOutputSchema>): TodayLetterFacts {
  const { llm: _llm, hubPersonality: _voice, userId: _userId, ...facts } = input;
  void _llm;
  void _voice;
  void _userId;
  return facts;
}

const letterCache = new Map<string, { hash: string; markdown: string }>();

function emptyLetter(facts: TodayLetterFacts): string {
  return `# ${facts.dateLabel}\n\nNothing new right now.`;
}

function factsCacheHash(facts: TodayLetterFacts): string {
  return JSON.stringify({
    mail: facts.mail.map((row) => [row.id, row.summary, row.labels]),
    inbox: facts.inbox.map((row) => [row.id, row.agentTake, row.matchScore]),
    tracked: facts.tracked.map((row) => [row.applicationId, row.kind, row.body, row.createdAt]),
    mailCount: facts.mailCount,
    inboxCount: facts.inboxCount,
    trackedCount: facts.trackedCount
  });
}

function fallbackLetter(facts: TodayLetterFacts): string {
  const lines: string[] = [`# ${facts.dateLabel}`, ""];
  const crm = facts.mail.filter((row) =>
    row.labels.some((label) => /interview|offer|recruiter|application/.test(label))
  );
  for (const row of crm.slice(0, 4)) {
    lines.push(row.summary ?? `${row.fromName}: ${row.subject}`);
    lines.push("");
  }
  if (facts.inbox[0]) {
    lines.push(
      `${facts.inbox[0].companyName} — ${facts.inbox[0].title}. ${facts.inbox[0].agentTake}`
    );
    lines.push("");
    if (facts.inboxCount > 1) {
      lines.push(`${facts.inboxCount - 1} more in the pile.`);
      lines.push("");
    }
  }
  if (facts.trackedCount > 0) {
    const names = [...new Set(facts.tracked.map((row) => row.companyName).filter(Boolean))].slice(
      0,
      6
    );
    lines.push(
      `${facts.trackedCount} tracked moves${names.length > 0 ? `: ${names.join(", ")}.` : "."}`
    );
    lines.push("");
  }
  const noise = facts.mail.filter((row) =>
    row.labels.some((label) => /noise|marketing/.test(label))
  ).length;
  if (noise > 0) {
    lines.push(`${noise} marketing — consider deleting later.`);
    lines.push("");
  } else if (facts.mailCount > crm.length) {
    lines.push(`${facts.mailCount} mail in the last 24 hours.`);
    lines.push("");
  }
  const body = lines.join("\n").trim();
  return body.length > facts.dateLabel.length + 2 ? `${body}\n` : emptyLetter(facts);
}

export const writeLetterStep = createStep({
  id: "write-letter",
  description: "Empty → template. Else a short letter from facts. No LLM.",
  inputSchema: TodayLetterGatherOutputSchema,
  outputSchema: TodayLetterWorkflowOutputSchema,
  execute: async ({ inputData }) => {
    const facts = factsOnly(inputData);
    if (inputData.empty) {
      return { ...facts, markdown: emptyLetter(facts) };
    }

    const cacheKey = inputData.userId?.trim() ?? "";
    const hash = factsCacheHash(facts);
    const cached = cacheKey.length > 0 ? letterCache.get(cacheKey) : undefined;
    if (cached && cached.hash === hash && cached.markdown.trim().length > 0) {
      return { ...facts, markdown: cached.markdown };
    }

    // Do not call the writer model here. That second generate() was 30–70s
    // on the hub BYO model and is why "what's up" felt stuck. Facts → letter
    // is enough; reuse the last letter when the window has not changed.
    const markdown = fallbackLetter(facts);
    if (cacheKey.length > 0) letterCache.set(cacheKey, { hash, markdown });
    return { ...facts, markdown };
  }
});
