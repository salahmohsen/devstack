export const persistedMeta = {
  persist: true
} as const;

export function getGitHubDataSource(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("__meta" in value)) {
    return null;
  }

  const meta = value.__meta;
  if (!meta || typeof meta !== "object" || !("source" in meta)) {
    return null;
  }

  return typeof meta.source === "string" ? meta.source : null;
}

export function getGitHubCacheStatus(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("__meta" in value)) {
    return null;
  }

  const meta = value.__meta;
  if (!meta || typeof meta !== "object" || !("cacheStatus" in meta)) {
    return null;
  }

  return typeof meta.cacheStatus === "string" ? meta.cacheStatus : null;
}
