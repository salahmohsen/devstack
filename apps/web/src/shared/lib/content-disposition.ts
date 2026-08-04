/**
 * Sanitize a download filename for Content-Disposition.
 * Strips path segments, quotes, CR/LF, and other control characters.
 */
export function sanitizeDownloadFilename(filename: string, fallback = "download.pdf"): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? fallback;
  const cleaned = base.replace(/["\r\n\x00-\x1F\x7F]/g, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Build a Content-Disposition header value with a safe basename.
 * Uses RFC 5987 `filename*` when the name contains non-ASCII characters.
 */
export function buildContentDisposition(
  disposition: "inline" | "attachment",
  filename: string,
  fallback = "download.pdf"
): string {
  const safe = sanitizeDownloadFilename(filename, fallback);
  const hasNonAscii = /[^\x20-\x7E]/.test(safe);

  if (hasNonAscii) {
    const asciiFallback = safe.replace(/[^\x20-\x7E]/g, "_") || fallback;
    return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
  }

  return `${disposition}; filename="${safe}"`;
}
