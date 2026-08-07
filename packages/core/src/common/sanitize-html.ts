/**
 * Sanitize owner-authored rich HTML for public portfolio surfaces
 * (project summary/description, experience description).
 *
 * Zero-dep allowlist approach (same spirit as {@link sanitizeSvg}):
 * strip scripts/embeds, event handlers, and non-http(s) URLs. Keeps basic
 * formatting tags used by the portfolio editor.
 */

const BLOCKED_TAGS =
  /<\/?(?:script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|svg|math|template|noscript|frame|frameset)\b[^>]*>/gi;

const BLOCKED_PAIRS =
  /<(script|style|iframe|object|embed|form|textarea|select|svg|math|template|noscript|frame|frameset)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Tags kept for portfolio body copy. */
const ALLOWED_TAG = /^(?:p|br|ul|ol|li|strong|em|b|i|u|a|span|div|h[1-6]|blockquote|code|pre|hr)$/i;

/**
 * Sanitize HTML string for safe `dangerouslySetInnerHTML` on public pages.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let out = html;

  // Remove paired + void dangerous elements (repeat for nesting edge cases).
  for (let i = 0; i < 3; i++) {
    out = out.replace(BLOCKED_PAIRS, "");
    out = out.replace(BLOCKED_TAGS, "");
  }

  // Drop event handlers (onclick, onerror, …).
  out = out.replace(/\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, "");
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Neutralize javascript: / vbscript: / data: in URL-bearing attrs.
  out = out.replace(
    /\s(href|src|xlink:href|action|formaction)\s*=\s*(["'])\s*(?:javascript|vbscript|data):[\s\S]*?\2/gi,
    ' $1="#"'
  );
  out = out.replace(
    /\s(href|src|xlink:href|action|formaction)\s*=\s*(?:javascript|vbscript|data):[^\s>]+/gi,
    ' $1="#"'
  );

  // Strip tags not in the allowlist (keep text content by removing the tag only).
  out = out.replace(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g, (full, name: string) => {
    if (ALLOWED_TAG.test(name)) {
      // For <a>, only keep safe href + rel + target.
      if (/^a$/i.test(name) && !full.startsWith("</")) {
        return sanitizeAnchorOpenTag(full);
      }
      // Strip style/class that could smuggle expressions; keep structure only.
      if (full.startsWith("</")) return `</${name.toLowerCase()}>`;
      return sanitizeOpenTag(full, name.toLowerCase());
    }
    return "";
  });

  return out;
}

function sanitizeOpenTag(_full: string, tag: string): string {
  if (tag === "br" || tag === "hr") return `<${tag}>`;
  // Drop all attributes on non-anchor tags (class/style/id can be re-applied via CSS).
  return `<${tag}>`;
}

function sanitizeAnchorOpenTag(full: string): string {
  const hrefMatch = full.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  const href = hrefMatch?.[2]?.trim() ?? "";
  // Allow http(s), mailto, relative paths, and hash links only.
  const safe =
    href === "" ||
    href.startsWith("#") ||
    href.startsWith("/") ||
    /^https?:\/\//i.test(href) ||
    /^mailto:/i.test(href);
  if (!safe) return "<a>";
  const escaped = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<a href="${escaped}" rel="noopener noreferrer">`;
}
