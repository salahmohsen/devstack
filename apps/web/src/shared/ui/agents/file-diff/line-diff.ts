export type FileDiffLineType = "added" | "removed" | "context";

export type FileDiffLine = {
  id: string;
  type?: FileDiffLineType;
  oldLine?: number;
  newLine?: number;
  content: string;
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

/** Myers-style LCS walk: line identity only, no scoring. */
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
      row[newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? (lcs[oldIndex + 1]?.[newIndex + 1] ?? 0) + 1
          : Math.max(lcs[oldIndex + 1]?.[newIndex] ?? 0, row[newIndex + 1] ?? 0);
    }
  }

  const lines: FileDiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let id = 0;

  while (oldIndex < oldCount && newIndex < newCount) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
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

  return lines;
}
