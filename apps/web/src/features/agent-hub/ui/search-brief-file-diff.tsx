"use client";

import * as React from "react";

import { FileDiff } from "@/shared/ui/agents/file-diff/file-diff";
import { lineDiff } from "@/shared/ui/agents/file-diff/line-diff";

export function SearchBriefFileDiff({
  previousMarkdown,
  markdown
}: {
  previousMarkdown: string;
  markdown: string;
}) {
  const lines = React.useMemo(
    () => lineDiff(previousMarkdown, markdown),
    [markdown, previousMarkdown]
  );

  return (
    <FileDiff
      file="search-brief.md"
      lines={lines}
      status="complete"
      defaultOpen={false}
      collapseOnComplete
      // Highlighter registers bash|diff|json|tsx|typescript — "text" is not loaded.
      language="diff"
      copyText={markdown}
      className="w-full max-w-[min(72ch,100%)]"
    />
  );
}
