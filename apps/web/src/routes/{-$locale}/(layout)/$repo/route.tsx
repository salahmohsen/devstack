import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions,
  getGithubRepoTreeQueryOptions
} from "@/pages/github-repo";

export const Route = createFileRoute("/{-$locale}/(layout)/$repo")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );

    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }

    const overview = await context.queryClient.ensureQueryData(
      getGithubRepoOverviewQueryOptions(params.repo)
    );

    await context.queryClient.prefetchQuery(getGithubRepoBranchesQueryOptions(params.repo));

    if (overview?.defaultBranch) {
      await context.queryClient.ensureQueryData(
        getGithubRepoTreeQueryOptions(params.repo, overview.defaultBranch, "")
      );
    }
  }
});

function RouteComponent() {
  return <Outlet />;
}
