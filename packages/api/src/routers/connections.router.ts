import { ConnectionsStatusOutputSchema, scopeListIncludesGmail } from "@tsu-stack/core";
import { betterAuthAccountRepository } from "@tsu-stack/db/repositories";
import { ENV_SERVER } from "@tsu-stack/env/server/env";

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
      const [google, github] = await Promise.all([
        betterAuthAccountRepository.findGoogleAccountForUser(userId),
        betterAuthAccountRepository.findGitHubAccountForUser(userId)
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
          gmailConnected: scopeListIncludesGmail(google?.scope),
          available: googleAvailable
        },
        github: {
          providerId: "github" as const,
          connected: Boolean(github),
          accountId: github?.accountId ?? null,
          scope: github?.scope ?? null,
          available: githubAvailable
        }
      };
    })
};
