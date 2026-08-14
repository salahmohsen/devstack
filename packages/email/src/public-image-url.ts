function isLoopbackOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") {
    return true;
  }
  if (host.endsWith(".local")) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

/** Gmail and other clients will not fetch loopback or http image URLs. */
export function toEmailSafeImageUrl(url: string | null | undefined): string | null {
  const raw = url?.trim() ?? "";
  if (!raw) return null;
  if (raw.startsWith("cid:")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    if (isLoopbackOrPrivateHost(parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}
