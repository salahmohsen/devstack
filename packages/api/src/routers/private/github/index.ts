import { z } from "zod";

import {
  bumpGitHubCacheNamespaces,
  getGitHubRevalidationSignals,
  markGitHubRevalidationSignals
} from "@tsu-stack/github";

import { protectedProcedure } from "#@/lib/procedures/factory";

const RevalidationSignalsOutputSchema = z.array(
  z.object({
    signalKey: z.string(),
    updatedAt: z.number()
  })
);

const RevalidationResultSchema = z.object({
  ok: z.boolean()
});

export const privateGithubRouter = {
  getRevalidationSignals: protectedProcedure
    .route({ description: "Get revalidation signal timestamps", method: "GET" })
    .input(z.object({ signalKeys: z.array(z.string()) }))
    .output(RevalidationSignalsOutputSchema)
    .handler(async ({ input }) => getGitHubRevalidationSignals(input.signalKeys)),
  refreshInstallationAccess: protectedProcedure
    .route({ description: "Refresh installation access cache", method: "POST" })
    .output(RevalidationResultSchema)
    .handler(async () => {
      await markGitHubRevalidationSignals(["installationAccess"]);
      return { ok: true };
    }),
  clearViewerCache: protectedProcedure
    .route({ description: "Clear viewer's GitHub cache", method: "POST" })
    .output(RevalidationResultSchema)
    .handler(async () => {
      await markGitHubRevalidationSignals([
        "installationAccess",
        "pulls.mine",
        "issues.mine",
        "notifications"
      ]);
      await bumpGitHubCacheNamespaces([
        "repos.list",
        "pulls.authored",
        "pulls.assigned",
        "pulls.reviewRequested",
        "pulls.mentioned",
        "pulls.involved",
        "issues.authored",
        "issues.assigned",
        "issues.mentioned"
      ]);
      return { ok: true };
    })
};
