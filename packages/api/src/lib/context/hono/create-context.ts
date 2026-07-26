import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { createRedisCacheAdapter } from "@tsu-stack/github/infrastructure/cache/redis-cache-adapter";
import { createGitHubOctokit } from "@tsu-stack/github/infrastructure/octokit/client";
import { resolvePublicGitHubSource } from "@tsu-stack/github/shared/public-github-source";
import { type RequestLogger } from "@tsu-stack/logger/server";

import { createAgentWorker } from "#@/lib/agent/worker";
import { type OrpcContext } from "#@/lib/context/types";

type NodeRuntime = {
  broadcastSignals: (keys: string[]) => void;
  files: OrpcContextMediaBucket;
  redis: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: { EX?: number }): Promise<string | null>;
    del(...keys: string[]): Promise<number>;
  };
  agentWorkerUrl: string | undefined;
};

type HonoBindings = Record<string, unknown>;

export type OrpcContextBindings = HonoBindings;

export async function createContext<TEnv extends { Bindings: HonoBindings }>({
  context,
  logger,
  runtime
}: {
  context: HonoContext<TEnv>;
  logger: RequestLogger;
  runtime: NodeRuntime;
}): Promise<OrpcContext> {
  const headers = context.req.raw.headers;

  // Session lookup must not take down public RPCs when the pool is briefly wedged.
  // Protected procedures still fail closed via their own session checks.
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`getSession failed (continuing unauthenticated): ${message}`);
    session = null;
  }

  // Portfolio owner credentials (OAuth + refresh) for public routes & fallbacks.
  // Token never leaves the server.
  let githubSource: Awaited<ReturnType<typeof resolvePublicGitHubSource>> = {
    isConfigured: false,
    reason: "missing_github_configuration"
  };
  try {
    githubSource = await resolvePublicGitHubSource();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`resolvePublicGitHubSource failed: ${message}`);
  }

  /**
   * When the portfolio owner is signed in, prefer a request-scoped
   * getAccessToken (refreshes via Better Auth). Otherwise use the
   * owner OAuth source resolved above for public/anonymous requests.
   */
  let sessionOAuthToken: string | null = null;
  let oauthRefreshFailed = false;

  if (session?.user?.id) {
    try {
      const tokens = await auth.api.getAccessToken({
        body: { providerId: "github" },
        headers
      });
      sessionOAuthToken = tokens.accessToken ?? null;
    } catch {
      oauthRefreshFailed = true;
    }
  }

  type ConfiguredSource = {
    isConfigured: true;
    owner: string;
    token: string;
  };

  const ownerSource: ConfiguredSource | undefined = githubSource.isConfigured
    ? { isConfigured: true, owner: githubSource.owner, token: githubSource.token }
    : undefined;

  const privateSource: ConfiguredSource | undefined = sessionOAuthToken
    ? {
        isConfigured: true,
        owner: ownerSource?.owner ?? "oauth-user",
        token: sessionOAuthToken
      }
    : ownerSource;

  if (session?.user?.id) {
    // eslint-disable-next-line no-console
    console.log("[create-context] github token source:", {
      userId: session.user.id,
      usedSessionOAuth: Boolean(sessionOAuthToken),
      usedOwnerOAuth: !sessionOAuthToken && Boolean(ownerSource),
      noTokenAtAll: !sessionOAuthToken && !ownerSource,
      oauthRefreshFailed,
      owner: ownerSource?.owner ?? null
    });
  }

  return {
    github: {
      binding: {
        kv: createRedisCacheAdapter(runtime.redis),
        broadcast: runtime.broadcastSignals
      },
      // Authenticated private reads: session OAuth → owner OAuth.
      privateOctokit: createGitHubOctokit(privateSource),
      // Public routes: owner OAuth on the server only (never sent to client).
      // Raises rate limits vs anonymous while keeping secrets server-side.
      publicOctokit: createGitHubOctokit(ownerSource),
      source: privateSource ?? githubSource
    },
    logger,
    session,
    mediaBucket: runtime.files,
    agentWorker: createAgentWorker({ AGENT_WORKER_URL: runtime.agentWorkerUrl })
  };
}
