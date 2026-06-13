import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { log } from "@tsu-stack/logger/server";

import { getGithubSetupStatusQueryOptions } from "@/pages/github-profile";
import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions,
  GithubRepoPage
} from "@/pages/github-repo";

export const Route = createFileRoute("/{-$locale}/(github-layout)/$owner/$repo/blob/$")({
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
      await Promise.all([
        context.queryClient.ensureQueryData(
          getGithubRepoOverviewQueryOptions(params.owner, params.repo)
        ),
        context.queryClient.ensureQueryData(
          getGithubRepoBranchesQueryOptions(params.owner, params.repo)
        )
      ]);
    } catch (error) {
      log.error({
        error,
        event: "repo_blob_preload_failed",
        owner: params.owner,
        repo: params.repo
      });
    }
  },
  component: GithubRepoBlobRoutePage
});

function GithubRepoBlobRoutePage() {
  const { _splat, owner, repo } = Route.useParams();
  return <GithubRepoPage owner={owner} repo={repo} routeSplat={_splat} view="blob" />;
}
