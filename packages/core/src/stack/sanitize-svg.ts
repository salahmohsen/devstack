// TODO: REMOVE THIS FILE IF NOT USED

/**
 * Sanitize SVG string to prevent XSS attacks.
 * Removes scripts, event handlers, javascript: URLs, and foreignObjects.
 */
export function sanitizeSvg(svg: string): string {
  if (!svg || typeof svg !== "string") {
    return "";
  }

  // Remove script tags
  let sanitized = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove on* event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, 'xlink:href="#"');

  // Remove foreignObject tags (can contain arbitrary HTML)
  sanitized = sanitized.replace(
    /<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi,
    ""
  );

  // Remove any remaining dangerous attributes (but preserve xmlns)
  sanitized = sanitized.replace(/\s+(?:script|data)[^=]*=\s*["'][^"']*["']/gi, "");

  return sanitized;
}
