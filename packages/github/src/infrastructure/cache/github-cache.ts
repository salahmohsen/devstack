import { githubCacheRepository } from "@tsu-stack/db/repositories";

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

const DEFAULT_KV_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;
const STALE_IF_RATE_LIMITED_FALLBACK_MS = 60 * 1000;
const DEBUG_TAG = "23478236498372";

export async function bumpGitHubCacheNamespaces(namespaceKeys: string[]) {
  const uniqueKeys = [...new Set(namespaceKeys)];
  await Promise.all(
    uniqueKeys.map((namespace) => githubCacheRepository.bumpNamespaceVersion(namespace))
  );
}

export async function markGitHubRevalidationSignals(signalKeys: string[]) {
  const uniqueKeys = [...new Set(signalKeys)];
  await githubCacheRepository.markRevalidationSignals(uniqueKeys);
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
  console.debug(`[${DEBUG_TAG}] github-cache:getGitHubResourceLocalFirst:start`, {
    owner: options.owner,
    resource: options.resource
  });
  console.debug(`[${DEBUG_TAG}] github-cache:readCachedEntry:start`, {
    owner: options.owner,
    resource: options.resource
  });
  const cached = await readCachedEntry<TData>(options);
  console.debug(`[${DEBUG_TAG}] github-cache:readCachedEntry:ok`, {
    cacheHit: Boolean(cached),
    owner: options.owner,
    resource: options.resource
  });
  console.debug(`[${DEBUG_TAG}] github-cache:getLatestSignalUpdatedAt:start`, {
    signalKeys: options.signalKeys ?? []
  });
  const latestSignalAt = await getLatestSignalUpdatedAt(options.signalKeys ?? []);
  console.debug(`[${DEBUG_TAG}] github-cache:getLatestSignalUpdatedAt:ok`, {
    latestSignalAt,
    owner: options.owner,
    resource: options.resource
  });
  console.debug(`[${DEBUG_TAG}] github-cache:getCurrentNamespaceVersion:start`, {
    namespaceKeys: options.namespaceKeys ?? []
  });
  const currentNamespaceVersion = await getCurrentNamespaceVersion(options.namespaceKeys ?? []);
  console.debug(`[${DEBUG_TAG}] github-cache:getCurrentNamespaceVersion:ok`, {
    currentNamespaceVersion,
    owner: options.owner,
    resource: options.resource
  });
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
      console.debug(`[${DEBUG_TAG}] github-cache:fetchAndPersist:start`, {
        cacheHit: Boolean(cached),
        isStale,
        owner: options.owner,
        resource: options.resource
      });
      const fresh = await fetchAndPersist(options, cached, currentNamespaceVersion);
      console.debug(`[${DEBUG_TAG}] github-cache:fetchAndPersist:ok`, {
        cacheHit: Boolean(cached),
        fetchedAt: fresh.fetchedAt.toISOString(),
        owner: options.owner,
        resource: options.resource
      });
      return {
        data: fresh.data,
        meta: {
          cacheStatus: cached ? "stale" : "miss",
          fetchedAt: fresh.fetchedAt.toISOString(),
          isRevalidating: false
        }
      };
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      if (cached && (statusCode === 403 || statusCode === 429)) {
        return {
          data: cached.payload as TData,
          meta: {
            cacheStatus: "stale",
            fetchedAt: cached.fetchedAt.toISOString(),
            isRevalidating: false
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
      isRevalidating: false
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
) {
  const conditionals: GitHubConditionalHeaders = {
    etag: cachedEntry?.etag ?? null,
    lastModified: cachedEntry?.lastModified ?? null
  };
  console.debug(`[${DEBUG_TAG}] github-cache:options.fetcher:start`, {
    owner: options.owner,
    resource: options.resource
  });
  const result = await options
    .fetcher(conditionals)
    .then((value) => {
      console.debug(`[${DEBUG_TAG}] github-cache:options.fetcher:ok`, {
        kind: value.kind,
        owner: options.owner,
        resource: options.resource
      });
      return value;
    })
    .catch((error: unknown) => {
      console.debug(`[${DEBUG_TAG}] github-cache:options.fetcher:error`, {
        error,
        owner: options.owner,
        resource: options.resource
      });
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

    console.debug(`[${DEBUG_TAG}] github-cache:upsertResponseCacheEntry:start`, {
      owner: options.owner,
      resource: options.resource,
      mode: "not-modified"
    });
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
    console.debug(`[${DEBUG_TAG}] github-cache:upsertResponseCacheEntry:ok`, {
      owner: options.owner,
      resource: options.resource,
      mode: "not-modified"
    });
    console.debug(`[${DEBUG_TAG}] github-cache:putKvEntry:start`, {
      owner: options.owner,
      resource: options.resource,
      mode: "not-modified"
    });
    await putKvEntry(options.runtime, updated);
    console.debug(`[${DEBUG_TAG}] github-cache:putKvEntry:ok`, {
      owner: options.owner,
      resource: options.resource,
      mode: "not-modified"
    });

    return {
      data: cachedEntry.payload as TData,
      fetchedAt: updated.fetchedAt
    };
  }

  if (result.kind !== "success") {
    throw new Error("GitHub cache fetcher returned not-modified without a cached entry");
  }

  const staleAt = new Date(Date.now() + getFreshWindowMs(options.freshForMs, result.metadata));
  const expiresAt = new Date(staleAt.getTime() + DEFAULT_KV_EXPIRATION_SECONDS * 1000);
  console.debug(`[${DEBUG_TAG}] github-cache:upsertResponseCacheEntry:start`, {
    owner: options.owner,
    resource: options.resource,
    mode: "success"
  });
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
  console.debug(`[${DEBUG_TAG}] github-cache:upsertResponseCacheEntry:ok`, {
    owner: options.owner,
    resource: options.resource,
    mode: "success"
  });
  console.debug(`[${DEBUG_TAG}] github-cache:putKvEntry:start`, {
    owner: options.owner,
    resource: options.resource,
    mode: "success"
  });
  await putKvEntry(options.runtime, entry);
  console.debug(`[${DEBUG_TAG}] github-cache:putKvEntry:ok`, {
    owner: options.owner,
    resource: options.resource,
    mode: "success"
  });

  return {
    data: result.data,
    fetchedAt: entry.fetchedAt
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

  const entries = await githubCacheRepository.findRevalidationSignals([...new Set(signalKeys)]);
  return entries[0]?.updatedAt.getTime() ?? null;
}

async function readCachedEntry<TData>(options: GitHubCacheOptions<TData>) {
  const cacheKey = buildCacheKey(options.owner, options.resource, options.params);
  console.debug(`[${DEBUG_TAG}] github-cache:runtime.kv.get:start`, {
    cacheKey,
    hasKv: Boolean(options.runtime?.kv)
  });
  const kvEntry = await options.runtime?.kv?.get<{
    etag: string | null;
    fetchedAt: string;
    lastModified: string | null;
    namespaceVersion: number;
    payload: TData;
    staleAt: string | null;
  }>(cacheKey, "json");
  console.debug(`[${DEBUG_TAG}] github-cache:runtime.kv.get:ok`, {
    cacheKey,
    hit: Boolean(kvEntry)
  });

  if (kvEntry) {
    return {
      etag: kvEntry.etag,
      fetchedAt: new Date(kvEntry.fetchedAt),
      lastModified: kvEntry.lastModified,
      namespaceVersion: kvEntry.namespaceVersion,
      payload: kvEntry.payload,
      staleAt: kvEntry.staleAt ? new Date(kvEntry.staleAt) : null
    };
  }

  console.debug(`[${DEBUG_TAG}] github-cache:findResponseCacheEntry:start`, {
    cacheKey
  });
  const dbEntry = await githubCacheRepository.findResponseCacheEntry(cacheKey);
  console.debug(`[${DEBUG_TAG}] github-cache:findResponseCacheEntry:ok`, {
    cacheKey,
    hit: Boolean(dbEntry)
  });
  if (!dbEntry) {
    return null;
  }

  return {
    etag: dbEntry.etag,
    fetchedAt: dbEntry.fetchedAt,
    lastModified: dbEntry.lastModified,
    namespaceVersion: dbEntry.namespaceVersion,
    payload: dbEntry.payload as TData,
    staleAt: dbEntry.staleAt
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
    console.debug(`[${DEBUG_TAG}] github-cache:putKvEntry:skip-no-kv`, {
      cacheKey: entry.cacheKey
    });
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
