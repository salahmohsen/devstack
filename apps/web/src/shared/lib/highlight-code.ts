import {
  createMarkdownHighlighter,
  type MarkdownHighlighter,
  type ShikiBundledLang,
  shikiBundledLangSet
} from "@tsu-stack/ui/lib/shiki-bundle";

const FENCE_LANG_ALIASES: Record<string, string> = {
  bash: "bash",
  cjs: "javascript",
  cfg: "ini",
  conf: "ini",
  console: "shellscript",
  cs: "csharp",
  cts: "typescript",
  cxx: "cpp",
  dockerfile: "dockerfile",
  env: "bash",
  erb: "ruby",
  fish: "bash",
  gql: "graphql",
  h: "c",
  hpp: "cpp",
  htm: "html",
  hxx: "cpp",
  js: "javascript",
  json5: "json",
  jsonc: "json",
  kts: "kotlin",
  md: "markdown",
  mjs: "javascript",
  mts: "typescript",
  patch: "diff",
  pm: "perl",
  ps1: "powershell",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shellscript",
  shell: "shellscript",
  svg: "html",
  tf: "hcl",
  tfvars: "hcl",
  ts: "typescript",
  xhtml: "html",
  yml: "yaml",
  zsh: "shellscript"
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
      themes: { dark: "portfolio-dark", light: "portfolio-light" }
    });
  });
  htmlCache.set(key, promise);
  return promise;
}
