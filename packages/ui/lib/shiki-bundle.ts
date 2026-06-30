import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import { diffkitDark, diffkitLight } from "#@/lib/shiki-themes";

/**
 * Fine-grained Shiki bundle: only these grammars are ever loaded (see shiki.style/guide/bundles).
 * Scoped to the JS/Node.js realm: web/TS, configs, shell, SQL for query snippets, diff for commits.
 * Unknown fence languages fall back to unstyled output via `text` in highlight callers.
 */
export const SHIKI_BUNDLED_LANGS = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "html",
  "css",
  "bash",
  "shellscript",
  "sql",
  "diff",
  "yaml",
  "markdown"
] as const;

export type ShikiBundledLang = (typeof SHIKI_BUNDLED_LANGS)[number];

export type MarkdownHighlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

type LanguageInput = Parameters<MarkdownHighlighter["loadLanguage"]>[0];

const LANG_IMPORTS: Record<ShikiBundledLang, LanguageInput> = {
  javascript: () => import("@shikijs/langs/javascript").then((m) => m.default),
  typescript: () => import("@shikijs/langs/typescript").then((m) => m.default),
  jsx: () => import("@shikijs/langs/jsx").then((m) => m.default),
  tsx: () => import("@shikijs/langs/tsx").then((m) => m.default),
  json: () => import("@shikijs/langs/json").then((m) => m.default),
  html: () => import("@shikijs/langs/html").then((m) => m.default),
  css: () => import("@shikijs/langs/css").then((m) => m.default),
  bash: () => import("@shikijs/langs/bash").then((m) => m.default),
  shellscript: () => import("@shikijs/langs/shellscript").then((m) => m.default),
  sql: () => import("@shikijs/langs/sql").then((m) => m.default),
  diff: () => import("@shikijs/langs/diff").then((m) => m.default),
  yaml: () => import("@shikijs/langs/yaml").then((m) => m.default),
  markdown: () => import("@shikijs/langs/markdown").then((m) => m.default)
};

export const shikiBundledLangSet = new Set<string>(SHIKI_BUNDLED_LANGS);

export function createMarkdownHighlighter(): Promise<MarkdownHighlighter> {
  return createHighlighterCore({
    themes: [diffkitLight, diffkitDark],
    langs: [],
    engine: createJavaScriptRegexEngine()
  });
}

export async function loadMarkdownLang(
  highlighter: MarkdownHighlighter,
  lang: ShikiBundledLang
): Promise<void> {
  await highlighter.loadLanguage(LANG_IMPORTS[lang]);
}
