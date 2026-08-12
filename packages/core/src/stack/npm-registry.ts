/**
 * Lightweight npm registry client for stack detect/enrich flows.
 * Uses the public registry (no auth). Never log full response bodies at info.
 */

export type NpmPackageHealth = {
  deprecated?: boolean;
  downloads?: number;
  lastPublished?: string;
};

export type NpmPackageMeta = {
  name: string;
  description: string | null;
  homepage: string | null;
  health: NpmPackageHealth | null;
};

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Encode scoped packages for registry URLs.
 * `@scope/name` → `%40scope/name` (path segments), not a single `%40scope%2Fname` segment.
 */
export function registryPackagePath(npmPackage: string): string {
  return npmPackage
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

async function fetchJson(
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs: number
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!res.ok) return undefined;
    return (await res.json()) as unknown;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Fetch official package metadata from registry.npmjs.org.
 * Description is the registry `description` field (authoritative for UI copy).
 */
export async function fetchNpmPackageMeta(
  npmPackage: string,
  options?: { signal?: AbortSignal; timeoutMs?: number; includeDownloads?: boolean }
): Promise<NpmPackageMeta | null> {
  const name = npmPackage.trim();
  if (!name) return null;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const path = registryPackagePath(name);
  const body = await fetchJson(`https://registry.npmjs.org/${path}`, options?.signal, timeoutMs);
  if (body == null || typeof body !== "object") return null;

  const rec = body as Record<string, unknown>;
  const description =
    typeof rec.description === "string" && rec.description.trim() ? rec.description.trim() : null;
  const homepage =
    typeof rec.homepage === "string" && rec.homepage.trim() ? rec.homepage.trim() : null;

  const deprecated =
    typeof rec.deprecated === "string"
      ? true
      : typeof rec.deprecated === "boolean"
        ? rec.deprecated
        : false;

  let lastPublished: string | undefined;
  const time = rec.time;
  if (time && typeof time === "object") {
    const t = time as Record<string, unknown>;
    if (typeof t.modified === "string") lastPublished = t.modified;
  }

  let downloads: number | undefined;
  if (options?.includeDownloads !== false) {
    const dlBody = await fetchJson(
      `https://api.npmjs.org/downloads/point/last-week/${path}`,
      options?.signal,
      timeoutMs
    );
    if (dlBody != null && typeof dlBody === "object") {
      const d = (dlBody as Record<string, unknown>).downloads;
      if (typeof d === "number" && Number.isFinite(d)) downloads = d;
    }
  }

  const health: NpmPackageHealth | null =
    deprecated || downloads != null || lastPublished
      ? {
          ...(deprecated ? { deprecated: true } : {}),
          ...(downloads != null ? { downloads } : {}),
          ...(lastPublished ? { lastPublished } : {})
        }
      : null;

  return {
    name: typeof rec.name === "string" ? rec.name : name,
    description,
    homepage,
    health
  };
}

/**
 * Fetch metadata for many packages with a concurrency limit.
 * Returns a map keyed by the requested package name.
 */
export async function fetchNpmPackageMetaBatch(
  packages: string[],
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    concurrency?: number;
    includeDownloads?: boolean;
  }
): Promise<Map<string, NpmPackageMeta>> {
  const unique = [...new Set(packages.map((p) => p.trim()).filter(Boolean))];
  const out = new Map<string, NpmPackageMeta>();
  const concurrency = Math.max(1, options?.concurrency ?? 4);

  let next = 0;
  async function worker() {
    while (next < unique.length) {
      if (options?.signal?.aborted) return;
      const i = next++;
      const pkg = unique[i]!;
      const meta = await fetchNpmPackageMeta(pkg, options);
      if (meta) out.set(pkg, meta);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return out;
}
