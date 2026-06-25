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
 *
 * # GitHub Octokit selection
 *
 * The `github` sub-object carries two Octokits so callers can pick the right
 * one for the auth level they need:
 *
 * - `publicOctokit` is **always anonymous**. It cannot read private repos,
 *   so any public-facing procedure that uses it is structurally incapable of
 *   leaking private data.
 * - `octokit` is the **owner-authenticated** Octokit (the portfolio owner's
 *   PAT from `github_config`). It is used by server-side AI workflows that
 *   need to read the owner's private repos (e.g. the identity refresh
 *   pipeline), and by the new `privateGetXxx` oRPC procedures.
 *
 * # Token safety
 *
 * The owner's GitHub PAT lives in `source.token` and is only ever passed
 * to `createGitHubOctokit` to build `octokit`. It must never be returned
 * by any handler or appear in any response shape. The `publicOctokit` is
 * built without the token, so public procedures cannot leak it even by
 * accident.
 */

import { type Octokit } from "octokit";

export type OrpcContextGithubSource =
  | { isConfigured: false; reason: "missing_github_configuration" }
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
    privateOctokit: Octokit;
    publicOctokit: Octokit;
    source: OrpcContextGithubSource;
  };
  logger: OrpcContextLogger;
  session: OrpcContextSession;
};
