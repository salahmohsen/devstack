import {
  ConnectionsStatusOutputSchema,
  DisconnectProviderInputSchema,
  DisconnectProviderOutputSchema,
  GmailSyncResultSchema,
  RefreshGithubConnectionOutputSchema,
  scopeListIncludesGmail,
  StartGmailWatchOutputSchema,
  stripGmailScopes,
  UpdateGmailAutoSyncInputSchema,
  UpdateGmailAutoSyncOutputSchema
} from "@tsu-stack/core";
import {
  betterAuthAccountRepository,
  githubConfigRepository,
  userGmailSyncRepository
} from "@tsu-stack/db/repositories";
import { ENV_SERVER } from "@tsu-stack/env/server/env";
import {
  invalidatePublicGitHubSourceCache,
  resolveWorkingGitHubAccessToken
} from "@tsu-stack/github/shared/public-github-source";

import { startGmailWatch } from "#@/lib/gmail/start-gmail-watch";
import { syncGmailInbox } from "#@/lib/gmail/sync-gmail-inbox";
import { protectedProcedure } from "#@/lib/procedures/factory";

export const connectionsRouter = {
  getStatus: protectedProcedure
    .route({
      description: "Connection status for Google (login/Gmail) and GitHub — Settings → Connections",
      method: "GET"
    })
    .output(ConnectionsStatusOutputSchema)
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [google, github, gmailSync, githubConfig] = await Promise.all([
        betterAuthAccountRepository.findGoogleAccountForUser(userId),
        betterAuthAccountRepository.findGitHubAccountForUser(userId),
        userGmailSyncRepository.findByUserId(userId),
        githubConfigRepository.findByUserId(userId)
      ]);

      const googleAvailable = Boolean(
        ENV_SERVER.GOOGLE_CLIENT_ID && ENV_SERVER.GOOGLE_CLIENT_SECRET
      );
      const githubAvailable = Boolean(
        ENV_SERVER.GITHUB_CLIENT_ID && ENV_SERVER.GITHUB_CLIENT_SECRET
      );
      const gmailConnected = scopeListIncludesGmail(google?.scope);

      return {
        google: {
          providerId: "google" as const,
          connected: Boolean(google),
          accountId: google?.accountId ?? null,
          scope: google?.scope ?? null,
          gmailConnected,
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
        },
        gmailSync: {
          connected: Boolean(google),
          gmailConnected,
          emailAddress: gmailSync?.emailAddress ?? null,
          historyId: gmailSync?.historyId ?? null,
          lastSyncedAt: gmailSync?.lastSyncedAt ?? null,
          lastError: gmailSync?.lastError ?? null,
          autoSyncEnabled: gmailSync?.autoSyncEnabled ?? true
        }
      };
    }),

  syncGmail: protectedProcedure
    .route({
      description: "Pull recent Gmail inbox into Career Inbox (History API when available)",
      method: "POST"
    })
    .output(GmailSyncResultSchema)
    .errors({
      NOT_CONNECTED: {
        message: "Connect Gmail under Settings → Connections first.",
        status: 400
      },
      NO_GMAIL_SCOPE: {
        message: "Gmail scopes missing. Use Connect Gmail again.",
        status: 400
      },
      SYNC_FAILED: {
        message: "Gmail sync failed",
        status: 502
      }
    })
    .handler(async ({ context, errors }) => {
      const userId = context.session.user.id;
      const result = await syncGmailInbox(userId);
      if (!result.ok) {
        if (result.code === "NOT_CONNECTED") throw errors.NOT_CONNECTED();
        if (result.code === "NO_GMAIL_SCOPE") throw errors.NO_GMAIL_SCOPE();
        throw errors.SYNC_FAILED({ message: result.message });
      }
      return result.result;
    }),

  setGmailAutoSync: protectedProcedure
    .route({
      description: "Enable or disable periodic Gmail History sync for the current user",
      method: "POST"
    })
    .input(UpdateGmailAutoSyncInputSchema)
    .output(UpdateGmailAutoSyncOutputSchema)
    .errors({
      NO_GMAIL_SCOPE: {
        message: "Connect Gmail under Settings → Connections first.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const google = await betterAuthAccountRepository.findGoogleAccountForUser(userId);
      if (!scopeListIncludesGmail(google?.scope)) {
        throw errors.NO_GMAIL_SCOPE();
      }
      const row = await userGmailSyncRepository.setAutoSyncEnabled(userId, input.autoSyncEnabled);
      return { autoSyncEnabled: row.autoSyncEnabled };
    }),

  startGmailWatch: protectedProcedure
    .route({
      description:
        "Register Gmail users.watch → Pub/Sub (requires GMAIL_PUBSUB_TOPIC). Renews push notifications.",
      method: "POST"
    })
    .output(StartGmailWatchOutputSchema)
    .errors({
      NO_GMAIL_SCOPE: {
        message: "Connect Gmail under Settings → Connections first.",
        status: 400
      },
      WATCH_FAILED: {
        message: "Could not start Gmail watch",
        status: 502
      }
    })
    .handler(async ({ context, errors }) => {
      const userId = context.session.user.id;
      const google = await betterAuthAccountRepository.findGoogleAccountForUser(userId);
      if (!scopeListIncludesGmail(google?.scope)) {
        throw errors.NO_GMAIL_SCOPE();
      }
      const result = await startGmailWatch(userId);
      if (!result.ok) {
        throw errors.WATCH_FAILED({ message: result.message });
      }
      return {
        ok: true,
        historyId: result.historyId,
        expiration: result.expiration
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
        if (input.provider === "google" && scopeListIncludesGmail(target.scope)) {
          await betterAuthAccountRepository.updateProviderScope(
            target.id,
            stripGmailScopes(target.scope)
          );
          await userGmailSyncRepository.setAutoSyncEnabled(userId, false);
          return { ok: true as const, mode: "gmail_scopes_removed" as const };
        }
        throw errors.LAST_LOGIN();
      }

      await betterAuthAccountRepository.deleteProviderAccountForUser(userId, input.provider);
      if (input.provider === "google") {
        await userGmailSyncRepository.deleteByUserId(userId);
      }
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
