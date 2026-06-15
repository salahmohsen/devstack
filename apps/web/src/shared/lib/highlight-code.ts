import {
  createMarkdownHighlighter,
  type MarkdownHighlighter,
  type ShikiBundledLang,
  shikiBundledLangSet
} from "@tsu-stack/ui/lib/shiki-bundle";

const FENCE_LANG_ALIASES: Record<string, ShikiBundledLang> = {
  shell: "shellscript",
  sh: "shellscript",
  zsh: "shellscript",
  console: "shellscript",
  js: "javascript",
  ts: "typescript",
  py: "python",
  rs: "rust",
  rb: "ruby",
  kt: "kotlin",
  cs: "csharp",
  yml: "yaml",
  gql: "graphql",
  md: "markdown"
};

const highlighterPromise: Promise<MarkdownHighlighter> =
  typeof window !== "undefined"
    ? createMarkdownHighlighter()
    : new Promise<MarkdownHighlighter>(() => {});

const htmlCache = new Map<string, Promise<string>>();

export function highlightCode(code: string, lang: string): Promise<string> {
  const key = `${lang}:${code}`;
  const cached = htmlCache.get(key);
  if (cached) return cached;

  const promise = highlighterPromise.then((highlighter) => {
    const normalized =
      FENCE_LANG_ALIASES[lang] ??
      (shikiBundledLangSet.has(lang) ? (lang as ShikiBundledLang) : null);
    const effectiveLang = normalized ?? "text";
    return highlighter.codeToHtml(code, {
      defaultColor: false,
      lang: effectiveLang,
      themes: { light: "diffkit-light", dark: "diffkit-dark" }
    });
  });
  htmlCache.set(key, promise);
  return promise;
}
