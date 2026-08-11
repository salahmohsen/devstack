import { htmlToText, sanitizeHtml } from "@tsu-stack/core";
import { cn } from "@tsu-stack/ui/lib/utils";

/** Empty TipTap shells and whitespace-only strings. */
export function isEmptyRichHtml(raw: string | null | undefined): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return true;
  return htmlToText(trimmed).length === 0;
}

const richHtmlClassName =
  "max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3 [&_blockquote]:italic [&_li]:mb-0.5 [&_ol]:list-decimal [&_ol]:ps-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ps-4";

/**
 * Render owner-authored HTML (rich text editor) safely for public and settings surfaces.
 * Plain text without tags is still injected safely via {@link sanitizeHtml}.
 */
export function RichHtml({
  html,
  className,
  as: Comp = "div"
}: {
  html: string;
  className?: string;
  as?: "div" | "span";
}) {
  if (isEmptyRichHtml(html)) return null;
  return (
    <Comp
      className={cn(richHtmlClassName, className)}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
