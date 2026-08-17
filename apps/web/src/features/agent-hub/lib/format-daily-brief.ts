export type DailyBriefJob = {
  title: string;
  companyName: string;
  matchScore?: number | null;
  stage?: string;
  agentTake?: string;
};

export type DailyBriefMail = {
  subject: string;
  labels: string[];
  fromName?: string;
  summary?: string | null;
};

export type DailyBriefFacts = {
  dateLabel: string;
  inbox: DailyBriefJob[];
  mail: DailyBriefMail[];
  tracked: DailyBriefJob[];
  inboxCount: number;
  mailCount: number;
  trackedCount: number;
  markdown?: string;
  empty?: boolean;
  since?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asJob(value: unknown): DailyBriefJob | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const companyName = typeof value.companyName === "string" ? value.companyName.trim() : "";
  if (!title && !companyName) return null;
  return {
    title: title || "(untitled)",
    companyName: companyName || "(unknown)",
    matchScore: typeof value.matchScore === "number" ? value.matchScore : null,
    stage: typeof value.stage === "string" ? value.stage : undefined
  };
}

function asMail(value: unknown): DailyBriefMail | null {
  if (!isRecord(value)) return null;
  const subject = typeof value.subject === "string" ? value.subject.trim() : "";
  const labels = Array.isArray(value.labels)
    ? value.labels.filter((item): item is string => typeof item === "string")
    : [];
  if (!subject && labels.length === 0) return null;
  const fromName = typeof value.fromName === "string" ? value.fromName.trim() : "";
  const summary =
    typeof value.summary === "string" && value.summary.trim() ? value.summary.trim() : null;
  return {
    subject: subject || "(no subject)",
    labels,
    fromName: fromName || undefined,
    summary
  };
}

export function parseDailyBriefFacts(output: unknown): DailyBriefFacts | null {
  if (!isRecord(output)) return null;
  const inbox = Array.isArray(output.inbox) ? output.inbox.flatMap((row) => asJob(row) ?? []) : [];
  const mail = Array.isArray(output.mail) ? output.mail.flatMap((row) => asMail(row) ?? []) : [];
  const tracked = Array.isArray(output.tracked)
    ? output.tracked.flatMap((row) => asJob(row) ?? [])
    : [];
  const inboxCount = typeof output.inboxCount === "number" ? output.inboxCount : inbox.length;
  const mailCount = typeof output.mailCount === "number" ? output.mailCount : mail.length;
  const trackedCount =
    typeof output.trackedCount === "number" ? output.trackedCount : tracked.length;
  const dateLabel = typeof output.dateLabel === "string" ? output.dateLabel.trim() : "";
  const markdown = typeof output.markdown === "string" ? output.markdown.trim() : "";
  if (!dateLabel && !markdown && inbox.length === 0 && mail.length === 0 && tracked.length === 0) {
    return null;
  }
  return {
    dateLabel: dateLabel || "Today",
    inbox,
    mail,
    tracked,
    inboxCount,
    mailCount,
    trackedCount,
    markdown: markdown || undefined,
    empty: output.empty === true,
    since: typeof output.since === "string" ? output.since : undefined
  };
}

export function isTruncatedDailyBriefMarkdown(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (/[—–-]\s*$/.test(t)) return true;
  if (/\*\*[^*]*$/.test(t)) return true;
  return false;
}

/** Client stub used when the workflow letter is missing — not a real letter. */
export function isPlaceholderDailyBriefMarkdown(text: string): boolean {
  return /^# .+\n\nHere is what landed\.\s*$/m.test(text.trim());
}

export function formatDailyBriefMarkdown(facts: DailyBriefFacts, intro?: string): string {
  const cleanIntro = intro?.trim() ?? "";
  if (cleanIntro && !isTruncatedDailyBriefMarkdown(cleanIntro)) return cleanIntro;
  if (facts.markdown && !isTruncatedDailyBriefMarkdown(facts.markdown)) return facts.markdown;
  if (facts.empty) return `# ${facts.dateLabel}\n\nNothing new right now.`;
  return `# ${facts.dateLabel}\n\nHere is what landed.`;
}

export function resolveDailyBriefMarkdown(
  modelMarkdown: string,
  facts: DailyBriefFacts | null
): string {
  const model = modelMarkdown.trim();
  if (model && !isTruncatedDailyBriefMarkdown(model) && !isPlaceholderDailyBriefMarkdown(model)) {
    return model;
  }
  if (
    facts?.markdown &&
    !isTruncatedDailyBriefMarkdown(facts.markdown) &&
    !isPlaceholderDailyBriefMarkdown(facts.markdown)
  ) {
    return facts.markdown;
  }
  if (facts?.empty) return formatDailyBriefMarkdown(facts, model);
  return model;
}
