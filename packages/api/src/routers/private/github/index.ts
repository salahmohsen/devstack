import { z } from "zod";

import { bumpGitHubCacheNamespaces, markGitHubRevalidationSignals } from "@tsu-stack/github";

import { protectedProcedure } from "#@/lib/procedures/factory";

const RevalidationResultSchema = z.object({
  ok: z.boolean()
});

export const privateGithubRouter = {
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
