import {
  ConnectionsStatusOutputSchema,
  DisconnectProviderInputSchema,
  DisconnectProviderOutputSchema,
  RefreshGithubConnectionOutputSchema
} from "@tsu-stack/core";
import { betterAuthAccountRepository, githubConfigRepository } from "@tsu-stack/db/repositories";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import {
  invalidatePublicGitHubSourceCache,
  resolveWorkingGitHubAccessToken
} from "@tsu-stack/github/shared/public-github-source";

import { protectedProcedure } from "#@/lib/procedures/factory";

export const connectionsRouter = {
  getStatus: protectedProcedure
    .route({
      description: "Connection status for Google sign-in and GitHub — Settings → Connections",
      method: "GET"
    })
    .output(ConnectionsStatusOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [google, github, githubConfig] = await Promise.all([
        betterAuthAccountRepository.findGoogleAccountForUser(userId),
        betterAuthAccountRepository.findGitHubAccountForUser(userId),
        githubConfigRepository.findByUserId(userId)
      ]);

      const googleAvailable = Boolean(
        ENV_SERVER.GOOGLE_CLIENT_ID && ENV_SERVER.GOOGLE_CLIENT_SECRET
      );
      const githubAvailable = Boolean(
        ENV_SERVER.GITHUB_CLIENT_ID && ENV_SERVER.GITHUB_CLIENT_SECRET
      );

      return {
        google: {
          providerId: "google" as const,
          connected: Boolean(google),
          accountId: google?.accountId ?? null,
          scope: google?.scope ?? null,
          available: googleAvailable
        },
        github: {
          providerId: "github" as const,
          connected: Boolean(github),
          accountId: github?.accountId ?? null,
          scope: github?.scope ?? null,
          available: githubAvailable,
          username: githubConfig?.githubUsername?.trim()
            ? githubConfig.githubUsername.trim()
            : null,
          tokenExpiresAt: github?.accessTokenExpiresAt ?? null,
          lastRefreshedAt: github?.updatedAt ?? null
        }
      };
    }),

  disconnectProvider: protectedProcedure
    .route({
      description:
        "Disconnect Google or GitHub from Settings → Connections. Does not use Better Auth unlinkAccount (that requires a session created within freshAge).",
      method: "POST"
    })
    .input(DisconnectProviderInputSchema)
    .output(DisconnectProviderOutputSchema)
    .errors({
      NOT_CONNECTED: {
        message: "That provider is not connected.",
        status: 400
      },
      LAST_LOGIN: {
        message:
          "This is your only sign-in method. Add another login before disconnecting it entirely.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const [target, accountCount] = await Promise.all([
        betterAuthAccountRepository.findProviderAccountForUser(userId, input.provider),
        betterAuthAccountRepository.countAccountsForUser(userId)
      ]);
      if (!target) throw errors.NOT_CONNECTED();

      if (accountCount <= 1) {
        throw errors.LAST_LOGIN();
      }

      await betterAuthAccountRepository.deleteProviderAccountForUser(userId, input.provider);
      return { ok: true as const, mode: "unlinked" as const };
    }),

  refreshGithub: protectedProcedure
    .route({
      description:
        "Refresh the GitHub OAuth access token on the server without sending the user through GitHub OAuth again.",
      method: "POST"
    })
    .output(RefreshGithubConnectionOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const github = await betterAuthAccountRepository.findGitHubAccountForUser(userId);
      if (!github) {
        return { ok: false as const, reason: "not_connected" as const };
      }

      invalidatePublicGitHubSourceCache(userId);
      const resolved = await resolveWorkingGitHubAccessToken(github);
      if (resolved.token === null) {
        return { ok: false as const, reason: "needs_reauth" as const };
      }
      if (resolved.login) {
        await githubConfigRepository.upsertUsername(userId, resolved.login).catch(() => undefined);
      }
      invalidatePublicGitHubSourceCache(userId);
      return { ok: true as const };
    })
};
