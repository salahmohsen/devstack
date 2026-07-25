import React, { useEffect, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { highlightCode } from "@/shared/lib/highlight-code";

export type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border",
        "rounded-xl border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CodeBlockCodeProps = {
  code: string;
  language?: string;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({ code, language = "tsx", className, ...props }: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      if (!code) {
        if (!cancelled) setHighlightedHtml("<pre><code></code></pre>");
        return;
      }

      // Shared highlighter: dual light/dark themes via CSS variables
      // (diffkit-light / diffkit-dark) — no hard-coded github-light whites.
      const html = await highlightCode(code, language);
      if (!cancelled) setHighlightedHtml(html);
    }

    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] text-foreground",
    "[&>pre]:bg-transparent [&>pre]:px-4 [&>pre]:py-4",
    className
  );

  if (highlightedHtml) {
    return (
      <div
        className={classNames}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        {...props}
      />
    );
  }

  return (
    <div className={classNames} {...props}>
      <pre className="bg-muted text-foreground">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({ children, className, ...props }: CodeBlockGroupProps) {
  return (
    <div className={cn("flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
