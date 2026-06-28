import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { betterAuthAccountRepository, createDb, runWithDb } from "@tsu-stack/db";
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

  // The PAT in `github_config` powers the `publicOctokit` (and the
  // cron-like background reads). For per-user authenticated reads we
  // want the OAuth access token the user just signed in with — that
  // token has the `repo` scope and lets `listForAuthenticatedUser`
  // return the user's private repos. We pull it from Better Auth's
  // `account` table inside a per-request `WsDb` scope so the request
  // owns its own neon pool.
  const oauthToken = session?.user?.id
    ? await runWithDb(createDb(), () =>
        betterAuthAccountRepository.findGitHubAccessTokenForUser(session.user.id)
      )
    : null;

  // TEMP debug: log the scopes on the account row so we can see
  // whether the stored OAuth token has the `repo` scope. If it
  // doesn't, the user must re-authorize the GitHub OAuth app.
  if (session?.user?.id) {
    const dbg = await runWithDb(createDb(), () =>
      betterAuthAccountRepository.findGithubScopesForUser(session.user.id)
    );
    // eslint-disable-next-line no-console
    console.log("[create-context] github account row:", {
      userId: session.user.id,
      oauthTokenLen: oauthToken?.length ?? 0,
      scope: dbg
    });
  }

  // Build a per-user `privateOctokit` that prefers the fresh OAuth
  // access token and falls back to the PAT (still respecting whatever
  // scopes that PAT has). Both code paths land in `createGitHubOctokit`
  // which is request-scoped, so no shared I/O across requests.
  type ConfiguredSource = Extract<typeof githubSource, { isConfigured: true }>;
  const privateSource: ConfiguredSource | undefined =
    oauthToken && githubSource.isConfigured
      ? { isConfigured: true, owner: githubSource.owner, token: oauthToken }
      : githubSource.isConfigured
        ? githubSource
        : undefined;

  return {
    github: {
      binding: githubBinding,
      privateOctokit: createGitHubOctokit(privateSource),
      publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
      source: githubSource
    },
    logger,
    session
  };
}
