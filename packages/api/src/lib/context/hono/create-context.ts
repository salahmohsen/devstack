import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { createGitHubOctokit } from "@tsu-stack/github/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "@tsu-stack/github/runtime/bindings";
import { resolvePublicGitHubSource } from "@tsu-stack/github/shared/public-github-source";
import { type RequestLogger } from "@tsu-stack/logger/server";

import { type OrpcContext } from "#@/lib/context/types";

type HonoBindings = {
  GITHUB_CACHE_KV?: GitHubRuntimeBindings["kv"];
  GITHUB_SIGNAL_RELAY?: GitHubRuntimeBindings["signalRelay"];
};

export type OrpcContextBindings = HonoBindings;

export async function createContext<TEnv extends { Bindings: HonoBindings }>({
  context,
  logger
}: {
  context: HonoContext<TEnv>;
  logger: RequestLogger;
}): Promise<OrpcContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers
  });
  const githubBinding = {
    executionContext: context.executionCtx,
    kv: context.env.GITHUB_CACHE_KV,
    signalRelay: context.env.GITHUB_SIGNAL_RELAY
  };
  const githubSource = await resolvePublicGitHubSource();

  return {
    github: {
      binding: githubBinding,
      privateOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
      publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
      source: githubSource
    },
    logger,
    session
  };
}
