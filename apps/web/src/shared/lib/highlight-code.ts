import {
  createMarkdownHighlighter,
  loadMarkdownLang,
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
  yml: "yaml",
  md: "markdown"
};

const highlighterPromise: Promise<MarkdownHighlighter> =
  typeof window !== "undefined"
    ? createMarkdownHighlighter()
    : new Promise<MarkdownHighlighter>(() => {});

const loadedLangs = new Set<ShikiBundledLang>();
const langLoadPromises = new Map<ShikiBundledLang, Promise<void>>();

const htmlCache = new Map<string, Promise<string>>();

export function highlightCode(code: string, lang: string): Promise<string> {
  const key = `${lang}:${code}`;
  const cached = htmlCache.get(key);
  if (cached) return cached;

  const promise = highlighterPromise.then(async (highlighter) => {
    const normalized =
      FENCE_LANG_ALIASES[lang] ??
      (shikiBundledLangSet.has(lang) ? (lang as ShikiBundledLang) : null);
    const effectiveLang = normalized ?? "text";

    if (normalized && !loadedLangs.has(normalized)) {
      let loadPromise = langLoadPromises.get(normalized);
      if (!loadPromise) {
        loadPromise = loadMarkdownLang(highlighter, normalized).then(() => {
          loadedLangs.add(normalized);
          langLoadPromises.delete(normalized);
        });
        langLoadPromises.set(normalized, loadPromise);
      }
      await loadPromise;
    }

    return highlighter.codeToHtml(code, {
      defaultColor: false,
      lang: effectiveLang,
      themes: { light: "diffkit-light", dark: "diffkit-dark" }
    });
  });
  htmlCache.set(key, promise);
  return promise;
}
