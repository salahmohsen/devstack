import { Check, ClipboardCopy } from "lucide-react";
import { createContext, Suspense, use, useCallback, useContext, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";

import { cn } from "@tsu-stack/ui/lib/utils";

import { highlightCode } from "@/shared/lib/highlight-code";

export type MarkdownAssetUrlResolver = (url: string) => string;

const MarkdownAssetUrlResolverContext = createContext<MarkdownAssetUrlResolver | null>(null);

function useResolvedAssetUrl(url: string | undefined) {
  const resolveAssetUrl = useContext(MarkdownAssetUrlResolverContext);
  if (!url || !resolveAssetUrl) return url;
  return resolveAssetUrl(url);
}

function resolveAssetSrcSet(
  srcSet: string | undefined,
  resolveAssetUrl: MarkdownAssetUrlResolver | null
) {
  if (!srcSet || !resolveAssetUrl) return srcSet;

  return srcSet
    .split(",")
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return candidate;

      const match = trimmed.match(/^(\S+)(\s+.+)?$/u);
      if (!match) return candidate;

      const url = match[1];
      if (/^data:/iu.test(url)) return candidate;

      return `${resolveAssetUrl(url)}${match[2] ?? ""}`;
    })
    .join(", ");
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleClick = useCallback(() => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-muted-foreground text-muted-foreground opacity-0 transition-all group-hover/code:opacity-100 hover:bg-white/8 hover:text-accent-foreground"
    >
      {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
    </button>
  );
}

function ShikiCodeInner({ code, lang }: { code: string; lang: string }) {
  const html = use(highlightCode(code, lang));

  return (
    <div className="group/code relative mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <CopyButton code={code} />
    </div>
  );
}

function ShikiCode({ code, lang }: { code: string; lang: string }) {
  return (
    <Suspense
      fallback={
        <div className="group/code relative mb-2">
          <pre className="overflow-x-auto rounded-lg bg-muted-foreground p-3 text-xs text-accent-foreground">
            <code>{code}</code>
          </pre>
        </div>
      }
    >
      <ShikiCodeInner code={code} lang={lang} />
    </Suspense>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const components: Record<string, React.FC<any>> = {
  h1: ({ node: _node, children, ...props }) => (
    <h1 className="mt-5 mb-3 text-2xl font-semibold tracking-tight first:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node: _node, children, ...props }) => (
    <h2 className="mt-4 mb-2 text-xl font-semibold tracking-tight first:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node: _node, children, ...props }) => (
    <h3 className="mt-3 mb-2 text-lg font-semibold tracking-tight first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ node: _node, children, ...props }) => (
    <h4 className="mt-3 mb-1.5 text-base font-semibold first:mt-0" {...props}>
      {children}
    </h4>
  ),
  p: ({ node: _node, children, ...props }) => (
    <p className="mb-2 text-sm leading-relaxed last:mb-0" {...props}>
      {children}
    </p>
  ),
  a: ({ node: _node, children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium underline decoration-white/20 underline-offset-2 transition-colors hover:decoration-white"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ node: _node, children, ...props }) => (
    <ul className="mb-2 flex list-disc flex-col gap-1.5 pl-5 text-sm" {...props}>
      {children}
    </ul>
  ),
  ol: ({ node: _node, children, ...props }) => (
    <ol className="mb-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm" {...props}>
      {children}
    </ol>
  ),
  li: ({ node: _node, children, ...props }) => (
    <li className="text-sm leading-relaxed" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ node: _node, children, ...props }) => (
    <blockquote
      className="mb-2 border-l-2 border-white/20 pl-3 text-sm text-muted-foreground italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ node: _node, children, className, ...props }) => {
    const langMatch = className?.match(/language-(\w+)/);
    if (langMatch) {
      const code = String(children).replace(/\n$/, "");
      return <ShikiCode code={code} lang={langMatch[1]} />;
    }
    return (
      <code className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-xs" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, node, ...props }) => {
    const codeChild = node?.children?.[0];
    if (
      codeChild?.type === "element" &&
      codeChild.tagName === "code" &&
      Array.isArray(codeChild.properties?.className) &&
      (codeChild.properties.className as string[]).some((c) => String(c).startsWith("language-"))
    ) {
      return <>{children}</>;
    }
    return (
      <pre
        className="mb-2 overflow-x-auto rounded-lg bg-muted-foreground p-3 text-xs text-accent-foreground"
        {...props}
      >
        {children}
      </pre>
    );
  },
  hr: ({ node: _node, ...props }) => <hr className="my-4 border-border" {...props} />,
  img: ({ node: _node, alt, src, ...props }) => (
    <img
      className="my-2 inline-block max-w-full rounded-lg"
      alt={alt}
      src={useResolvedAssetUrl(src)}
      {...props}
    />
  ),
  video: ({ node: _node, src, className, ...props }) => (
    // oxlint-disable-next-line jsx-a11y/media-has-caption
    <video
      className={cn("my-2 max-w-full rounded-lg", className)}
      controls
      preload="metadata"
      src={useResolvedAssetUrl(src)}
      {...props}
    />
  ),
  source: ({ node: _node, src, srcSet, srcset, ...props }) => {
    const resolveAssetUrl = useContext(MarkdownAssetUrlResolverContext);
    const resolvedSrcSet = resolveAssetSrcSet(srcSet ?? srcset, resolveAssetUrl);

    return <source src={useResolvedAssetUrl(src)} srcSet={resolvedSrcSet} {...props} />;
  },
  table: ({ node: _node, children, ...props }) => (
    <div className="mb-2 flex flex-col overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node: _node, children, ...props }) => (
    <thead className="bg-muted-foreground" {...props}>
      {children}
    </thead>
  ),
  th: ({ node: _node, children, ...props }) => (
    <th
      className="border-r border-b border-border px-3 py-1.5 text-left text-xs font-medium text-muted-foreground last:border-r-0"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ node: _node, children, ...props }) => (
    <td
      className="border-r border-b border-border px-3 py-1.5 text-xs last:border-r-0 [tr:last-child_&]:border-b-0"
      {...props}
    >
      {children}
    </td>
  ),
  input: ({ node: _node, type, checked, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-1.5 rounded border-border"
          {...props}
        />
      );
    }
    return <input type={type} {...props} />;
  },
  strong: ({ node: _node, children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ node: _node, children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  del: ({ node: _node, children, ...props }) => (
    <del className="text-muted-foreground line-through" {...props}>
      {children}
    </del>
  ),
  details: ({ node: _node, children, ...props }) => (
    <details className="group/details mb-2 text-sm [&>:not(summary)]:mt-2" {...props}>
      {children}
    </details>
  ),
  summary: ({ node: _node, children, ...props }) => (
    <summary
      className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-muted-foreground px-3 py-1.5 text-[13px] font-medium select-none hover:bg-white/6 [&::-webkit-details-marker]:hidden"
      {...props}
    >
      <svg
        className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/details:rotate-90"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 4l4 4-4 4" />
      </svg>
      {children}
    </summary>
  )
};

export function Markdown({
  children,
  className,
  resolveAssetUrl
}: {
  children: string;
  className?: string;
  resolveAssetUrl?: MarkdownAssetUrlResolver;
}) {
  return (
    <MarkdownAssetUrlResolverContext.Provider value={resolveAssetUrl ?? null}>
      <div className={cn("wrap-break-word", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkAlert]}
          rehypePlugins={[rehypeRaw]}
          components={components as Partial<Components>}
        >
          {children}
        </ReactMarkdown>
      </div>
    </MarkdownAssetUrlResolverContext.Provider>
  );
}
