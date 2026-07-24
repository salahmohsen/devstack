import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { betterAuthAccountRepository } from "@tsu-stack/db";
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
  const session = await auth.api.getSession({
    headers: context.req.raw.headers
  });

  const githubSource = await resolvePublicGitHubSource();

  const oauthToken = session?.user?.id
    ? await betterAuthAccountRepository.findGitHubAccessTokenForUser(session.user.id)
    : null;

  const oauthScope = session?.user?.id
    ? await betterAuthAccountRepository.findGithubScopesForUser(session.user.id)
    : null;

  const hasRepoScope = (oauthScope ?? "").split(/[\s,]+/).includes("repo");

  type ConfiguredSource = Extract<typeof githubSource, { isConfigured: true }>;
  const privateSource: ConfiguredSource | undefined =
    oauthToken && hasRepoScope && githubSource.isConfigured
      ? { isConfigured: true, owner: githubSource.owner, token: oauthToken }
      : githubSource.isConfigured
        ? githubSource
        : undefined;

  if (session?.user?.id) {
    // eslint-disable-next-line no-console
    console.log("[create-context] github token source:", {
      userId: session.user.id,
      usedOAuthToken: Boolean(oauthToken) && hasRepoScope,
      usedPAT: !oauthToken && githubSource.isConfigured,
      noTokenAtAll: !oauthToken && !githubSource.isConfigured,
      fellBackToPat: Boolean(oauthToken) && !hasRepoScope && githubSource.isConfigured,
      scope: oauthScope ?? "(none)"
    });
  }

  return {
    github: {
      binding: {
        kv: createRedisCacheAdapter(runtime.redis),
        broadcast: runtime.broadcastSignals
      },
      privateOctokit: createGitHubOctokit(privateSource),
      publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
      source: privateSource ?? githubSource
    },
    logger,
    session,
    mediaBucket: runtime.files,
    agentWorker: createAgentWorker({ AGENT_WORKER_URL: runtime.agentWorkerUrl })
  };
}
