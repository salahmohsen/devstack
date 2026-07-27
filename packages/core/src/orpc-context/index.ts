/**
 * Minimal context shape that AI tools receive via the request context.
 *
 * Lives in `packages/core` so it can be imported from `packages/ai` without
 * creating an `ai -> api` dependency. `core` is a leaf in the workspace dep
 * graph (no `auth`, `github`, `api`, or `logger` imports), so the type is
 * defined structurally and the only external dep is the `octokit` package
 * (used purely in a type position) to preserve response shapes for
 * `packages/github` consumers.
 *
 * The fuller `OrpcContext` constructed in
 * `packages/api/src/lib/context/hono/create-context.ts` is a subtype of this
 * shape; TypeScript's structural typing keeps the two compatible.
 *
 * # GitHub Octokit selection
 *
 * The `github` sub-object carries two Octokits so callers can pick the right
 * one for the auth level they need:
 *
 * - `publicOctokit` is the **portfolio owner's** server-side OAuth token
 *   (Better Auth GitHub account + refresh). Used for public homepage/repo
 *   routes so rate limits are reasonable. The token never leaves the server.
 * - `privateOctokit` is the **signed-in user's** OAuth token when present,
 *   otherwise the same owner OAuth source. Used for private repo reads
 *   (detect-stacks, dashboard tools).
 *
 * # Token safety
 *
 * Tokens live only in Better Auth `account` rows and in-memory Octokit
 * instances. They must never be returned by any handler or appear in any
 * response shape. Visitors only receive already-fetched public data.
 */

import { type Octokit } from "octokit";

export type OrpcContextGithubSource =
  | { isConfigured: false; reason: "missing_github_configuration" }
  | { isConfigured: true; owner: string; token: string };

export type OrpcContextGithubBinding = {
  kv?: {
    delete(key: string): Promise<void>;
    get<T>(key: string, type: "json"): Promise<T | null>;
    get(key: string, type?: "text"): Promise<string | null>;
    put(
      key: string,
      value: string,
      options?: { expirationTtl?: number; metadata?: unknown }
    ): Promise<void>;
  };
  broadcast?: (signalKeys: string[]) => void;
};

export type OrpcContextLogger = {
  debug?(details: unknown): void;
  error(error: unknown): void;
  info?(details: unknown): void;
  set(details: unknown): void;
  warn?(details: unknown): void;
};

export type OrpcContextSession = { user: { id: string } } | null;

export type OrpcContextMediaBucket = {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | FormData | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<{ key: string }>;
  get(key: string): Promise<{ body: ReadableStream | null; key: string } | null>;
  delete(key: string): Promise<void>;
};

// Using RequestInfo (Request | string) keeps the type compatible with both
// fetch() and service bindings.
export type OrpcContextAgentWorker = {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
};

export type OrpcContext = {
  github: {
    binding: OrpcContextGithubBinding;
    privateOctokit: Octokit;
    publicOctokit: Octokit;
    source: OrpcContextGithubSource;
  };
  logger: OrpcContextLogger;
  session: OrpcContextSession;
  mediaBucket: OrpcContextMediaBucket;
  agentWorker?: OrpcContextAgentWorker;
  /**
   * Request Host (normalized when available). Used for custom-domain public
   * portfolio resolution. Prefer `x-forwarded-host` only behind a trusted proxy.
   */
  host?: string | null;
};
