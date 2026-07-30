"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Prefer HTML body (Gmail/Resend) when present — plain text parts are often
 * tracking-URL dumps (LinkedIn, etc.). Sandboxed iframe isolates styles/scripts.
 */
export function MailBody({
  bodyHtml,
  bodyText,
  preview,
  className
}: {
  bodyHtml: string | null | undefined;
  bodyText: string;
  preview?: string;
  className?: string;
}) {
  const html = bodyHtml?.trim() ? bodyHtml : null;
  const trimmedText = bodyText.trim();
  const trimmedPreview = preview?.trim() ?? "";
  const plain = trimmedText.length > 0 ? trimmedText : trimmedPreview;

  if (html) {
    return <MailHtmlFrame html={html} className={className} />;
  }

  return (
    <p className={cn("max-w-[72ch] text-sm leading-relaxed whitespace-pre-wrap", className)}>
      {plain || "(empty message)"}
    </p>
  );
}

function wrapEmailDocument(html: string): string {
  // If already a full document, inject base styles; otherwise wrap fragment.
  const hasHtmlTag = /<html[\s>]/i.test(html);
  const baseStyles = `
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: CanvasText;
      background: transparent;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; }
    table { max-width: 100%; }
    pre, code { white-space: pre-wrap; word-break: break-word; }
  `;

  if (hasHtmlTag) {
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `<style>${baseStyles}</style></head>`);
    }
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head><style>${baseStyles}</style></head>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${baseStyles}</style></head><body>${html}</body></html>`;
}

function MailHtmlFrame({ html, className }: { html: string; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);

  const resize = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    const next = Math.min(Math.max(doc.body.scrollHeight + 16, 120), 4000);
    setHeight(next);
  }, []);

  useEffect(() => {
    resize();
  }, [html, resize]);

  return (
    <iframe
      ref={iframeRef}
      title="Email message"
      srcDoc={wrapEmailDocument(html)}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      referrerPolicy="no-referrer"
      className={cn("w-full max-w-full rounded-md border-0 bg-transparent", className)}
      style={{ height, minHeight: 120 }}
      onLoad={resize}
    />
  );
}
