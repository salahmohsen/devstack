import { HostnameSchema } from "#@/domain/types";

/**
 * Normalize a host string for storage and lookup.
 * - trim + lowercase
 * - strip scheme / path when a URL-ish string is pasted
 * - strip port
 * - strip trailing dots
 */
export function normalizeHostname(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) return value;

  if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    }
  }

  // Drop path / query / hash if pasted without scheme
  value = value.split("/")[0] ?? value;
  value = value.split("?")[0] ?? value;
  value = value.split("#")[0] ?? value;

  // Strip port (hostname:port). IPv6 literals are rejected by HostnameSchema.
  if (value.includes(":") && !value.startsWith("[")) {
    value = value.split(":")[0] ?? value;
  }

  value = value.replace(/\.+$/, "");
  return value;
}

export function parseHostname(input: string) {
  return HostnameSchema.safeParse(normalizeHostname(input));
}

/** DNS TXT name used to prove domain ownership. */
export function customDomainVerificationRecordName(hostname: string): string {
  return `_career-verify.${normalizeHostname(hostname)}`;
}
