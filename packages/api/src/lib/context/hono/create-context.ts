import { type Context as HonoContext } from "hono";

import { auth } from "@tsu-stack/auth/index";
import { type OrpcContextMediaBucket } from "@tsu-stack/core";
import { betterAuthAccountRepository, createDb, runWithDb } from "@tsu-stack/db";
import { createGitHubOctokit } from "@tsu-stack/github/infrastructure/octokit/client";
import { type GitHubRuntimeBindings } from "@tsu-stack/github/runtime/bindings";
import { resolvePublicGitHubSource } from "@tsu-stack/github/shared/public-github-source";
import { type RequestLogger } from "@tsu-stack/logger/server";

import { type OrpcContext } from "#@/lib/context/types";

type HonoBindings = {
  GITHUB_CACHE_KV?: GitHubRuntimeBindings["kv"];
  GITHUB_SIGNAL_RELAY?: GitHubRuntimeBindings["signalRelay"];
  MEDIA_BUCKET?: unknown;
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
  const mediaBucket = context.env.MEDIA_BUCKET as OrpcContextMediaBucket | undefined;
  if (!mediaBucket) {
    throw new Error("MEDIA_BUCKET binding is not configured");
  }

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

  // TEMP debug: log which token the per-request privateOctokit is
  // built with so we can see whether the session query yielded an
  // OAuth token, or we're falling back to the static PAT.
  if (session?.user?.id) {
    const scope = await runWithDb(createDb(), () =>
      betterAuthAccountRepository.findGithubScopesForUser(session.user.id)
    );
    // eslint-disable-next-line no-console
    console.log("[create-context] github token source:", {
      userId: session.user.id,
      usedOAuthToken: Boolean(oauthToken),
      usedPAT: !oauthToken && githubSource.isConfigured,
      noTokenAtAll: !oauthToken && !githubSource.isConfigured,
      scope: scope ?? "(none)"
    });
  }

  return {
    github: {
      binding: githubBinding,
      privateOctokit: createGitHubOctokit(privateSource),
      publicOctokit: createGitHubOctokit(githubSource.isConfigured ? githubSource : undefined),
      source: githubSource
    },
    logger,
    session,
    mediaBucket
  };
}
