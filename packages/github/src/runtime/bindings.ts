export type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
};

export type GitHubCacheKv = {
  delete(key: string): Promise<void>;
  get<T>(key: string, type: "json"): Promise<T | null>;
  get(key: string, type?: "text"): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
      metadata?: unknown;
    }
  ): Promise<void>;
};

export type DurableObjectStubLike = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

export type DurableObjectNamespaceLike = {
  get(id: unknown): DurableObjectStubLike;
  idFromName(name: string): unknown;
};

export type GitHubRuntimeBindings = {
  executionContext?: ExecutionContextLike;
  kv?: GitHubCacheKv;
  signalRelay?: DurableObjectNamespaceLike;
};
