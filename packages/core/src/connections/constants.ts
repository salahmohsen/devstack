/**
 * Gmail API scopes for Settings → Connections (not used at Google login).
 * @see https://developers.google.com/gmail/api/auth/scopes
 */
export const GMAIL_CONNECT_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send"
] as const;

/** Substring match for stored OAuth scope strings (space-separated). */
export const GMAIL_SCOPE_MARKERS = ["gmail.readonly", "gmail.send", "gmail.modify"] as const;

export function scopeListIncludesGmail(scope: string | null | undefined): boolean {
  if (!scope) return false;
  const normalized = scope.toLowerCase();
  return GMAIL_SCOPE_MARKERS.some((marker) => normalized.includes(marker));
}

/** Drop Gmail API scopes; keep OpenID / email / profile for Google sign-in. */
export function stripGmailScopes(scope: string | null | undefined): string {
  if (!scope) return "";
  return scope
    .split(/[\s,]+/)
    .filter((part) => {
      if (!part) return false;
      const lower = part.toLowerCase();
      return !GMAIL_SCOPE_MARKERS.some((marker) => lower.includes(marker));
    })
    .join(" ");
}
