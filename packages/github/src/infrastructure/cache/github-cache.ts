import { getDb } from "@tsu-stack/db";
import { githubCacheRepository, type DbExecutor } from "@tsu-stack/db/repositories";

import {
  createGitHubResponseMetadata,
  getErrorStatusCode,
  type GitHubConditionalHeaders,
  type GitHubResponseMetadata
} from "#@/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "#@/runtime/bindings";
import { type GitHubLocalFirstResult } from "#@/types";

type GitHubFetchResult<TData> =
  | {
      kind: "not-modified";
      metadata: GitHubResponseMetadata;
    }
  | {
      data: TData;
      kind: "success";
      metadata: GitHubResponseMetadata;
    };

type GitHubCacheOptions<TData> = {
  fetcher: (conditionals: GitHubConditionalHeaders) => Promise<GitHubFetchResult<TData>>;
  freshForMs: number;
  namespaceKeys?: string[];
  owner: string;
  params?: unknown;
  resource: string;
  runtime?: GitHubRuntimeBindings;
  signalKeys?: string[];
};

type CachedGitHubEntry<TData> = {
  etag: string | null;
  fetchedAt: Date;
  lastModified: string | null;
  namespaceVersion: number;
  payload: TData;
  staleAt: Date | null;
};

type ReadCachedEntryResult<TData> =
  | { entry: CachedGitHubEntry<TData>; source: "kv" | "db" }
  | { entry: null; source: "none" };

const DEFAULT_KV_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;
const STALE_IF_RATE_LIMITED_FALLBACK_MS = 60 * 1000;

export async function bumpGitHubCacheNamespaces(
  namespaceKeys: string[],
  executor: DbExecutor = getDb()
) {
  const uniqueKeys = [...new Set(namespaceKeys)];
  if (uniqueKeys.length === 0) {
    return;
  }
  await githubCacheRepository.bumpNamespaceVersion(uniqueKeys, executor);
}

export async function markGitHubRevalidationSignals(
  signalKeys: string[],
  executor: DbExecutor = getDb()
) {
  const uniqueKeys = [...new Set(signalKeys)];
  if (uniqueKeys.length === 0) {
    return;
  }
  await githubCacheRepository.markRevalidationSignals(uniqueKeys, executor);
}

export async function getGitHubRevalidationSignals(
  signalKeys: string[]
): Promise<Array<{ signalKey: string; updatedAt: number }>> {
  if (signalKeys.length === 0) return [];

  const uniqueSignalKeys = Array.from(new Set(signalKeys));
  const entries = await githubCacheRepository.findRevalidationSignals(uniqueSignalKeys);

  return entries.map((entry) => {
    return {
      signalKey: entry.signalKey,
      updatedAt: entry.updatedAt.getTime()
    };
  });
}

export async function getGitHubResourceLocalFirst<TData>(
  options: GitHubCacheOptions<TData>
): Promise<GitHubLocalFirstResult<TData>> {
  const { entry: cached, source: cachedSource } = await readCachedEntry<TData>(options);
  const latestSignalAt = await getLatestSignalUpdatedAt(options.signalKeys ?? []);
  const currentNamespaceVersion = await getCurrentNamespaceVersion(options.namespaceKeys ?? []);
  const staleBecauseNamespace = cached
    ? cached.namespaceVersion !== currentNamespaceVersion
    : false;
  const staleBecauseSignal =
    cached && latestSignalAt ? cached.fetchedAt.getTime() < latestSignalAt : false;
  const staleBecauseAge =
    cached && cached.staleAt ? cached.staleAt.getTime() <= Date.now() : !cached;
  const isStale = staleBecauseNamespace || staleBecauseSignal || staleBecauseAge;

  if (!cached || isStale) {
    try {
      const fresh = await fetchAndPersist(options, cached, currentNamespaceVersion);
      return {
        data: fresh.data,
        meta: {
          cacheStatus: cached ? "stale" : "miss",
          fetchedAt: fresh.fetchedAt.toISOString(),
          isRevalidating: false,
          source: fresh.source
        }
      };
    } catch (error) {
      if (cached) {
        const statusCode = getErrorStatusCode(error);
        const isRateLimited = statusCode === 403 || statusCode === 429;
        return {
          data: cached.payload as TData,
          meta: {
            cacheStatus: "stale",
            fetchedAt: cached.fetchedAt.toISOString(),
            isRevalidating: false,
            source: isRateLimited ? "rate-limited" : "stale-on-error"
          }
        };
      }

      throw error;
    }
  }

  return {
    data: cached.payload as TData,
    meta: {
      cacheStatus: "fresh",
      fetchedAt: cached.fetchedAt.toISOString(),
      isRevalidating: false,
      source: cachedSource
    }
  };
}

export async function getOrRevalidateGitHubResource<TData>(
  options: GitHubCacheOptions<TData>
): Promise<TData> {
  const result = await getGitHubResourceLocalFirst(options);
  return result.data;
}

async function fetchAndPersist<TData>(
  options: GitHubCacheOptions<TData>,
  cachedEntry: CachedGitHubEntry<TData> | null,
  namespaceVersion: number
): Promise<{ data: TData; fetchedAt: Date; source: "octokit" | "not-modified" }> {
  const conditionals: GitHubConditionalHeaders = {
    etag: cachedEntry?.etag ?? null,
    lastModified: cachedEntry?.lastModified ?? null
  };
  const result = await options.fetcher(conditionals).catch((error: unknown) => {
    if (getErrorStatusCode(error) === 304 && cachedEntry) {
      return {
        kind: "not-modified" as const,
        metadata: createGitHubResponseMetadata(304, getErrorHeaders(error))
      };
    }

    throw error;
  });

  if (result.kind === "not-modified" && cachedEntry) {
    const staleAt = new Date(Date.now() + getFreshWindowMs(options.freshForMs, result.metadata));
    const expiresAt = new Date(staleAt.getTime() + DEFAULT_KV_EXPIRATION_SECONDS * 1000);

    const updated = await githubCacheRepository.upsertResponseCacheEntry({
      cacheKey: buildCacheKey(options.owner, options.resource, options.params),
      etag: cachedEntry.etag,
      expiresAt,
      lastModified: cachedEntry.lastModified,
      namespace: buildNamespaceKey(options.namespaceKeys ?? []),
      namespaceVersion,
      owner: options.owner,
      payload: cachedEntry.payload,
      staleAt,
      status: result.metadata.statusCode
    });
    await putKvEntry(options.runtime, updated);

    return {
      data: cachedEntry.payload as TData,
      fetchedAt: updated.fetchedAt,
      source: "not-modified"
    };
  }

  if (result.kind !== "success") {
    throw new Error("GitHub cache fetcher returned not-modified without a cached entry");
  }

  const staleAt = new Date(Date.now() + getFreshWindowMs(options.freshForMs, result.metadata));
  const expiresAt = new Date(staleAt.getTime() + DEFAULT_KV_EXPIRATION_SECONDS * 1000);
  const entry = await githubCacheRepository.upsertResponseCacheEntry({
    cacheKey: buildCacheKey(options.owner, options.resource, options.params),
    etag: result.metadata.etag,
    expiresAt,
    lastModified: result.metadata.lastModified,
    namespace: buildNamespaceKey(options.namespaceKeys ?? []),
    namespaceVersion,
    owner: options.owner,
    payload: result.data,
    staleAt,
    status: result.metadata.statusCode
  });
  await putKvEntry(options.runtime, entry);

  return {
    data: result.data,
    fetchedAt: entry.fetchedAt,
    source: "octokit"
  };
}

function getErrorHeaders(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }

  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") {
    return {};
  }

  const headers = (response as { headers?: unknown }).headers;
  if (!headers || typeof headers !== "object") {
    return {};
  }

  return headers as Record<string, unknown>;
}

async function getCurrentNamespaceVersion(namespaceKeys: string[]) {
  if (namespaceKeys.length === 0) {
    return 0;
  }

  const versions = await Promise.all(
    [...new Set(namespaceKeys)].map((namespace) =>
      githubCacheRepository.findNamespaceVersion(namespace)
    )
  );

  return versions.reduce(
    (max: number, entry: { version: number } | null) => Math.max(max, entry?.version ?? 0),
    0
  );
}

async function getLatestSignalUpdatedAt(signalKeys: string[]) {
  if (signalKeys.length === 0) {
    return null;
  }

  const updatedAt = await githubCacheRepository.findLatestRevalidationSignalAt([
    ...new Set(signalKeys)
  ]);
  return updatedAt?.getTime() ?? null;
}

async function readCachedEntry<TData>(
  options: GitHubCacheOptions<TData>
): Promise<ReadCachedEntryResult<TData>> {
  const cacheKey = buildCacheKey(options.owner, options.resource, options.params);
  const kvEntry = await options.runtime?.kv?.get<{
    etag: string | null;
    fetchedAt: string;
    lastModified: string | null;
    namespaceVersion: number;
    payload: TData;
    staleAt: string | null;
  }>(cacheKey, "json");

  if (kvEntry) {
    return {
      entry: {
        etag: kvEntry.etag,
        fetchedAt: new Date(kvEntry.fetchedAt),
        lastModified: kvEntry.lastModified,
        namespaceVersion: kvEntry.namespaceVersion,
        payload: kvEntry.payload,
        staleAt: kvEntry.staleAt ? new Date(kvEntry.staleAt) : null
      },
      source: "kv"
    };
  }

  const dbEntry = await githubCacheRepository.findResponseCacheEntry(cacheKey);
  if (!dbEntry) {
    return { entry: null, source: "none" };
  }

  return {
    entry: {
      etag: dbEntry.etag,
      fetchedAt: dbEntry.fetchedAt,
      lastModified: dbEntry.lastModified,
      namespaceVersion: dbEntry.namespaceVersion,
      payload: dbEntry.payload as TData,
      staleAt: dbEntry.staleAt
    },
    source: "db"
  };
}

async function putKvEntry(
  runtime: GitHubRuntimeBindings | undefined,
  entry: {
    cacheKey: string;
    etag: string | null;
    expiresAt: Date | null;
    fetchedAt: Date;
    lastModified: string | null;
    namespaceVersion: number;
    payload: unknown;
    staleAt: Date | null;
  }
) {
  if (!runtime?.kv) {
    return;
  }

  const task = runtime.kv.put(
    entry.cacheKey,
    JSON.stringify({
      etag: entry.etag,
      fetchedAt: entry.fetchedAt.toISOString(),
      lastModified: entry.lastModified,
      namespaceVersion: entry.namespaceVersion,
      payload: entry.payload,
      staleAt: entry.staleAt?.toISOString() ?? null
    }),
    {
      expirationTtl: DEFAULT_KV_EXPIRATION_SECONDS
    }
  );

  runtime.executionContext?.waitUntil(task);
  await task;
}

function buildCacheKey(owner: string, resource: string, params: unknown) {
  return `${owner.toLowerCase()}::${resource}::${stableSerialize(params ?? null)}`;
}

function buildNamespaceKey(namespaceKeys: string[]) {
  const keys = [...new Set(namespaceKeys)];
  keys.sort();
  return keys.join("|");
}

function getFreshWindowMs(baseFreshForMs: number, metadata: GitHubResponseMetadata) {
  if (metadata.rateLimitRemaining !== null && metadata.rateLimitRemaining <= 0) {
    return Math.max(baseFreshForMs, STALE_IF_RATE_LIMITED_FALLBACK_MS);
  }

  return baseFreshForMs;
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    keys.sort();

    return keys.reduce<Record<string, unknown>>(
      (accumulator: Record<string, unknown>, key: string) => {
        accumulator[key] = normalizeJsonValue((value as Record<string, unknown>)[key]);
        return accumulator;
      },
      {}
    );
  }

  return value;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(normalizeJsonValue(value));
}
