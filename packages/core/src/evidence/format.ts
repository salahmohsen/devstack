import { type EvidenceKind } from "./goals";

/** Generated File Diff view of evidence columns. Not stored. */
export function formatEvidenceMarkdown(
  kind: EvidenceKind,
  record: Record<string, unknown>
): string {
  switch (kind) {
    case "project":
      return formatProjectMarkdown(record);
    case "experience":
      return formatExperienceMarkdown(record);
    case "stack":
      return formatStackMarkdown(record);
  }
}

function formatProjectMarkdown(record: Record<string, unknown>): string {
  const lines = [
    `# Project: ${asText(record.title)}`,
    `Year: ${asYear(record.year)}`,
    `Portfolio: ${asYesNo(record.includedInPortfolio)}`,
    "",
    "## Summary",
    asText(record.summary),
    "",
    "## Description",
    asText(record.description)
  ];

  const repos = asStringList(record.repos);
  if (repos.length > 0) {
    lines.push("", "## Repos", ...repos.map((repo) => `- ${repo}`));
  }

  const demoUrl = asText(record.demoUrl);
  if (demoUrl) {
    lines.push("", `Demo: ${demoUrl}`);
  }

  return lines.join("\n");
}

function formatExperienceMarkdown(record: Record<string, unknown>): string {
  const lines = [`# Experience: ${asText(record.title)} @ ${asText(record.organization)}`];

  const fromDate = asText(record.fromDate);
  if (fromDate) lines.push(`From: ${fromDate}`);

  if (record.isPresent === true) {
    lines.push("To: present");
  } else {
    const toDate = asText(record.toDate);
    if (toDate) lines.push(`To: ${toDate}`);
  }

  lines.push(
    `Portfolio: ${asYesNo(record.includedInPortfolio)}`,
    "",
    "## Description",
    asText(record.description)
  );
  return lines.join("\n");
}

function formatStackMarkdown(record: Record<string, unknown>): string {
  const lines = [`# Stack: ${asText(record.name)}`];
  const type = asText(record.type);
  if (type) lines.push(`Type: ${type}`);
  lines.push(
    `Featured: ${asYesNo(record.isFeatured)}`,
    `Portfolio: ${asYesNo(record.includedInPortfolio)}`,
    "",
    "## Description",
    asText(record.description)
  );
  return lines.join("\n");
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asYear(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : trimmed;
  }
  return "";
}

function asYesNo(value: unknown): "yes" | "no" {
  return value === true ? "yes" : "no";
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = asText(item);
    return text ? [text] : [];
  });
}
