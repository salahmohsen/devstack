import { stripHtmlToPlainText } from "@tsu-stack/core";

import { lineDiff, type FileDiffLine } from "@/shared/ui/agents/file-diff";

function bulletsFromHtml(html: string): string[] {
  const items: string[] = [];
  const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match = liRegex.exec(html);
  while (match != null) {
    const text = stripHtmlToPlainText(match[1] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (text) items.push(text);
    match = liRegex.exec(html);
  }
  if (items.length > 0) return items;
  return stripHtmlToPlainText(html)
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function toMarkdown(heading: string, sub: string, bullets: string[]): string {
  const lines = [`# ${heading}`];
  if (sub.trim()) {
    lines.push("");
    lines.push(sub.trim());
  }
  if (bullets.length > 0) {
    lines.push("");
    for (const bullet of bullets) lines.push(`- ${bullet}`);
  }
  return lines.join("\n");
}

export function experienceMasterMarkdown(input: {
  title: string;
  organization: string;
  description: string;
}): string {
  return toMarkdown(input.title, input.organization, bulletsFromHtml(input.description));
}

export function experienceSnapshotMarkdown(input: {
  title: string;
  companyName: string;
  rewrittenBullets: readonly string[];
}): string {
  return toMarkdown(input.title, input.companyName, [...input.rewrittenBullets]);
}

export function projectMasterMarkdown(input: {
  title: string;
  summary: string;
  description: string;
}): string {
  const fromDescription = bulletsFromHtml(input.description);
  const bullets =
    fromDescription.length > 0
      ? fromDescription
      : input.summary.trim()
        ? [input.summary.trim()]
        : [];
  return toMarkdown(input.title, "", bullets);
}

export function projectSnapshotMarkdown(input: {
  name: string;
  rewrittenSummary: string;
  rewrittenBullets?: readonly string[];
}): string {
  const bullets =
    input.rewrittenBullets && input.rewrittenBullets.length > 0
      ? [...input.rewrittenBullets]
      : input.rewrittenSummary.trim()
        ? [input.rewrittenSummary.trim()]
        : [];
  return toMarkdown(input.name, "", bullets);
}

export function snapshotFileDiffLines(master: string, snapshot: string): FileDiffLine[] | null {
  if (master.trim() === snapshot.trim()) return null;
  return lineDiff(master, snapshot);
}
