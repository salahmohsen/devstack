/**
 * SSRF guard for outbound public HTTP(S) fetches.
 * Blocks non-http(s) schemes and private/reserved/metadata hosts.
 * Uses hostname string checks + IPv4 parse (no DNS re-resolution).
 */

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "169.254.169.254"]);

/** Parse dotted-decimal IPv4; returns null if not a valid IPv4 literal. */
function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    // Digits only (allow leading zeros so 010.0.0.1 still maps to 10.x)
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets as [number, number, number, number];
}

function isPrivateOrReservedIpv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 10.0.0.0/8 — private
  if (a === 10) return true;
  // 172.16.0.0/12 — private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 — link-local (includes cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Lightweight IPv6 checks for common private/reserved forms.
 * Hostname is expected lowercased, without brackets.
 */
function isPrivateOrReservedIpv6(hostname: string): boolean {
  // IPv4-mapped IPv6: ::ffff:a.b.c.d (dots allowed in this form)
  const v4Mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(hostname);
  if (v4Mapped) {
    const octets = parseIpv4(v4Mapped[1]!);
    if (octets && isPrivateOrReservedIpv4(octets)) return true;
  }

  if (!/^[0-9a-f:]+$/i.test(hostname)) return false;

  // Loopback
  if (hostname === "::1") return true;

  // fc00::/7 — unique local (fc00::/8 and fd00::/8)
  if (hostname.startsWith("fc") || hostname.startsWith("fd")) return true;

  // fe80::/10 — link-local (first hextet fe80–febf)
  if (/^fe[89ab][0-9a-f]{0,2}:/i.test(hostname)) return true;

  return false;
}

function normalizeHostname(hostname: string): string {
  // Node may keep brackets on IPv6 literals (e.g. "[::1]").
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

/**
 * Assert `url` is an absolute http(s) URL targeting a non-private host.
 * @returns parsed URL on success
 * @throws Error when scheme/host is unsafe or URL is invalid
 */
export function assertPublicHttpUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`URL scheme not allowed: ${parsed.protocol}`);
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    throw new Error("URL hostname is empty");
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`URL host is blocked: ${hostname}`);
  }

  // Bare "localhost" variants (e.g. localhost.localdomain) — block exact + common local TLD
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error(`URL host is blocked: ${hostname}`);
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4 && isPrivateOrReservedIpv4(ipv4)) {
    throw new Error(`URL host is private/reserved: ${hostname}`);
  }

  // IPv6 literals (URL.hostname without brackets)
  if (hostname.includes(":")) {
    if (isPrivateOrReservedIpv6(hostname)) {
      throw new Error(`URL host is private/reserved: ${hostname}`);
    }
  }

  return parsed;
}
