const LEGAL_SUFFIX =
  /\b(incorporated|corporation|company|limited|inc|corp|llc|ltd|gmbh|ag|s\.?a\.?|pty)\b\.?/gi;

export function companySlugFromName(name: string): string {
  const stripped = name.replace(LEGAL_SUFFIX, " ").replace(/[,.'"]/g, " ");
  return stripped
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
