import { type NormalizedListing } from "@tsu-stack/core";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "personal-hub-job-discovery/1.0";

export async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  init?.signal?.addEventListener("abort", onCallerAbort, { once: true });
  if (init?.signal?.aborted) {
    clearTimeout(timer);
    throw new DOMException("Aborted", "AbortError");
  }

  try {
    const headers = new Headers(init?.headers);
    if (!headers.has("User-Agent")) headers.set("User-Agent", USER_AGENT);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener("abort", onCallerAbort);
  }
}

export async function fetchNormalizedListings(
  url: string,
  pick: (body: unknown) => unknown[],
  normalize: (raw: unknown) => NormalizedListing | null
): Promise<NormalizedListing[]> {
  try {
    const body = await fetchJson(url);
    return pick(body)
      .map(normalize)
      .filter((row): row is NormalizedListing => row != null);
  } catch {
    return [];
  }
}
