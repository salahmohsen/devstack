import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { getGithubSetupStatusQueryOptions } from "@/features/github";

import {
  getGithubRepoBranchesQueryOptions,
  getGithubRepoOverviewQueryOptions
} from "@/pages/github-repo";

const RESERVED_NON_REPO_SEGMENTS = new Set([".well-known", "firebase-messaging-sw.js"]);

export const Route = createFileRoute("/{-$locale}/(layout)/$repo")({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    if (RESERVED_NON_REPO_SEGMENTS.has(params.repo)) {
      throw notFound();
    }

    const setupStatus = await context.queryClient.ensureQueryData(
      getGithubSetupStatusQueryOptions()
    );

    if (!setupStatus.isConfigured || !setupStatus.owner) {
      throw notFound();
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.prefetchQuery(getGithubRepoOverviewQueryOptions(params.repo));

    await context.queryClient.prefetchQuery(getGithubRepoBranchesQueryOptions(params.repo));
  }
});

function RouteComponent() {
  return <Outlet />;
}
