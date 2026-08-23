export type FileDiffLineType = "added" | "removed" | "context";

export type FileDiffSegment = {
  type: "equal" | "added" | "removed";
  text: string;
};

export type FileDiffLine = {
  id: string;
  type?: FileDiffLineType;
  oldLine?: number;
  newLine?: number;
  content: string;
  /** Optional inline highlight — only changed spans are colored. */
  segments?: FileDiffSegment[];
};

export function searchBriefChanged(
  previousMarkdown: string | null | undefined,
  markdown: string | null | undefined,
  rebuilt?: boolean
): boolean {
  if (rebuilt === false) return false;
  if (previousMarkdown == null) return false;
  return previousMarkdown !== (markdown ?? null);
}

/** Show the brief card whenever markdown exists — cache hit and first build included. */
export function shouldRenderSearchBriefFileDiff(markdown: string | null | undefined): boolean {
  return typeof markdown === "string" && markdown.trim().length > 0;
}

/** Plain file view: every line is context (no + / −). */
export function previewFileLines(markdown: string): FileDiffLine[] {
  const rows = markdown.length === 0 ? [""] : markdown.replaceAll("\r\n", "\n").split("\n");
  return rows.map((content, index) => {
    return {
      id: String(index + 1),
      type: "context" as const,
      newLine: index + 1,
      content
    };
  });
}

function toLines(value: string): string[] {
  if (value.length === 0) return [];
  return value.replaceAll("\r\n", "\n").split("\n");
}

/** Match on trimmed text; keep original content for display. */
function linesEqual(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function tokenizeWords(value: string): string[] {
  return value.match(/\s+|[^\s]+/g) ?? [];
}

/** Word-level LCS segments so only edited spans are marked added/removed. */
export function wordDiffSegments(
  previous: string,
  next: string
): {
  removed: FileDiffSegment[];
  added: FileDiffSegment[];
} {
  const oldTokens = tokenizeWords(previous);
  const newTokens = tokenizeWords(next);
  const oldCount = oldTokens.length;
  const newCount = newTokens.length;
  const lcs: number[][] = Array.from({ length: oldCount + 1 }, () =>
    Array<number>(newCount + 1).fill(0)
  );

  for (let oldIndex = oldCount - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newCount - 1; newIndex >= 0; newIndex -= 1) {
      const row = lcs[oldIndex];
      if (!row) continue;
      row[newIndex] =
        oldTokens[oldIndex] === newTokens[newIndex]
          ? (lcs[oldIndex + 1]?.[newIndex + 1] ?? 0) + 1
          : Math.max(lcs[oldIndex + 1]?.[newIndex] ?? 0, row[newIndex + 1] ?? 0);
    }
  }

  const removed: FileDiffSegment[] = [];
  const added: FileDiffSegment[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  const push = (side: "removed" | "added", type: FileDiffSegment["type"], text: string) => {
    if (!text) return;
    const list = side === "removed" ? removed : added;
    const last = list[list.length - 1];
    if (last && last.type === type) {
      last.text += text;
      return;
    }
    list.push({ type, text });
  };

  while (oldIndex < oldCount && newIndex < newCount) {
    if (oldTokens[oldIndex] === newTokens[newIndex]) {
      const token = oldTokens[oldIndex] ?? "";
      push("removed", "equal", token);
      push("added", "equal", token);
      oldIndex += 1;
      newIndex += 1;
      continue;
    }
    const dropOld = (lcs[oldIndex + 1]?.[newIndex] ?? 0) >= (lcs[oldIndex]?.[newIndex + 1] ?? 0);
    if (dropOld) {
      push("removed", "removed", oldTokens[oldIndex] ?? "");
      oldIndex += 1;
    } else {
      push("added", "added", newTokens[newIndex] ?? "");
      newIndex += 1;
    }
  }
  while (oldIndex < oldCount) {
    push("removed", "removed", oldTokens[oldIndex] ?? "");
    oldIndex += 1;
  }
  while (newIndex < newCount) {
    push("added", "added", newTokens[newIndex] ?? "");
    newIndex += 1;
  }

  return { removed, added };
}

function attachInlineSegments(lines: FileDiffLine[]): FileDiffLine[] {
  const out: FileDiffLine[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line) break;
    if (line.type !== "removed") {
      out.push(line);
      index += 1;
      continue;
    }

    let removeEnd = index;
    while (removeEnd < lines.length && lines[removeEnd]?.type === "removed") removeEnd += 1;
    let addEnd = removeEnd;
    while (addEnd < lines.length && lines[addEnd]?.type === "added") addEnd += 1;

    const removedCount = removeEnd - index;
    const addedCount = addEnd - removeEnd;
    if (removedCount > 0 && removedCount === addedCount) {
      for (let offset = 0; offset < removedCount; offset += 1) {
        const removedLine = lines[index + offset];
        const addedLine = lines[removeEnd + offset];
        if (!removedLine || !addedLine) continue;
        const { removed, added } = wordDiffSegments(removedLine.content, addedLine.content);
        out.push({ ...removedLine, segments: removed });
        out.push({ ...addedLine, segments: added });
      }
      index = addEnd;
      continue;
    }

    out.push(line);
    index += 1;
  }
  return out;
}

/** Myers-style LCS walk: trimmed line identity, plus inline word segments on 1:1 replacements. */
export function lineDiff(previous: string, next: string): FileDiffLine[] {
  const oldLines = toLines(previous);
  const newLines = toLines(next);
  const oldCount = oldLines.length;
  const newCount = newLines.length;
  const lcs: number[][] = Array.from({ length: oldCount + 1 }, () =>
    Array<number>(newCount + 1).fill(0)
  );

  for (let oldIndex = oldCount - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newCount - 1; newIndex >= 0; newIndex -= 1) {
      const row = lcs[oldIndex];
      if (!row) continue;
      row[newIndex] = linesEqual(oldLines[oldIndex] ?? "", newLines[newIndex] ?? "")
        ? (lcs[oldIndex + 1]?.[newIndex + 1] ?? 0) + 1
        : Math.max(lcs[oldIndex + 1]?.[newIndex] ?? 0, row[newIndex + 1] ?? 0);
    }
  }

  const lines: FileDiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let id = 0;

  while (oldIndex < oldCount && newIndex < newCount) {
    if (linesEqual(oldLines[oldIndex] ?? "", newLines[newIndex] ?? "")) {
      id += 1;
      lines.push({
        id: String(id),
        type: "context",
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
        content: oldLines[oldIndex] ?? ""
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    const dropOld = (lcs[oldIndex + 1]?.[newIndex] ?? 0) >= (lcs[oldIndex]?.[newIndex + 1] ?? 0);
    if (dropOld) {
      id += 1;
      lines.push({
        id: String(id),
        type: "removed",
        oldLine: oldIndex + 1,
        content: oldLines[oldIndex] ?? ""
      });
      oldIndex += 1;
    } else {
      id += 1;
      lines.push({
        id: String(id),
        type: "added",
        newLine: newIndex + 1,
        content: newLines[newIndex] ?? ""
      });
      newIndex += 1;
    }
  }

  while (oldIndex < oldCount) {
    id += 1;
    lines.push({
      id: String(id),
      type: "removed",
      oldLine: oldIndex + 1,
      content: oldLines[oldIndex] ?? ""
    });
    oldIndex += 1;
  }

  while (newIndex < newCount) {
    id += 1;
    lines.push({
      id: String(id),
      type: "added",
      newLine: newIndex + 1,
      content: newLines[newIndex] ?? ""
    });
    newIndex += 1;
  }

  return attachInlineSegments(lines);
}
