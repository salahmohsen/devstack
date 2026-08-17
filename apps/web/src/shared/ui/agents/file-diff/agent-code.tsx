"use client";

import { type CSSProperties, Fragment, useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

import { cn } from "@tsu-stack/ui/lib/utils";

export type AgentCodeLanguage = "bash" | "diff" | "json" | "text" | "tsx" | "typescript";

export type AgentCodeToken = {
  content: string;
  offset: number;
  light?: string;
  dark?: string;
};

export type AgentCodeTokenLines = AgentCodeToken[][];

export type AgentCodeProps = {
  code: string;
  language?: AgentCodeLanguage;
  className?: string;
};

export type AgentCodeLineProps = {
  code: string;
  tokens?: AgentCodeToken[];
  className?: string;
};

const LIGHT_THEME = "github-light-high-contrast";
const DARK_THEME = "github-dark-high-contrast";
const HIGHLIGHTED_LANGS = ["bash", "diff", "json", "tsx", "typescript"] as const;

let agentCodeHighlighter: Promise<Highlighter> | null = null;
const tokenCache = new Map<string, AgentCodeTokenLines>();

function getAgentCodeHighlighter() {
  agentCodeHighlighter ??= createHighlighter({
    themes: [LIGHT_THEME, DARK_THEME],
    langs: [...HIGHLIGHTED_LANGS]
  });
  return agentCodeHighlighter;
}

function tokenCacheKey(code: string, language: AgentCodeLanguage) {
  return `${language}\u0000${code}`;
}

function isHighlightedLanguage(
  language: AgentCodeLanguage
): language is Exclude<AgentCodeLanguage, "text"> {
  return language !== "text";
}

export function useAgentCodeTokens(code: string, language: AgentCodeLanguage) {
  const key = tokenCacheKey(code, language);
  const cached = tokenCache.get(key);
  const [result, setResult] = useState<{
    key: string;
    lines: AgentCodeTokenLines;
  } | null>(cached ? { key, lines: cached } : null);

  useEffect(() => {
    // Highlighter only registers bash|diff|json|tsx|typescript — "text" throws.
    if (!isHighlightedLanguage(language)) return;
    if (tokenCache.has(key)) return;

    let cancelled = false;
    void getAgentCodeHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        // Nitro stubs createHighlighter() as {} — do not throw on SSR.
        if (typeof highlighter.codeToTokensWithThemes !== "function") return;
        const lines = highlighter
          .codeToTokensWithThemes(code, {
            lang: language,
            themes: {
              light: LIGHT_THEME,
              dark: DARK_THEME
            }
          })
          .map((line) =>
            line.map((token) => {
              return {
                content: token.content,
                offset: token.offset,
                light: token.variants.light?.color,
                dark: token.variants.dark?.color
              };
            })
          );
        tokenCache.set(key, lines);
        setResult({ key, lines });
      })
      .catch(() => {
        // Unregistered lang or stub highlighter — render plain text.
      });
    return () => {
      cancelled = true;
    };
  }, [code, key, language]);

  if (!isHighlightedLanguage(language)) return null;
  if (cached) return cached;
  if (result?.key === key) return result.lines;
  return null;
}

export function AgentCodeLine({ code, tokens, className }: AgentCodeLineProps) {
  return (
    <span className={className}>
      {tokens
        ? tokens.map((token) => (
            <span
              key={`${token.offset}-${token.content}`}
              style={
                {
                  "--agent-code-light": token.light ?? "currentColor",
                  "--agent-code-dark": token.dark ?? token.light ?? "currentColor"
                } as CSSProperties
              }
              className="text-(--agent-code-light) dark:text-(--agent-code-dark)"
            >
              {token.content}
            </span>
          ))
        : code}
    </span>
  );
}

function splitCodeLines(code: string): Array<{ content: string; offset: number }> {
  const lines: Array<{ content: string; offset: number }> = [];
  let offset = 0;
  for (const content of code.split("\n")) {
    lines.push({ content, offset });
    offset += content.length + 1;
  }
  return lines;
}

export function AgentCode({ code, language = "bash", className }: AgentCodeProps) {
  const tokens = useAgentCodeTokens(code, language);
  const lines = splitCodeLines(code);

  return (
    <pre
      className={cn(
        "m-0 overflow-x-auto font-mono text-xs leading-5 whitespace-pre text-foreground/85",
        className
      )}
    >
      <code>
        {lines.map((line, index) => (
          <Fragment key={line.offset}>
            <AgentCodeLine code={line.content} tokens={tokens?.[index]} />
            {index < lines.length - 1 ? "\n" : null}
          </Fragment>
        ))}
      </code>
    </pre>
  );
}
