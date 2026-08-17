export type DailyBriefJob = {
  title: string;
  companyName: string;
  matchScore?: number | null;
  stage?: string;
};

export type DailyBriefMail = {
  subject: string;
  labels: string[];
};

export type DailyBriefFacts = {
  dateLabel: string;
  inbox: DailyBriefJob[];
  mail: DailyBriefMail[];
  tracked: DailyBriefJob[];
  inboxCount: number;
  mailCount: number;
  trackedCount: number;
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
  return { subject: subject || "(no subject)", labels };
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
  if (!dateLabel && inbox.length === 0 && mail.length === 0 && tracked.length === 0) return null;
  return {
    dateLabel: dateLabel || "Today",
    inbox,
    mail,
    tracked,
    inboxCount,
    mailCount,
    trackedCount
  };
}

export function isTruncatedDailyBriefMarkdown(text: string): boolean {
  const t = text.trim();
  if (t.length < 80) return true;
  if (/[—–-]\s*$/.test(t)) return true;
  if (/\*\*[^*]*$/.test(t)) return true;
  if (!t.includes("\n") && t.split(/\s+/).length < 16) return true;
  return false;
}

function scoreLine(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) return "";
  return ` · ${Math.round(score)}%`;
}

export function formatDailyBriefMarkdown(facts: DailyBriefFacts, intro?: string): string {
  const lines: string[] = [];
  const cleanIntro = intro?.trim() ?? "";
  if (cleanIntro && !isTruncatedDailyBriefMarkdown(cleanIntro) && cleanIntro.includes("\n")) {
    return cleanIntro;
  }
  if (cleanIntro && !isTruncatedDailyBriefMarkdown(cleanIntro)) {
    lines.push(cleanIntro, "");
  } else {
    lines.push(`# ${facts.dateLabel}`, "");
  }

  lines.push(`## New jobs (${facts.inboxCount})`);
  if (facts.inbox.length === 0) {
    lines.push("- None.");
  } else {
    for (const job of facts.inbox) {
      lines.push(`- **${job.companyName}** — ${job.title}${scoreLine(job.matchScore)}`);
    }
  }
  lines.push("");

  lines.push(`## Mail (${facts.mailCount})`);
  if (facts.mail.length === 0) {
    lines.push("- None.");
  } else {
    for (const row of facts.mail) {
      const labels = row.labels.length > 0 ? ` · ${row.labels.join(", ")}` : "";
      lines.push(`- ${row.subject}${labels}`);
    }
  }
  lines.push("");

  lines.push(`## Tracked (${facts.trackedCount})`);
  if (facts.tracked.length === 0) {
    lines.push("- None.");
  } else {
    for (const job of facts.tracked) {
      const stage = job.stage ? ` · ${job.stage}` : "";
      lines.push(`- **${job.companyName}** — ${job.title}${stage}`);
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

export function resolveDailyBriefMarkdown(
  modelMarkdown: string,
  facts: DailyBriefFacts | null
): string {
  const model = modelMarkdown.trim();
  if (model && !isTruncatedDailyBriefMarkdown(model)) return model;
  if (facts) return formatDailyBriefMarkdown(facts, model);
  return model;
}
