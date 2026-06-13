import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { log } from "@tsu-stack/logger/server";

import { getGithubSetupStatusQueryOptions } from "@/pages/github-profile";
import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions,
  getGithubRepoTreeQueryOptions,
  GithubRepoPage
} from "@/pages/github-repo";

export const Route = createFileRoute("/{-$locale}/(github-layout)/$owner/$repo/")({
  ssr: true,
  beforeLoad: async ({ context, params }) => {
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );

    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }

    if (setupStatus.owner.toLowerCase() !== params.owner.toLowerCase()) {
      throw redirect({
        params: {
          locale: params.locale
        },
        to: "/{-$locale}"
      });
    }

    try {
      const overview = await context.queryClient.ensureQueryData(
        getGithubRepoOverviewQueryOptions(params.owner, params.repo)
      );

      await context.queryClient.ensureQueryData(
        getGithubRepoBranchesQueryOptions(params.owner, params.repo)
      );

      if (overview?.defaultBranch) {
        await context.queryClient.ensureQueryData(
          getGithubRepoTreeQueryOptions(params.owner, params.repo, overview.defaultBranch, "")
        );
      }
    } catch (error) {
      log.error({
        error,
        event: "repo_overview_preload_failed",
        owner: params.owner,
        repo: params.repo
      });
    }
  },
  component: GithubRepoRoutePage
});

function GithubRepoRoutePage() {
  const { owner, repo } = Route.useParams();
  return <GithubRepoPage owner={owner} repo={repo} />;
}
