import { marked } from "marked";
import { memo, useId, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@tsu-stack/ui/lib/utils";

import { CodeBlock, CodeBlockCode } from "@/components/prompt-kit/code-block";

export type MarkdownProps = {
  children: string;
  id?: string;
  className?: string;
  components?: Partial<Components>;
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext";
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : "plaintext";
}

/**
 * Chat-facing markdown elements. Colors come from semantic theme tokens
 * (`foreground`, `muted`, `border`, `primary`, `card`) — not hard-coded
 * white/black alphas like `bg-white/6` or `border-white/20`.
 */
const INITIAL_COMPONENTS: Partial<Components> = {
  h1: ({ className, children, ...props }) => (
    <h1
      className={cn(
        "mt-4 mb-2 text-xl font-semibold tracking-tight text-foreground first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }) => (
    <h2
      className={cn(
        "mt-3 mb-2 text-lg font-semibold tracking-tight text-foreground first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }) => (
    <h3
      className={cn(
        "mt-3 mb-1.5 text-base font-semibold tracking-tight text-foreground first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ className, children, ...props }) => (
    <h4
      className={cn("mt-2 mb-1 text-sm font-semibold text-foreground first:mt-0", className)}
      {...props}
    >
      {children}
    </h4>
  ),
  p: ({ className, children, ...props }) => (
    <p
      className={cn("mb-2 text-sm leading-relaxed text-foreground last:mb-0", className)}
      {...props}
    >
      {children}
    </p>
  ),
  a: ({ className, children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary",
        className
      )}
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ className, children, ...props }) => (
    <ul
      className={cn(
        "mb-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground last:mb-0",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ className, children, ...props }) => (
    <ol
      className={cn(
        "mb-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground last:mb-0",
        className
      )}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ className, children, ...props }) => (
    <li className={cn("leading-relaxed text-foreground marker:text-muted-foreground", className)} {...props}>
      {children}
    </li>
  ),
  blockquote: ({ className, children, ...props }) => (
    <blockquote
      className={cn(
        "mb-2 border-l-2 border-border pl-3 text-sm text-muted-foreground italic last:mb-0",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-3 border-border", className)} {...props} />
  ),
  strong: ({ className, children, ...props }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props}>
      {children}
    </strong>
  ),
  em: ({ className, children, ...props }) => (
    <em className={cn("text-foreground italic", className)} {...props}>
      {children}
    </em>
  ),
  del: ({ className, children, ...props }) => (
    <del className={cn("text-muted-foreground line-through", className)} {...props}>
      {children}
    </del>
  ),
  table: ({ className, children, ...props }) => (
    <div className="mb-2 overflow-x-auto rounded-lg border border-border last:mb-0">
      <table
        className={cn("w-full border-collapse text-sm text-foreground", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ className, children, ...props }) => (
    <thead className={cn("bg-muted/60", className)} {...props}>
      {children}
    </thead>
  ),
  th: ({ className, children, ...props }) => (
    <th
      className={cn(
        "border-b border-border px-3 py-1.5 text-left text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ className, children, ...props }) => (
    <td
      className={cn(
        "border-b border-border px-3 py-1.5 text-xs text-foreground [tr:last-child_&]:border-b-0",
        className
      )}
      {...props}
    >
      {children}
    </td>
  ),
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line;

    if (isInline) {
      return (
        <code
          className={cn(
            "rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }

    const language = extractLanguage(className);

    return (
      <CodeBlock className={cn("my-2 last:mb-0", className)}>
        <CodeBlockCode code={String(children).replace(/\n$/, "")} language={language} />
      </CodeBlock>
    );
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>;
  }
};

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS
  }: {
    content: string;
    components?: Partial<Components>;
  }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    );
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content;
  }
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS
}: MarkdownProps) {
  const generatedId = useId();
  const blockId = id ?? generatedId;
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children]);

  return (
    <div className={cn("wrap-break-word text-sm text-foreground", className)}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
        />
      ))}
    </div>
  );
}

const Markdown = memo(MarkdownComponent);
Markdown.displayName = "Markdown";

export { Markdown };
