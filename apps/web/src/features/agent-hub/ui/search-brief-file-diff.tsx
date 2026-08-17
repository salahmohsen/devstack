"use client";

import * as React from "react";

import { FileDiff } from "@/shared/ui/agents/file-diff/file-diff";
import {
  lineDiff,
  previewFileLines,
  searchBriefChanged
} from "@/shared/ui/agents/file-diff/line-diff";

export function SearchBriefFileDiff({
  previousMarkdown,
  markdown,
  rebuilt
}: {
  previousMarkdown: string | null;
  markdown: string;
  rebuilt?: boolean;
}) {
  const editing = searchBriefChanged(previousMarkdown, markdown, rebuilt);
  const lines = React.useMemo(
    () => (editing ? lineDiff(previousMarkdown ?? "", markdown) : previewFileLines(markdown)),
    [editing, markdown, previousMarkdown]
  );

  return (
    <FileDiff
      file="search-brief.md"
      lines={lines}
      status="complete"
      defaultOpen
      collapseOnComplete={false}
      language="text"
      copyText={markdown}
      copyLabel="Copy brief"
      maxHeight={420}
      className="w-full max-w-[min(72ch,100%)] min-w-0"
    />
  );
}
