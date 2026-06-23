/**
 * Minimal context shape that AI tools receive via Mastra's `requestContext`.
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
 */

import { type Octokit } from "octokit";

export type OrpcContextGithubSource =
  | { isConfigured: false; reason: "missing_github_settings" }
  | { isConfigured: true; owner: string; token: string };

export type OrpcContextGithubBinding = {
  executionContext?: { waitUntil(promise: Promise<unknown>): void };
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
  signalRelay?: {
    get(id: unknown): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
    idFromName(name: string): unknown;
  };
};

export type OrpcContextLogger = {
  debug?(details: unknown): void;
  error(error: unknown): void;
  info?(details: unknown): void;
  set(details: unknown): void;
  warn?(details: unknown): void;
};

export type OrpcContextSession = { user: { id: string } } | null;

export type OrpcContext = {
  github: {
    binding: OrpcContextGithubBinding;
    octokit: Octokit;
    source: OrpcContextGithubSource;
  };
  logger: OrpcContextLogger;
  session: OrpcContextSession;
};
