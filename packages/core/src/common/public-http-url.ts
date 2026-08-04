/**
 * SSRF guard for outbound public HTTP(S) fetches.
 * Blocks non-http(s) schemes and private/reserved/metadata hosts.
 * Sync path: hostname string checks + IPv4/IPv6 literal parse (no DNS).
 * Async path: {@link assertPublicHttpUrlResolved} also DNS-resolves and
 * rejects private/reserved A/AAAA answers (DNS rebinding mitigation).
 *
 * IMPORTANT: no static `node:*` imports — `@tsu-stack/core` is barrel-imported
 * by the web client. A top-level `node:dns` import externalizes and throws in
 * the browser, which prevents hydration (page hangs after SSR HTML).
 */

import { type LookupAddress } from "node:dns";

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
  // 0.0.0.0/8 — "this" network / unspecified
  if (a === 0) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 10.0.0.0/8 — private
  if (a === 10) return true;
  // 100.64.0.0/10 — CGNAT / carrier-grade NAT
  if (a === 100 && b >= 64 && b <= 127) return true;
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

  // Unspecified
  if (hostname === "::") return true;

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

function isIpLiteral(hostname: string): boolean {
  if (parseIpv4(hostname)) return true;
  // IPv6 (may include dots only for IPv4-mapped forms already handled above)
  return hostname.includes(":");
}

/**
 * Assert `url` is an absolute http(s) URL targeting a non-private host.
 * Hostname string / IP-literal checks only (no DNS).
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

/**
 * Assert `url` is a public http(s) URL and that DNS does not resolve to
 * private/reserved addresses (DNS rebinding mitigation).
 *
 * Skips DNS for already-literal IP hosts (validated by {@link assertPublicHttpUrl}).
 *
 * @returns parsed URL on success
 * @throws Error when scheme/host is unsafe, DNS fails, or any resolved address is private
 */
export async function assertPublicHttpUrlResolved(url: string): Promise<URL> {
  const parsed = assertPublicHttpUrl(url);
  const hostname = normalizeHostname(parsed.hostname);

  // Literal IPs already checked by assertPublicHttpUrl — no DNS needed.
  if (isIpLiteral(hostname)) {
    return parsed;
  }

  // Dynamic import so browser bundles that only need assertPublicHttpUrl do not
  // evaluate node:dns at module load (Vite externalizes it and throws).
  const { promises: dns } = await import("node:dns");

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`DNS lookup failed for ${hostname}: ${msg}`);
  }

  if (addresses.length === 0) {
    throw new Error(`DNS lookup returned no addresses for ${hostname}`);
  }

  for (const { address, family } of addresses) {
    const addr = normalizeHostname(address);
    if (family === 4 || parseIpv4(addr)) {
      const octets = parseIpv4(addr);
      if (octets && isPrivateOrReservedIpv4(octets)) {
        throw new Error(`URL host resolves to private/reserved address: ${addr}`);
      }
      continue;
    }

    if (family === 6 || addr.includes(":")) {
      if (isPrivateOrReservedIpv6(addr)) {
        throw new Error(`URL host resolves to private/reserved address: ${addr}`);
      }
    }
  }

  return parsed;
}
